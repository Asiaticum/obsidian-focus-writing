import { WorkspaceLeaf, ItemView } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { IFocusEffect } from "./i-focus-effect";

// Define the decoration for dimmed text
const dimmedDecoration = Decoration.mark({ class: "focus-mode-dimmed" });

export class ActiveLineFocusEffect implements IFocusEffect {
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        console.log("[ActiveLineFocus] enable() called, visualEffect:", this.plugin.settings.visualEffect);
        if (this.plugin.settings.visualEffect !== "active-line") return;

        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.add("focus-mode-active-line");
        console.log("[ActiveLineFocus] Enabled - added class 'focus-mode-active-line'");
    }

    disable(leaf: WorkspaceLeaf): void {
        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.remove("focus-mode-active-line");
    }

    update(leaf: WorkspaceLeaf): void {
        if (this.plugin.settings.visualEffect !== "active-line") {
            this.disable(leaf);
        } else {
            const contentEl = (leaf.view as ItemView).contentEl;
            if (!contentEl.classList.contains("focus-mode-active-line")) {
                this.enable(leaf);
            }
        }
    }

    // ViewPlugin extension to apply decoration to active line
    static extension = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                console.log("[ActiveLineFocus Extension] ViewPlugin constructor called");
                this.decorations = this.computeDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.selectionSet || update.viewportChanged) {
                    this.decorations = this.computeDecorations(update.view);
                }
            }

            computeDecorations(view: EditorView): DecorationSet {
                // Check if active line focus is enabled
                const isEnabled = view.contentDOM.closest(".focus-mode-active-line");
                console.log("[ActiveLineFocus Extension] computeDecorations - isEnabled:", !!isEnabled);

                if (!isEnabled) {
                    return Decoration.none;
                }

                const builder = new RangeSetBuilder<Decoration>();
                const { state } = view;
                const { doc } = state;

                // Get the active line range (from and to)
                const activeLine = state.doc.lineAt(state.selection.main.head);
                const activeLineFrom = activeLine.from;
                const activeLineTo = activeLine.to;

                console.log("[ActiveLineFocus Extension] Active line at pos:", activeLineFrom, "to", activeLineTo);

                // Apply dimming to everything BEFORE the active line
                if (activeLineFrom > 0) {
                    for (const { from, to } of view.visibleRanges) {
                        if (from < activeLineFrom) {
                            const end = Math.min(to, activeLineFrom);
                            builder.add(from, end, dimmedDecoration);
                        }
                    }
                }

                // Apply dimming to everything AFTER the active line
                if (activeLineTo < doc.length) {
                    for (const { from, to } of view.visibleRanges) {
                        if (to > activeLineTo) {
                            const start = Math.max(from, activeLineTo);
                            builder.add(start, to, dimmedDecoration);
                        }
                    }
                }

                const decorations = builder.finish();
                console.log("[ActiveLineFocus Extension] Returning decorations, size:", decorations.size);
                return decorations;
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
}
