import path from "node:path";
import * as vault from "./vault.js";

const TYPE_METADATA = new Set([
	"type",
	"isa",
	"title",
	"aliases",
	"archived",
	"owner",
	"cadence",
	"color",
	"icon",
	"order",
	"sidebarlabel",
	"template",
	"sort",
	"view",
	"visible",
	"organized",
	"favorite",
	"favoriteindex",
	"created",
	"modified",
	"listpropertiesdisplay",
	"notelistproperties",
]);

function canonicalKey(key) {
	return key.toLowerCase().replace(/[\s_-]/g, "");
}

function typeField(frontmatter) {
	const fields = Object.entries(frontmatter);
	const canonical = fields.find(([key]) => canonicalKey(key) === "type");
	return (
		canonical?.[1] ?? fields.find(([key]) => canonicalKey(key) === "isa")?.[1]
	);
}

function typeTitle(note) {
	const heading = note.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
	return (
		heading ||
		note.frontmatter.title ||
		path.basename(note.path, ".md").replace(/-/g, " ")
	);
}

function isValuedScalar(value) {
	if (typeof value === "string") return value.trim().length > 0;
	return typeof value === "number" || typeof value === "boolean";
}

function isInstanceDefault([key, value]) {
	if (key.startsWith("_") || TYPE_METADATA.has(canonicalKey(key))) return false;
	if (Array.isArray(value))
		return value.length > 0 && value.every(isValuedScalar);
	return isValuedScalar(value);
}

function defaultLines(frontmatter) {
	return Object.entries(frontmatter)
		.filter(isInstanceDefault)
		.map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`);
}

/** Structured MCP creation inherits defaults; full-content writes remain verbatim. */
export async function typeDefaultLines({ vaultPath, typeName }) {
	for (const filename of await vault.findMarkdownFiles(vaultPath)) {
		const note = await vault.getNote(
			vaultPath,
			path.relative(vaultPath, filename),
		);
		if (typeField(note.frontmatter) !== "Type") continue;
		if (typeTitle(note).toLowerCase() === typeName.toLowerCase())
			return defaultLines(note.frontmatter);
	}
	return [];
}
