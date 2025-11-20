import { App, WorkspaceLeaf, MarkdownView, ItemView } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { IFocusEffect } from "./i-focus-effect";

interface Statistics {
    characters: number;
    charactersNoSpaces: number;
    words: number;
    lines: number;
    paragraphs: number;
}

export class StatisticsDisplayEffect implements IFocusEffect {
    private app: App;
    private plugin: any;

    constructor(app: App, plugin: any) {
        this.app = app;
        this.plugin = plugin;
    }

    enable(leaf: WorkspaceLeaf): void {
        if (!this.plugin.settings.enableStatisticsDisplay) return;

        const view = leaf.view;
        if (!(view instanceof MarkdownView)) return;

        const contentEl = (view as ItemView).contentEl;

        // Create overlay if it doesn't exist
        if (!contentEl.querySelector(".focus-mode-statistics-overlay")) {
            const overlayElement = createDiv({ cls: "focus-mode-statistics-overlay" });
            contentEl.appendChild(overlayElement);

            // Store settings in data attributes so the extension can read them
            contentEl.dataset.statisticsEnabled = "true";
            contentEl.dataset.statisticsToShow = JSON.stringify(this.plugin.settings.statisticsToShow);

            // Initial update
            this.updateOverlay(view, overlayElement);
        }
    }

    disable(leaf: WorkspaceLeaf): void {
        const view = leaf.view;
        if (!(view instanceof MarkdownView)) return;

        const contentEl = (view as ItemView).contentEl;
        const overlayElement = contentEl.querySelector(".focus-mode-statistics-overlay");

        if (overlayElement) {
            overlayElement.remove();
        }

        delete contentEl.dataset.statisticsEnabled;
        delete contentEl.dataset.statisticsToShow;
    }

    update(leaf: WorkspaceLeaf): void {
        const view = leaf.view;
        if (!(view instanceof MarkdownView)) return;

        const contentEl = (view as ItemView).contentEl;
        const overlayElement = contentEl.querySelector(".focus-mode-statistics-overlay") as HTMLElement;

        if (this.plugin.settings.enableStatisticsDisplay) {
            // Update settings in data attributes
            contentEl.dataset.statisticsEnabled = "true";
            contentEl.dataset.statisticsToShow = JSON.stringify(this.plugin.settings.statisticsToShow);

            if (!overlayElement) {
                this.enable(leaf);
            } else {
                // Update the display immediately with new settings
                this.updateOverlay(view, overlayElement);
            }
        } else {
            if (overlayElement) {
                this.disable(leaf);
            }
        }
    }

    private updateOverlay(view: MarkdownView, overlayElement: HTMLElement): void {
        const editor = view.editor;
        if (!editor) return;

        const text = editor.getValue();
        const stats = this.calculateStatistics(text);

        const statisticsToShow = this.plugin.settings.statisticsToShow || ["characters", "words"];
        this.renderStatistics(overlayElement, stats, statisticsToShow);
    }

    private calculateStatistics(text: string): Statistics {
        // Character count (with spaces)
        const characters = text.length;

        // Character count (without spaces)
        const charactersNoSpaces = text.replace(/\s/g, "").length;

        // Word count
        // Split by whitespace and filter out empty strings
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;

        // Line count
        const lines = text.split("\n").length;

        // Paragraph count (blocks separated by blank lines)
        const paragraphs = text
            .split(/\n\s*\n/)
            .filter(para => para.trim().length > 0)
            .length;

        return {
            characters,
            charactersNoSpaces,
            words,
            lines,
            paragraphs
        };
    }

    private renderStatistics(overlayElement: HTMLElement, stats: Statistics, statsToShow: string[]): void {
        // Clear current content
        overlayElement.empty();

        // Define the display order
        const displayOrder = [
            { key: "characters", label: "文字数", value: stats.characters },
            { key: "charactersNoSpaces", label: "文字数（空白除く）", value: stats.charactersNoSpaces },
            { key: "words", label: "単語数", value: stats.words },
            { key: "lines", label: "行数", value: stats.lines },
            { key: "paragraphs", label: "段落数", value: stats.paragraphs }
        ];

        // Display in the defined order, but only if included in statsToShow
        displayOrder.forEach((stat) => {
            if (!statsToShow.includes(stat.key)) return;

            const statItem = overlayElement.createDiv({ cls: "stat-item" });
            statItem.createSpan({ cls: "stat-label", text: stat.label + ": " });
            statItem.createSpan({ cls: "stat-value", text: this.formatNumber(stat.value) });
        });
    }

    private formatNumber(num: number): string {
        return num.toLocaleString();
    }

    static extension = EditorView.updateListener.of((update: ViewUpdate) => {
        // Check if statistics display is enabled
        const contentEl = update.view.contentDOM.closest(".markdown-source-view")?.parentElement as HTMLElement;
        if (!contentEl || contentEl.dataset.statisticsEnabled !== "true") return;

        // Only update on document changes
        if (!update.docChanged) return;

        // Find the overlay element
        const overlayElement = contentEl.querySelector(".focus-mode-statistics-overlay") as HTMLElement;
        if (!overlayElement) return;

        // Get the text content
        const text = update.state.doc.toString();

        // Calculate statistics
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, "").length;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        const lines = text.split("\n").length;
        const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;

        const stats: Statistics = {
            characters,
            charactersNoSpaces,
            words,
            lines,
            paragraphs
        };

        // Get statistics to show from data attribute
        const statisticsToShow = JSON.parse(contentEl.dataset.statisticsToShow || '["characters", "words"]');

        // Render statistics
        overlayElement.empty();

        // Define the display order (same as in renderStatistics method)
        const displayOrder = [
            { key: "characters", label: "文字数", value: stats.characters },
            { key: "charactersNoSpaces", label: "文字数（空白除く）", value: stats.charactersNoSpaces },
            { key: "words", label: "単語数", value: stats.words },
            { key: "lines", label: "行数", value: stats.lines },
            { key: "paragraphs", label: "段落数", value: stats.paragraphs }
        ];

        // Display in the defined order, but only if included in statisticsToShow
        displayOrder.forEach((stat) => {
            if (!statisticsToShow.includes(stat.key)) return;

            const statItem = overlayElement.createDiv({ cls: "stat-item" });
            statItem.createSpan({ cls: "stat-label", text: stat.label + ": " });
            statItem.createSpan({ cls: "stat-value", text: stat.value.toLocaleString() });
        });
    });
}
