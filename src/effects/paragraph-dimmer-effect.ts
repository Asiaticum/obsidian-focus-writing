import { WorkspaceLeaf, ItemView } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { IFocusEffect } from "./i-focus-effect";

// Define the decoration to be applied to dimmed text (mark, not line)
const dimmedDecoration = Decoration.mark({ class: "focus-mode-dimmed" });

// Create the ViewPlugin
const paragraphDimmerPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.computeDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = this.computeDecorations(update.view);
            }
        }

        computeDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const { state } = view;
            const { doc, selection } = state;

            // Get the active line range
            // We assume a single cursor for simplicity in MVP, or handle multiple cursors
            // If multiple cursors, we don't dim any line that has a cursor.
            const activeLineStartPositions = new Set<number>();

            for (const range of selection.ranges) {
                const line = doc.lineAt(range.head);
                activeLineStartPositions.add(line.from);
            }

            // Iterate through all visible lines in the viewport
            for (const { from, to } of view.visibleRanges) {
                for (let pos = from; pos <= to;) {
                    const line = doc.lineAt(pos);

                    // If this line is NOT active, dim it
                    if (!activeLineStartPositions.has(line.from)) {
                        builder.add(line.from, line.from, dimmedDecoration);
                    }

                    pos = line.to + 1;
                }
            }

            return builder.finish();
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

export class ParagraphDimmerEffect implements IFocusEffect {
    private activeLeaves: Set<WorkspaceLeaf> = new Set();
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        console.log("[ParagraphDimmer] enable() called, visualEffect:", this.plugin.settings.visualEffect);
        if (this.plugin.settings.visualEffect !== "paragraph") return;

        // @ts-ignore - accessing internal CM6 editor
        const editor = leaf.view.editor?.cm as EditorView;
        if (editor) {
            const contentEl = (leaf.view as ItemView).contentEl;
            contentEl.classList.add("focus-mode-paragraph-active");
            this.activeLeaves.add(leaf);
            console.log("[ParagraphDimmer] Enabled - added class 'focus-mode-paragraph-active'");
            // Force a measure to update decorations
            editor.requestMeasure();
        } else {
            console.log("[ParagraphDimmer] No editor found");
        }
    }

    disable(leaf: WorkspaceLeaf): void {
        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.remove("focus-mode-paragraph-active");
        this.activeLeaves.delete(leaf);
    }

    update(leaf: WorkspaceLeaf): void {
        // If settings changed, we might need to re-check enable/disable
        if (this.plugin.settings.visualEffect !== "paragraph") {
            this.disable(leaf);
        } else {
            // If it should be enabled but isn't (e.g. switched from another mode), enable it
            const contentEl = (leaf.view as ItemView).contentEl;
            if (!contentEl.classList.contains("focus-mode-paragraph-active")) {
                this.enable(leaf);
            }
        }
    }

    // This extension should be registered in the main plugin
    static extension = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.computeDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged || update.selectionSet) {
                    this.decorations = this.computeDecorations(update.view);
                }
            }

            computeDecorations(view: EditorView): DecorationSet {
                // Check if paragraph focus is active for this view
                const isEnabled = view.contentDOM.closest(".focus-mode-paragraph-active");
                console.log("[ParagraphDimmer Extension] computeDecorations - isEnabled:", !!isEnabled);
                if (!isEnabled) {
                    return Decoration.none;
                }

                const builder = new RangeSetBuilder<Decoration>();
                const { state } = view;
                const { doc } = state;
                const selection = state.selection.main;

                // Find the "paragraph" containing the cursor.
                // User definition: Paragraphs are separated by blank lines (two or more newlines).
                // We need to find the start and end of the block of text containing the cursor.

                // 1. Identify the line containing the cursor.
                const cursorLine = doc.lineAt(selection.head);

                // 2. Scan upwards to find a blank line or start of doc.
                let startLineNo = cursorLine.number;
                while (startLineNo > 1) {
                    const line = doc.line(startLineNo - 1);
                    if (line.length === 0) {
                        break;
                    }
                    startLineNo--;
                }

                // 3. Scan downwards to find a blank line or end of doc.
                let endLineNo = cursorLine.number;
                while (endLineNo < doc.lines) {
                    const line = doc.line(endLineNo + 1);
                    if (line.length === 0) {
                        break;
                    }
                    endLineNo++;
                }

                const startPos = doc.line(startLineNo).from;
                const endPos = doc.line(endLineNo).to;

                console.log("[ParagraphDimmer Extension] Active paragraph range:", startPos, "-", endPos,
                    "Lines:", startLineNo, "-", endLineNo);

                // Apply dimming to everything BEFORE startPos
                if (startPos > 0) {
                    // We need to decorate visible ranges.
                    for (const { from, to } of view.visibleRanges) {
                        if (from < startPos) {
                            const end = Math.min(to, startPos);
                            builder.add(from, end, dimmedDecoration);
                        }
                    }
                }

                // Apply dimming to everything AFTER endPos
                if (endPos < doc.length) {
                    for (const { from, to } of view.visibleRanges) {
                        if (to > endPos) {
                            const start = Math.max(from, endPos);
                            builder.add(start, to, dimmedDecoration);
                        }
                    }
                }

                return builder.finish();
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
}
