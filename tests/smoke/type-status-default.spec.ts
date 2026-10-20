import { expect, test } from "@playwright/test";
import {
	createFixtureVaultCopy,
	openFixtureVaultDesktopHarness,
	removeFixtureVaultCopy,
} from "../helpers/fixtureVault";
import { executeCommand, openCommandPalette } from "./helpers";

test("type-view creation copies semantic status defaults @smoke", async ({
	page,
}) => {
	const vaultPath = createFixtureVaultCopy();
	try {
		await openFixtureVaultDesktopHarness(page, vaultPath);
		await page.evaluate(async (root) => {
			const createNote = window.__mockHandlers?.create_note_content;
			if (typeof createNote !== "function")
				throw new Error("Missing fixture creation handler");
			await createNote({
				path: `${root}/initiative.md`,
				content:
					"---\ntype: Type\nStatus: Active\nBudget:\ncolor: red\n_icon: rocket\n---\n# Initiative\n",
			});
		}, vaultPath);
		// The browser fixture parser does not run Rust. Supply the native parser's
		// Type-property shape, covered by the Rust status regression test.
		await page.route("**/api/vault/list*", async (route) => {
			const response = await route.fetch();
			const entries = await response.json();
			for (const entry of entries) {
				if (entry.isA === "Type" && entry.title === "Initiative") {
					entry.properties = { ...entry.properties, Status: "Active" };
				}
			}
			await route.fulfill({ response, json: entries });
		});
		await page.reload({ waitUntil: "domcontentloaded" });
		await page
			.locator("aside")
			.getByText("Initiatives", { exact: true })
			.first()
			.click();
		await page.locator('[title="Create new note"]').first().click();
		await expect(page.getByTestId("breadcrumb-filename-trigger")).toContainText(
			/untitled-initiative-\d+/i,
		);
		await openCommandPalette(page);
		await executeCommand(page, "Toggle Raw");
		const raw = page.locator(".cm-content");
		await expect(raw).toContainText("type: Initiative");
		await expect(raw).toContainText("Status: Active");
		await expect(raw).not.toContainText("Budget:");
		await expect(raw).not.toContainText("color:");
		await expect(raw).not.toContainText("_icon:");
	} finally {
		removeFixtureVaultCopy(vaultPath);
	}
});
