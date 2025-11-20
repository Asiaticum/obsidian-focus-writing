import { WorkspaceLeaf, ItemView } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { IFocusEffect } from "./i-focus-effect";

const dimmedDecoration = Decoration.mark({ class: "focus-mode-dimmed" });

export class SentenceFocusEffect implements IFocusEffect {
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        // This effect is mutually exclusive with ParagraphDimmer in a real scenario,
        // or we need to manage priority. For now, we'll assume user enables one or the other,
        // or we just implement the logic.
        // Since the user asked for "Sentence Focus" as a separate feature,
        // we will implement it as a separate ViewPlugin.

        if (this.plugin.settings.visualEffect !== "sentence") return;

        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.add("focus-mode-sentence-active");
    }

    disable(leaf: WorkspaceLeaf): void {
        const contentEl = (leaf.view as ItemView).contentEl;
        contentEl.classList.remove("focus-mode-sentence-active");
    }

    update(leaf: WorkspaceLeaf): void {
        if (this.plugin.settings.visualEffect !== "sentence") {
            this.disable(leaf);
        } else {
            const contentEl = (leaf.view as ItemView).contentEl;
            if (!contentEl.classList.contains("focus-mode-sentence-active")) {
                this.enable(leaf);
            }
        }
    }

    static extension = ViewPlugin.fromClass(
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
                const isEnabled = view.contentDOM.closest(".focus-mode-sentence-active");
                if (!isEnabled) {
                    return Decoration.none;
                }

                const builder = new RangeSetBuilder<Decoration>();
                const { state } = view;
                const { doc, selection } = state;

                // Find the current sentence range
                // Simple heuristic: split by punctuation
                // We need to find the sentence containing the cursor.
                // If multiple cursors, we highlight sentences for all.

                const activeRanges: { from: number, to: number }[] = [];

                for (const range of selection.ranges) {
                    const pos = range.head;
                    const line = doc.lineAt(pos);
                    const text = line.text;
                    const relativePos = pos - line.from;

                    // Simple sentence detection within the line
                    // Look for delimiters: . ! ? 。
                    // This is a naive implementation.

                    let start = 0;
                    let end = text.length;

                    // Find start of sentence (last delimiter before cursor)
                    const delimiters = /[.!?。！？」]/;

                    // Scan backwards from relativePos
                    for (let i = relativePos - 1; i >= 0; i--) {
                        if (delimiters.test(text[i])) {
                            start = i + 1;
                            break;
                        }
                    }

                    // Scan forwards from relativePos
                    for (let i = relativePos; i < text.length; i++) {
                        if (delimiters.test(text[i])) {
                            end = i + 1; // Include the delimiter
                            break;
                        }
                    }

                    activeRanges.push({ from: line.from + start, to: line.from + end });
                }

                // Now dim everything that is NOT in activeRanges
                // We iterate through the visible ranges and dim the gaps.

                // Sort active ranges
                activeRanges.sort((a, b) => a.from - b.from);

                // Merge overlapping ranges
                const mergedRanges: { from: number, to: number }[] = [];
                if (activeRanges.length > 0) {
                    let current = activeRanges[0];
                    for (let i = 1; i < activeRanges.length; i++) {
                        if (activeRanges[i].from <= current.to) {
                            current.to = Math.max(current.to, activeRanges[i].to);
                        } else {
                            mergedRanges.push(current);
                            current = activeRanges[i];
                        }
                    }
                    mergedRanges.push(current);
                }

                // Apply dimming to gaps
                // We need to cover the whole document or just visible ranges?
                // ViewPlugin should return decorations for the visible range.

                for (const { from, to } of view.visibleRanges) {
                    let pos = from;

                    for (const active of mergedRanges) {
                        if (active.to < pos) continue; // Already passed
                        if (active.from > to) break; // Beyond visible

                        // Dim from pos to active.from
                        if (pos < active.from) {
                            builder.add(pos, active.from, dimmedDecoration);
                        }

                        pos = Math.max(pos, active.to);
                    }

                    // Dim remaining
                    if (pos < to) {
                        builder.add(pos, to, dimmedDecoration);
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
