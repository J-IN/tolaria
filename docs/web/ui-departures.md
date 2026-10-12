# Tolaria Web: deliberate UI departures

Standing rule (Luca, 10 Oct 2026): Tolaria Web reuses the desktop shell, BlockNote editor, components, tokens, typography, icons and dark mode. Where the web demands something different, the change is made deliberately and recorded here: what, why, where. Karn copies this list into the vault note `tolaria-vault-remote-v1`.

## Departures made

None yet.

Spike S3 (TOL-5) adds the server and the protocol package and touches no UI.

Spike S1 (TOL-3, TOL-4) builds the existing shell as a static web bundle without changing any component, style, token or copy. `apps/web/` contains build and test configuration only.

| Date | What changed | Why | Where |
|---|---|---|---|
| (none) | | | |

## Known gaps that will become departures

Found while running the unchanged shell in a browser and in iPhone and iPad emulation. They are listed so the first web UI work starts from evidence; none of them has been changed. Details and measurements are in [s1-tauri-inventory.md](s1-tauri-inventory.md).

| Area | What the unchanged shell does on the web | Likely adaptation |
|---|---|---|
| Phone layout | Three fixed panes; the editor is off-screen at 393 px and cannot be reached by touch | Single-pane stack with back navigation |
| iPad portrait layout | Editor pane clipped on the right at 834 px | Two panes, collapsible sidebar |
| Navigation | No URLs; state is lost on reload | Deep-link URLs for vault, note and view, with back and forward |
| Shortcuts and empty state | Advertises `⌘P / ⌘O / ⌘N`, which browsers own | Command palette first; browser-safe shortcuts; touch-first empty state |
| Status bar | Git branch, changes, commit, sync and history controls | Sync and connection status, including offline and conflict states |
| Web-only surfaces | Absent | Login, account, sharing and permissions dialogs, add to home screen |
| Multiplayer | Absent | Presence avatars, live cursors and selections, sharing state |
| Touch | Hover-revealed controls and right-click menus | Touch targets, long-press menus, virtual keyboard and safe-area handling |
