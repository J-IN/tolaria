# Tolaria remote protocol, version 1.0

The HTTP protocol between a Tolaria client and a server that hosts one vault as a git repository. It is written so that anyone can implement a compatible server (self-hosting) or client. The reference implementation is `apps/server`; the wire types are in `packages/protocol/src/index.ts` and are the source of truth when this document and the code disagree.

Status: spike S3 (TOL-5). The file API below is implemented and tested. The collaboration channel is reserved and specified as a draft; it is not served yet.

## Design rules

- **Files stay files.** A vault is a git repository of markdown notes and attachments. The server never stores a note in a form git and the desktop app cannot read.
- **Every file has a revision.** The `etag` of a file is its git blob id (`sha1("blob <size>\0" + bytes)`), so a client or another server can compute it without asking.
- **A write states what it was based on.** The server never overwrites a version the client has not seen unless the client asks for exactly that.
- **Nothing is lost.** When a write cannot take the path it asked for, its bytes are saved next to it as a conflict copy.
- **Versioned and additive.** Routes carry the major version, responses carry the full version, and features are announced as capabilities. Collaboration adds routes and capabilities; it changes none of the file API.

## Versioning and negotiation

| Mechanism | Rule |
|---|---|
| Route prefix | `/v1`. A different major is a different prefix and a different protocol. |
| `Tolaria-Protocol-Version` response header | Sent on every response, for example `1.0`. |
| `Tolaria-Protocol-Version` request header | Optional. If present and its major is not the server's, the server answers `400 unsupported_protocol_version`. |
| Minor versions | Only add: new routes, new optional fields, new capabilities, new error codes. Clients must ignore fields and capabilities they do not know. |
| Capabilities | `GET /v1/vault` lists what this server does. Clients check a capability before using a feature. |

Capabilities in 1.0:

| Capability | Meaning |
|---|---|
| `files.read`, `files.write`, `files.rename`, `files.delete` | The file routes below. |
| `files.conflict-copy` | A stale write is saved as a conflict copy instead of being rejected. |
| `search.text` | `GET /v1/search`. |
| `sync.git` | The vault is backed by a git remote; `pushed` and `POST /v1/sync` are meaningful. |
| `docs.ids` | Notes carry a stable `docId`. |
| `collab.yjs`, `collab.awareness` | The collaboration channel is served. Not advertised by this spike. |

## Authentication and transport

- Every route except `GET /healthz` requires `Authorization: Bearer <token>`. A missing or wrong token gets `401 unauthorized` with `WWW-Authenticate: Bearer`.
- The reference server reads the token from `TOLARIA_SERVER_TOKEN` and does not start without it. It speaks plain HTTP and binds `127.0.0.1`; anything else needs an explicit opt-in and a TLS-terminating proxy in front.
- One token gives full access to the one vault. Accounts, per-user identity and permissions are outside this protocol version.
- `GET /healthz` answers `200 {"status":"ok"}` and reveals nothing about the vault.

## Paths

A path is relative to the vault root, uses `/`, and is percent-encoded in URLs (`/v1/files/my%20notes/caf%C3%A9.md`). The server answers `400 invalid_path` for:

- an empty path, an absolute path, an empty segment, or a `.` or `..` segment;
- any segment starting with `.git` in any letter case (`.git/`, `.gitignore`, `.gitattributes`);
- a backslash or a control character;
- more than 1024 bytes of UTF-8.

Symbolic links in the repository are not listed and are checked out as plain files.

## Errors

Every error has the same JSON body. `code` is stable; `message` is for people.

```json
{ "error": { "code": "precondition_failed", "message": "welcome.md changed since the given revision", "details": { "current": { "path": "welcome.md", "etag": "e7b4…" } } } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_path` | The path breaks the rules above or is not valid percent-encoding. |
| 400 | `invalid_request` | A malformed body or query parameter. |
| 400 | `unsupported_protocol_version` | The client asked for another major version. |
| 401 | `unauthorized` | Missing or wrong bearer token. |
| 404 | `not_found` | No such file, or no such route. |
| 405 | `method_not_allowed` | The route exists but not for this method. `Allow` lists the supported ones. |
| 409 | `destination_exists` | A rename target exists, or the path runs through a file or names a folder. |
| 412 | `precondition_failed` | Rename or delete with an `etag` that is no longer current. `details.current` has the current one. |
| 413 | `payload_too_large` | The body exceeds the server's limit (25 MB by default). |
| 428 | `precondition_required` | A write or delete without the header that says what it was based on. |
| 500 | `internal` | Unexpected failure. The cause is logged, not returned. |
| 501 | `not_implemented` | The reserved collaboration channel on a server that does not serve it. |

