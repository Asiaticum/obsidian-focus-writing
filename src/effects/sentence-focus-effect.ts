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

            getSentenceRange(doc: any, pos: number): { from: number, to: number } | null {
                // Get paragraph boundaries (blank line to blank line)
                const cursorLine = doc.lineAt(pos);

                // Scan upwards to find blank line or start of doc
                let startLineNo = cursorLine.number;
                while (startLineNo > 1) {
                    const line = doc.line(startLineNo - 1);
                    if (line.length === 0) {
                        break;
                    }
                    startLineNo--;
                }

                // Scan downwards to find blank line or end of doc
                let endLineNo = cursorLine.number;
                while (endLineNo < doc.lines) {
                    const line = doc.line(endLineNo + 1);
                    if (line.length === 0) {
                        break;
                    }
                    endLineNo++;
                }

                // Get paragraph text and build position mapping
                const paragraphLines: { text: string, from: number, to: number }[] = [];
                for (let lineNo = startLineNo; lineNo <= endLineNo; lineNo++) {
                    const line = doc.line(lineNo);
                    paragraphLines.push({ text: line.text, from: line.from, to: line.to });
                }

                // Find sentence boundaries within the paragraph
                const boundaries = this.findSentenceBoundaries(paragraphLines);

                // Find which sentence contains the cursor position
                for (let i = 0; i < boundaries.length; i++) {
                    const boundary = boundaries[i];
                    if (pos >= boundary.from && pos <= boundary.to) {
                        return { from: boundary.from, to: boundary.to };
                    }
                }

                return null;
            }

            findSentenceBoundaries(lines: { text: string, from: number, to: number }[]): { from: number, to: number }[] {
                const sentences: { from: number, to: number }[] = [];

                // Patterns
                const sentenceEndPunctuation = /[.!?。！？]/;
                const ellipsis = /[…]/;
                const closingQuotes = /[」』]/;
                const openingQuotes = /[「『]/;
                const listMarker = /^([-*+・]|\d+\.)\s/;

                let sentenceStart = lines.length > 0 ? lines[0].from : 0;

                for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                    const line = lines[lineIdx];
                    const text = line.text;

                    // Check if line starts with list marker
                    if (listMarker.test(text) && lineIdx > 0) {
                        // Previous line ends a sentence, this line starts new sentence
                        const prevLine = lines[lineIdx - 1];
                        sentences.push({ from: sentenceStart, to: prevLine.to });
                        sentenceStart = line.from;
                    }

                    // Check if this is a quote-only line (starts with 「 and ends with 」)
                    const startsWithQuote = openingQuotes.test(text.trim()[0] || '');
                    const endsWithQuote = closingQuotes.test(text.trim()[text.trim().length - 1] || '');

                    if (startsWithQuote && endsWithQuote) {
                        // Quote-only line: check for internal punctuation
                        for (let i = 0; i < text.length; i++) {
                            const char = text[i];
                            if (sentenceEndPunctuation.test(char)) {
                                // Check if this is before the closing quote
                                const remainingText = text.substring(i + 1);
                                const hasClosingQuoteAfter = closingQuotes.test(remainingText);
                                const hasTextAfterQuote = remainingText.replace(/[」』\s]/g, '').length > 0;

                                if (hasClosingQuoteAfter && !hasTextAfterQuote) {
                                    // This punctuation is before closing quote with no text after
                                    // Create sentence boundary at the punctuation
                                    sentences.push({ from: sentenceStart, to: line.from + i + 1 });
                                    sentenceStart = line.from + i + 1;
                                }
                            }
                        }

                        // End of quote-only line is a sentence boundary
                        sentences.push({ from: sentenceStart, to: line.to });
                        if (lineIdx + 1 < lines.length) {
                            sentenceStart = lines[lineIdx + 1].from;
                        }
                        continue;
                    }

                    // Check for sentence endings in the line
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];

                        if (sentenceEndPunctuation.test(char) || ellipsis.test(char)) {
                            // Check if followed by closing quote
                            const nextChar = i + 1 < text.length ? text[i + 1] : '';

                            if (closingQuotes.test(nextChar)) {
                                // Punctuation followed by closing quote
                                // Check if there's text after the quote on the same line
                                const restOfLine = text.substring(i + 2).trim();
                                if (restOfLine.length > 0) {
                                    // Text continues, not a boundary yet
                                    continue;
                                } else {
                                    // No text after quote on this line
                                    // This is a sentence boundary
                                    sentences.push({ from: sentenceStart, to: line.from + i + 2 });
                                    sentenceStart = line.from + i + 2;
                                }
                            } else {
                                // Punctuation not followed by quote
                                sentences.push({ from: sentenceStart, to: line.from + i + 1 });
                                sentenceStart = line.from + i + 1;
                            }
                        } else if (closingQuotes.test(char)) {
                            // Check if this is end of line
                            const restOfLine = text.substring(i + 1).trim();
                            if (restOfLine.length === 0) {
                                // Closing quote at end of line
                                sentences.push({ from: sentenceStart, to: line.from + i + 1 });
                                if (lineIdx + 1 < lines.length) {
                                    sentenceStart = lines[lineIdx + 1].from;
                                }
                                break;
                            }
                        }
                    }

                    // Check if line ends with ellipsis
                    if (text.trim().endsWith('…') || text.trim().endsWith('……')) {
                        sentences.push({ from: sentenceStart, to: line.to });
                        if (lineIdx + 1 < lines.length) {
                            sentenceStart = lines[lineIdx + 1].from;
                        }
                    }
                }

                // Handle last sentence if not closed
                if (lines.length > 0) {
                    const lastLine = lines[lines.length - 1];
                    if (sentenceStart <= lastLine.to) {
                        // Check if we haven't already added this sentence
                        const lastSentence = sentences[sentences.length - 1];
                        if (!lastSentence || lastSentence.to < lastLine.to) {
                            sentences.push({ from: sentenceStart, to: lastLine.to });
                        }
                    }
                }

                return sentences;
            }

            computeDecorations(view: EditorView): DecorationSet {
                const isEnabled = view.contentDOM.closest(".focus-mode-sentence-active");
                if (!isEnabled) {
                    return Decoration.none;
                }

                const builder = new RangeSetBuilder<Decoration>();
                const { state } = view;
                const { doc, selection } = state;

                const activeRanges: { from: number, to: number }[] = [];

                for (const range of selection.ranges) {
                    const pos = range.head;
                    const sentenceRange = this.getSentenceRange(doc, pos);
                    if (sentenceRange) {
                        activeRanges.push(sentenceRange);
                    }
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
