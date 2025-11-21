import { App, WorkspaceLeaf } from "obsidian";
import { IFocusEffect } from "./i-focus-effect";

export class ZenUiEffect implements IFocusEffect {
    private app: App;
    private plugin: any;
    private previousLeftCollapsed: boolean = false;
    private previousRightCollapsed: boolean = false;

    constructor(app: App, plugin: any) {
        this.app = app;
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        if (!this.plugin.settings.enableZenUi) return;

        // Save current state
        this.previousLeftCollapsed = this.app.workspace.leftSplit.collapsed;
        this.previousRightCollapsed = this.app.workspace.rightSplit.collapsed;

        // Collapse sidebars
        if (!this.previousLeftCollapsed) {
            this.app.workspace.leftSplit.collapse();
        }
        if (!this.previousRightCollapsed) {
            this.app.workspace.rightSplit.collapse();
        }
    }

    disable(leaf: WorkspaceLeaf): void {
        // Restore previous state
        if (!this.previousLeftCollapsed) {
            this.app.workspace.leftSplit.expand();
        }
        if (!this.previousRightCollapsed) {
            this.app.workspace.rightSplit.expand();
        }
    }

    update(leaf: WorkspaceLeaf): void {
        if (this.plugin.settings.enableZenUi) {
            // Collapse sidebars if not already collapsed
            if (!this.app.workspace.leftSplit.collapsed) {
                this.app.workspace.leftSplit.collapse();
            }
            if (!this.app.workspace.rightSplit.collapsed) {
                this.app.workspace.rightSplit.collapse();
            }
        } else {
            // Restore sidebars
            this.disable(leaf);
        }
    }
}