A write that ends in a conflict copy is not an error body: see `PUT` below.

## Routes

### `GET /v1/vault`

```json
{
  "protocolVersion": "1.0",
  "capabilities": ["files.read", "files.write", "files.rename", "files.delete", "files.conflict-copy", "search.text", "sync.git", "docs.ids"],
  "vault": { "name": "my-vault", "branch": "main", "head": "eea2db93a391d110c4707fa1f6c6078c2f39c1ca" },
  "collab": { "available": false, "path": "/v1/collab/docs", "docFormat": "tolaria.blocknote/1", "blocksFragment": "blocks", "frontmatterField": "frontmatter", "metaMap": "meta" }
}
```

### `GET /v1/files[?prefix=<path prefix>]`

Lists every tracked file at the server's current commit.

```json
{
  "head": "eea2db93a391d110c4707fa1f6c6078c2f39c1ca",
  "files": [
    { "path": "projects/heron.md", "size": 106, "etag": "7b8f92b1420404a572d7da3665fe7d969127e438", "docId": "42862532-a9e7-437f-9e73-86d32c07ff56" },
    { "path": "attachments/pixel.png", "size": 70, "etag": "2f6d…" }
  ]
}
```

`docId` is present for notes (`.md`) only. The listing does not contact the git remote; call `POST /v1/sync` first to pick up pushes from other devices.

### `GET /v1/files/<path>`

Returns the bytes of the file.

| Response header | Value |
|---|---|
| `ETag` | `"<etag>"` |
| `Content-Type` | `text/markdown; charset=utf-8` for notes, `application/octet-stream` otherwise |
| `Tolaria-Doc-Id` | The note's `docId` (notes only) |

`If-None-Match: "<etag>"` gets `304` with no body when the client's copy is current.

### `PUT /v1/files/<path>`

The body is the complete new content of the file, as raw bytes. Exactly one precondition is required:

| Request header | Meaning |
|---|---|
| `If-Match: "<etag>"` | "I edited this revision." The normal save. |
| `If-None-Match: *` | "I am creating this file." |
| `If-Match: *` | "Overwrite whatever is there." Explicit last-write-wins. |
| none | `428 precondition_required`. A missing header is more often a bug than a decision. |

The server pulls from the git remote, decides, commits once, and pushes. The response is always a write result:

```json
{ "outcome": "updated", "path": "welcome.md", "etag": "872e91ac…", "commit": "ddd19dd2…", "pushed": true, "docId": "bc1a7bc2-…" }
```

| `outcome` | Status | What happened |
|---|---|---|
| `created` | 201 | The file did not exist. |
| `updated` | 200 | The stored revision matched (or `If-Match: *`). |
| `unchanged` | 200 | The stored content is already these bytes. No commit. |
| `recreated` | 201 | The client edited a revision of a file that has since been deleted. The edit wins and the file is back. |
| `conflict` | 409 | The stored revision is not the one the client edited (or a create found the file there). The stored file is untouched; the request's bytes are saved as a conflict copy. |

On `conflict`, `path` and `etag` describe the conflict copy and `current` describes the file that kept the requested path:

```json
{
  "outcome": "conflict",
  "path": "welcome (conflict 2026-10-12 1611).md",
  "etag": "cb6f3257…",
  "commit": "e2cb1688…",
  "pushed": true,
  "docId": "91db80d4-…",
  "current": { "path": "welcome.md", "etag": "e7b4ed52…" }
}
```

- The copy is named `<name> (conflict <YYYY-MM-DD HHMM>)<ext>` in UTC, next to the original, with a counter appended (`… 1611 2`, `… 1611 3`) when the name is taken. It is an ordinary file with its own `docId`.
- `pushed: false` means the commit is safe on the server but has not reached the git remote (the remote is unreachable, or pushing kept losing a race). The server pushes it with the next write or `POST /v1/sync`.
- `Server-Timing: pull;dur=…, commit;dur=…, push;dur=…` reports the three phases in milliseconds.
- If another device pushes the same file between the server's fetch and its push, the server keeps the pushed version and returns `conflict` with a conflict copy, exactly as above.

### `DELETE /v1/files/<path>`

Requires `If-Match: "<etag>"`; `*` is not accepted. `412 precondition_failed` when the file has changed. One commit, pushed.

```json
{ "path": "welcome.md", "commit": "…", "pushed": true }
```

### `POST /v1/rename`

```json
{ "from": "people/ada.md", "to": "people/ada-lovelace.md", "ifMatch": "b5fa61f2…" }
```

