import { App, TFile, WorkspaceLeaf, FileView } from "obsidian";
import { FocusController } from "./focus-controller";
import { FocusModeSettings } from "./settings";

export class ContextObserver {
    private app: App;
    private controller: FocusController;
    private settings: FocusModeSettings;

    constructor(app: App, controller: FocusController, settings: FocusModeSettings) {
        this.app = app;
        this.controller = controller;
        this.settings = settings;
    }

    updateSettings(settings: FocusModeSettings) {
        this.settings = settings;
    }

    onActiveLeafChange(leaf: WorkspaceLeaf | null, forceUpdate: boolean = false) {
        console.log("[ContextObserver] onActiveLeafChange called, forceUpdate:", forceUpdate);
        if (!leaf || !leaf.view) return;

        if (leaf.view instanceof FileView) {
            const file = leaf.view.file;

            if (file instanceof TFile) {
                const shouldActivate = this.shouldActivate(file);
                console.log("[ContextObserver] File:", file.path, "shouldActivate:", shouldActivate);
                if (shouldActivate) {
                    // If focus mode is already active and forceUpdate is true, just update
                    if (forceUpdate && this.controller.isActive()) {
                        this.controller.update(leaf);
                    } else {
                        this.controller.activate(leaf);
                    }
                } else {
                    this.controller.deactivate(leaf);
                }
            } else {
                console.log("[ContextObserver] Not a TFile, deactivating");
                this.controller.deactivate(leaf);
            }
        }
    }

    private shouldActivate(file: TFile): boolean {
        if (!this.settings.focusFolderPaths || this.settings.focusFolderPaths.length === 0) {
            console.log("[ContextObserver] No focus folder paths configured");
            return false;
        }

        // Check if file path starts with any of the configured folders
        const result = this.settings.focusFolderPaths.some(folderPath =>
            file.path.startsWith(folderPath)
        );
        console.log("[ContextObserver] Checking paths:", this.settings.focusFolderPaths, "result:", result);
        return result;
    }
}
