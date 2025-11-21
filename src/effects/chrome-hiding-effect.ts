import { App, WorkspaceLeaf } from "obsidian";
import { IFocusEffect } from "./i-focus-effect";

export class ChromeHidingEffect implements IFocusEffect {
    private app: App;
    private plugin: any;

    constructor(app: App, plugin: any) {
        this.app = app;
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        // Chrome hiding is part of Zen UI or separate?
        // The user settings has "Zen UI" which usually implies hiding sidebars.
        // But Chrome Hiding (ribbon etc) is also UI.
        // Let's assume "Zen UI" covers both Sidebar Toggle AND Chrome Hiding for now,
        // OR we should have added a separate setting for Chrome Hiding.
        // The plan added `enableZenUi`. Let's use that for both, or check if I missed a setting.
        // I'll use `enableZenUi` for now as it fits the "Zen" concept.
        // Wait, the user asked for "UIの最小化 (Zen UI)" which included C-1, C-2.

        if (!this.plugin.settings.enableZenUi) return;

        document.body.classList.add("focus-mode-chrome-hidden");
    }

    disable(leaf: WorkspaceLeaf): void {
        document.body.classList.remove("focus-mode-chrome-hidden");
    }

    update(leaf: WorkspaceLeaf): void {
        if (this.plugin.settings.enableZenUi) {
            if (!document.body.classList.contains("focus-mode-chrome-hidden")) {
                document.body.classList.add("focus-mode-chrome-hidden");
            }
        } else {
            this.disable(leaf);
        }
    }
}
