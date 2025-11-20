import { WorkspaceLeaf } from "obsidian";
import { IFocusEffect } from "./effects/i-focus-effect";

export class FocusController {
    private effects: IFocusEffect[] = [];
    private isFocusModeActive: boolean = false;

    constructor() {
    }

    addEffect(effect: IFocusEffect) {
        this.effects.push(effect);
    }

    isActive(): boolean {
        return this.isFocusModeActive;
    }

    activate(leaf: WorkspaceLeaf) {
        console.log("[FocusController] activate() called");
        this.isFocusModeActive = true;

        this.effects.forEach(effect => {
            effect.enable(leaf);
        });
    }

    deactivate(leaf: WorkspaceLeaf) {
        console.log("[FocusController] deactivate() called, isFocusModeActive:", this.isFocusModeActive);
        if (!this.isFocusModeActive) return;

        this.isFocusModeActive = false;

        this.effects.forEach(effect => {
            effect.disable(leaf);
        });
    }

    toggle(leaf: WorkspaceLeaf): void {
        if (this.isFocusModeActive) {
            this.deactivate(leaf);
        } else {
            this.activate(leaf);
        }
    }

    update(leaf: WorkspaceLeaf): void {
        console.log("[FocusController] update() called, isFocusModeActive:", this.isFocusModeActive);
        if (this.isFocusModeActive) {
            this.effects.forEach((effect) => effect.update(leaf));
        }
    }

    restoreState() {
        // Force deactivate on whatever is current if needed,
        // but usually deactivate(leaf) is enough.
        // This might be called on plugin unload.
        // We need a leaf to pass to disable().
        // If we don't have one, we might need effects to handle null?
        // Or we just track the last active leaf?
    }
}