`ifMatch` is optional. Missing folders of `to` are created. One commit, pushed; the note keeps its `docId`.

```json
{ "from": "people/ada.md", "path": "people/ada-lovelace.md", "etag": "b5fa61f2…", "commit": "…", "pushed": true, "docId": "ecc6f1fe-…" }
```

`404 not_found` when `from` is missing, `409 destination_exists` when `to` exists, `412 precondition_failed` when `ifMatch` is stale. The route is not `/v1/files/<path>/rename` because a vault path may itself end in `/rename`. Version 1.0 moves the file only; it does not rewrite wikilinks in other notes.

### `GET /v1/search?q=<text>[&limit=<n>]`

Case-insensitive search for the literal text `q` (1 to 200 characters, one line) in tracked text files and in file paths. `limit` defaults to 50 and is capped at 200. Up to three matching lines per file, each cut at 300 characters.

```json
{ "results": [ { "path": "projects/alpha.md", "pathMatch": false, "matches": [ { "line": 3, "text": "Links to [[welcome]] and mentions the Heron." } ] } ], "truncated": false }
```

### `POST /v1/sync`

Pulls from the git remote and pushes anything pending. Clients call it to pick up changes pushed by the desktop app.

```json
{ "head": "dede5f41…", "pulled": true, "pushed": true }
```

`pulled: false` means the remote could not be reached; the server keeps serving its copy.

## How the server keeps git consistent

Every mutation runs alone, in this order: fetch and integrate the remote, change files, commit, push.

- **Remote ahead, nothing local pending:** fast-forward.
- **Local commits pending and the remote moved** (the server was offline, or lost a push race): the remote's history wins. The server resets to it and re-applies its pending changes file by file in one commit. A pending change to a file the remote also changed becomes a conflict copy; a pending deletion of such a file is dropped.
- **Push rejected:** integrate and retry, up to three times, then answer `pushed: false`.

The server never force-pushes and never rewrites commits that reached the remote.

## Document ids

A `docId` is a random UUID the server assigns to each note. It identifies the note's collaborative document and stays with the note through renames, including renames made on the desktop and pulled in from git (detected with git's rename detection). It is server state, kept outside the repository; nothing is written into the note. A note that is deleted, or a conflict copy, gets a fresh id. If server state is lost, ids are reassigned and documents are rebuilt from the markdown files.

## Reserved: the collaboration channel (draft, not served)

Reserved now so that adding it changes nothing above:

| Item | Reservation |
|---|---|
| Route | `GET /v1/collab/docs/<docId>` with a websocket upgrade. This server answers `501 not_implemented`. |
| Capabilities | `collab.yjs`, `collab.awareness`; `collab.available` in `GET /v1/vault`. |
| Wire format | Standard y-protocols sync and awareness messages, so `y-websocket` and Hocuspocus clients connect unmodified. One room per `docId`. |
| Document format | `tolaria.blocknote/1`: a `Y.XmlFragment` named `blocks` (what BlockNote's `collaboration.fragment` binds to), a `frontmatter` shared type for properties, and a `Y.Map` named `meta` holding `format` and `baseRevision`, the `etag` of the markdown the document was last reconciled with. |
| Canonical form | The markdown file. A Y.Doc is a cache that can always be rebuilt from it. |
| Persistence | Y.Doc snapshots keyed by `docId` in the server's blob store (`BlobStore` in `apps/server/src/store.ts`), which maps onto object storage. |

`Y.Text` holding raw markdown is deliberately not the format: BlockNote's collaboration binding needs a `Y.XmlFragment`, and a text document would lose cursors and block identity. The format string leaves room for other formats later.

What the channel still needs is in `docs/web/s3-spike-report.md` and in `docs/web/s1-tauri-inventory.md` ("What the S3 server must provide").

## Differences from the surface sketched in S1

`docs/web/s1-tauri-inventory.md` listed the server surface before this spike. What differs, and why:

| S1 sketch | This version | Reason |
|---|---|---|
| `PUT` with no precondition is last-write-wins | `428`; `If-Match: *` asks for last-write-wins | An absent header should not silently overwrite. |
| A stale `PUT` is rejected, conflict copy on request | Always a conflict copy, answered with `409` | The save is never lost, also when the client goes away. |
| `POST /v1/files/{path}/rename`, rewrites wikilinks | `POST /v1/rename`, moves the file only | Unambiguous paths; link rewriting needs the note index. |
| `GET /v1/entries`, `GET /v1/changes`, attachments routes, collab tickets | Not in 1.0 | Additive; listed as next steps in the spike report. Attachments already work as plain files through `/v1/files`. |
