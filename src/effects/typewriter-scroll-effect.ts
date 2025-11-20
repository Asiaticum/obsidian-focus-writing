import { WorkspaceLeaf, ItemView } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { IFocusEffect } from "./i-focus-effect";

export class TypewriterScrollEffect implements IFocusEffect {
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        console.log("[TypewriterScroll] enable() called, enableTypewriterScroll:", this.plugin.settings.enableTypewriterScroll);
        if (!this.plugin.settings.enableTypewriterScroll) return;

        // @ts-ignore
        const editor = leaf.view.editor?.cm as EditorView;
        if (editor) {
            const contentEl = (leaf.view as ItemView).contentEl;
            contentEl.classList.add("focus-mode-typewriter");

            // Store the offset in a data attribute so the extension can read it
            contentEl.dataset.typewriterOffset = this.plugin.settings.typewriterOffset.toString();

            console.log("[TypewriterScroll] Enabled - added class 'focus-mode-typewriter', offset:",
                this.plugin.settings.typewriterOffset);

            // Force a measure to update margins immediately
            editor.requestMeasure();
        } else {
            console.log("[TypewriterScroll] No editor found");
        }
    }

    disable(leaf: WorkspaceLeaf): void {
        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.remove("focus-mode-typewriter");
        delete contentEl.dataset.typewriterOffset;
    }

    update(leaf: WorkspaceLeaf): void {
        const contentEl = (leaf.view as ItemView).contentEl;
        // Update the offset in case it changed
        if (this.plugin.settings.enableTypewriterScroll) {
            if (!contentEl.classList.contains("focus-mode-typewriter")) {
                this.enable(leaf);
            } else {
                // Update offset attribute
                contentEl.dataset.typewriterOffset = this.plugin.settings.typewriterOffset.toString();
            }
        } else {
            this.disable(leaf);
        }
    }

    static extension = EditorView.updateListener.of((update: ViewUpdate) => {
        console.log("[TypewriterScroll Extension] updateListener called");

        // Check if typewriter mode is active
        const contentEl = update.view.contentDOM.closest(".focus-mode-typewriter") as HTMLElement;
        console.log("[TypewriterScroll Extension] isEnabled:", !!contentEl,
            "selectionSet:", update.selectionSet, "docChanged:", update.docChanged);

        if (!contentEl) return;

        // Only scroll on selection changes (cursor movement, typing)
        if (!update.selectionSet && !update.docChanged) return;

        const offsetPercent = parseInt(contentEl.dataset.typewriterOffset || "50", 10);

        // Get cursor position
        const cursorPos = update.state.selection.main.head;
        const cursorCoords = update.view.coordsAtPos(cursorPos);

        if (!cursorCoords) {
            console.log("[TypewriterScroll Extension] No cursor coords");
            return;
        }

        // Get viewport dimensions
        const viewportHeight = update.view.scrollDOM.clientHeight;
        const scrollTop = update.view.scrollDOM.scrollTop;

        // Calculate where cursor currently is relative to viewport top
        const cursorRelativeToViewport = cursorCoords.top - update.view.scrollDOM.getBoundingClientRect().top;

        // Calculate where we want the cursor to be (offset% from top)
        const targetPosition = viewportHeight * (offsetPercent / 100);

        // Calculate scroll adjustment needed
        const scrollAdjustment = cursorRelativeToViewport - targetPosition;

        console.log("[TypewriterScroll Extension] Scrolling - cursorY:", cursorRelativeToViewport,
            "target:", targetPosition, "adjustment:", scrollAdjustment);

        // Apply smooth scroll with animation
        if (Math.abs(scrollAdjustment) > 1) {
            const newScrollTop = scrollTop + scrollAdjustment;
            update.view.scrollDOM.scrollTo({
                top: newScrollTop,
                behavior: 'smooth'
            });
        }
    });
}
