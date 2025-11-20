import { App, PluginSettingTab, Setting, Plugin } from "obsidian";

export type VisualEffectType = "none" | "paragraph" | "sentence" | "active-line";
export type StatisticType = "characters" | "charactersNoSpaces" | "words" | "lines" | "paragraphs";

export interface FocusModeSettings {
    focusFolderPaths: string[];
    visualEffect: VisualEffectType;
    enableTypewriterScroll: boolean;
    typewriterOffset: number; // 0-100 percentage
    enableFrontmatterHiding: boolean;
    enableZenUi: boolean;
    enableStatisticsDisplay: boolean;
    statisticsToShow: StatisticType[];
}

export const DEFAULT_SETTINGS: FocusModeSettings = {
    focusFolderPaths: [],
    visualEffect: "paragraph",
    enableTypewriterScroll: false,
    typewriterOffset: 30,
    enableFrontmatterHiding: true,
    enableZenUi: true,
    enableStatisticsDisplay: true,
    statisticsToShow: ["characters", "words"]
};

interface IFocusModePlugin extends Plugin {
    settings: FocusModeSettings;
    saveSettings(): Promise<void>;
}

export class FocusModeSettingTab extends PluginSettingTab {
    plugin: IFocusModePlugin;

    constructor(app: App, plugin: IFocusModePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl("h2", { text: "Focus Mode Settings" });

        new Setting(containerEl)
            .setName("Focus Folder Paths")
            .setDesc("Folders where focus mode should be automatically enabled (one per line)")
            .addTextArea((text) =>
                text
                    .setPlaceholder("Journal\nProjects/Novel")
                    .setValue(this.plugin.settings.focusFolderPaths.join("\n"))
                    .onChange(async (value) => {
                        this.plugin.settings.focusFolderPaths = value
                            .split("\n")
                            .map((path) => path.trim())
                            .filter((path) => path.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl("h3", { text: "Visual Effects" });

        new Setting(containerEl)
            .setName("Focus Style")
            .setDesc("Select the visual focus style")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("none", "None")
                    .addOption("paragraph", "Paragraph Focus")
                    .addOption("sentence", "Sentence Focus")
                    .addOption("active-line", "Active Line Focus")
                    .setValue(this.plugin.settings.visualEffect)
                    .onChange(async (value) => {
                        this.plugin.settings.visualEffect = value as VisualEffectType;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Hide Frontmatter")
            .setDesc("Hide YAML frontmatter in focus mode")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableFrontmatterHiding)
                    .onChange(async (value) => {
                        this.plugin.settings.enableFrontmatterHiding = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl("h3", { text: "Scroll & UI" });

        new Setting(containerEl)
            .setName("Typewriter Scroll")
            .setDesc("Keep cursor centered vertically")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableTypewriterScroll)
                    .onChange(async (value) => {
                        this.plugin.settings.enableTypewriterScroll = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Typewriter Offset")
            .setDesc("Vertical position of the cursor (0% = top, 50% = center, 100% = bottom)")
            .addSlider((slider) =>
                slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.typewriterOffset)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.typewriterOffset = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Zen UI")
            .setDesc("Hide sidebars and other UI elements")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableZenUi)
                    .onChange(async (value) => {
                        this.plugin.settings.enableZenUi = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl("h3", { text: "Statistics Display" });

        new Setting(containerEl)
            .setName("Show Statistics")
            .setDesc("Display writing statistics in the bottom-right corner")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableStatisticsDisplay)
                    .onChange(async (value) => {
                        this.plugin.settings.enableStatisticsDisplay = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Statistics to Display")
            .setDesc("Select which statistics to show")
            .setClass("statistics-checkboxes");

        const statisticsContainer = containerEl.createDiv({ cls: "statistics-options" });

        const statisticOptions = [
            { key: "characters", label: "文字数（スペース含む）" },
            { key: "charactersNoSpaces", label: "文字数（スペース除く）" },
            { key: "words", label: "単語数" },
            { key: "lines", label: "行数" },
            { key: "paragraphs", label: "段落数" }
        ];

        statisticOptions.forEach((option) => {
            new Setting(statisticsContainer)
                .setName(option.label)
                .addToggle((toggle) =>
                    toggle
                        .setValue(this.plugin.settings.statisticsToShow.includes(option.key as StatisticType))
                        .onChange(async (value) => {
                            if (value) {
                                if (!this.plugin.settings.statisticsToShow.includes(option.key as StatisticType)) {
                                    this.plugin.settings.statisticsToShow.push(option.key as StatisticType);
                                }
                            } else {
                                this.plugin.settings.statisticsToShow = this.plugin.settings.statisticsToShow.filter(
                                    (stat) => stat !== option.key
                                );
                            }
                            await this.plugin.saveSettings();
                        })
                );
        });
    }
}
