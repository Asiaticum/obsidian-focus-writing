import { WorkspaceLeaf, ItemView } from "obsidian";
import { IFocusEffect } from "./i-focus-effect";

export class FrontmatterHidingEffect implements IFocusEffect {
    private plugin: any; // Using any to avoid circular dependency or complex type imports for now

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        if (!this.plugin.settings.enableFrontmatterHiding) return;
        // We can use a global CSS class on the body or workspace to hide frontmatter when focus mode is active.
        // Or we can try to target the specific leaf.
        // Since we want to be modular, let's add a class to the leaf's content element.

        // Note: Obsidian renders frontmatter with class .cm-hmd-frontmatter or .frontmatter-container depending on mode.
        // In Live Preview, it's .cm-hmd-frontmatter.
        // In Reading view, it's .frontmatter-container.

        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.add("focus-mode-hide-frontmatter");
    }

    disable(leaf: WorkspaceLeaf): void {
        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.remove("focus-mode-hide-frontmatter");
    }

    update(leaf: WorkspaceLeaf): void {
        if (!this.plugin.settings.enableFrontmatterHiding) {
            this.disable(leaf);
        } else {
            const contentEl = (leaf.view as ItemView).contentEl;
            if (!contentEl.classList.contains("focus-mode-hide-frontmatter")) {
                this.enable(leaf);
            }
        }
    }
}
