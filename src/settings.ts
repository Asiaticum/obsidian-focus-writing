import { App, PluginSettingTab, Setting, Plugin } from "obsidian";

export type VisualEffectType = "none" | "paragraph" | "sentence" | "active-line";
export type StatisticType = "characters" | "charactersNoSpaces" | "words" | "lines" | "paragraphs";

export interface FocusModeSettings {
    focusFolderPaths: string[];
    visualEffect: VisualEffectType;
    enableTypewriterScroll: boolean;
    typewriterOffset: number; // 0-100 percentage
    typewriterScrollSpeed: number; // milliseconds
    enableFrontmatterHiding: boolean;
    enableZenUi: boolean;
    enableStatisticsDisplay: boolean;
    statisticsToShow: StatisticType[];
    language: 'en' | 'ja';
}

export const DEFAULT_SETTINGS: FocusModeSettings = {
    focusFolderPaths: [],
    visualEffect: "paragraph",
    enableTypewriterScroll: false,
    typewriterOffset: 30,
    typewriterScrollSpeed: 500,
    enableFrontmatterHiding: true,
    enableZenUi: true,
    enableStatisticsDisplay: true,
    statisticsToShow: ["characters", "words"],
    language: 'ja'
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
        const t = (key: keyof typeof translations['en']) => {
            const lang = this.plugin.settings.language || 'ja';
            return translations[lang][key] || translations['en'][key];
        };

        containerEl.empty();

        containerEl.createEl("h2", { text: t('settingsHeader') });

        new Setting(containerEl)
            .setName(t('languageName'))
            .setDesc(t('languageDesc'))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("ja", "日本語")
                    .addOption("en", "English")
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value as 'en' | 'ja';
                        await this.plugin.saveSettings();
                        this.display(); // Refresh settings to show new language
                    })
            );

        new Setting(containerEl)
            .setName(t('focusFolderPathsName'))
            .setDesc(t('focusFolderPathsDesc'))
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

        containerEl.createEl("h3", { text: t('visualEffectsHeader') });

        new Setting(containerEl)
            .setName(t('focusStyleName'))
            .setDesc(t('focusStyleDesc'))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("none", t('focusStyleNone'))
                    .addOption("paragraph", t('focusStyleParagraph'))
                    .addOption("sentence", t('focusStyleSentence'))
                    .addOption("active-line", t('focusStyleActiveLine'))
                    .setValue(this.plugin.settings.visualEffect)
                    .onChange(async (value) => {
                        this.plugin.settings.visualEffect = value as VisualEffectType;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('hideFrontmatterName'))
            .setDesc(t('hideFrontmatterDesc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableFrontmatterHiding)
                    .onChange(async (value) => {
                        this.plugin.settings.enableFrontmatterHiding = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl("h3", { text: t('scrollUiHeader') });

        new Setting(containerEl)
            .setName(t('typewriterScrollName'))
            .setDesc(t('typewriterScrollDesc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableTypewriterScroll)
                    .onChange(async (value) => {
                        this.plugin.settings.enableTypewriterScroll = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('typewriterOffsetName'))
            .setDesc(t('typewriterOffsetDesc'))
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
            .setName(t('typewriterScrollSpeedName'))
            .setDesc(t('typewriterScrollSpeedDesc'))
            .addSlider((slider) =>
                slider
                    .setLimits(0, 1000, 50)
                    .setValue(this.plugin.settings.typewriterScrollSpeed)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.typewriterScrollSpeed = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('zenUiName'))
            .setDesc(t('zenUiDesc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableZenUi)
                    .onChange(async (value) => {
                        this.plugin.settings.enableZenUi = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl("h3", { text: t('statisticsDisplayHeader') });

        new Setting(containerEl)
            .setName(t('showStatisticsName'))
            .setDesc(t('showStatisticsDesc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableStatisticsDisplay)
                    .onChange(async (value) => {
                        this.plugin.settings.enableStatisticsDisplay = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('statisticsToDisplayName'))
            .setDesc(t('statisticsToDisplayDesc'))
            .setClass("statistics-checkboxes");

        const statisticsContainer = containerEl.createDiv({ cls: "statistics-options" });

        const statisticOptions = [
            { key: "characters", label: t('statCharacters') },
            { key: "charactersNoSpaces", label: t('statCharactersNoSpaces') },
            { key: "words", label: t('statWords') },
            { key: "lines", label: t('statLines') },
            { key: "paragraphs", label: t('statParagraphs') }
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

const translations = {
    en: {
        settingsHeader: "Focus Mode Settings",
        languageName: "Language",
        languageDesc: "Select the language for the settings",
        focusFolderPathsName: "Focus Folder Paths",
        focusFolderPathsDesc: "Folders where focus mode should be automatically enabled (one per line)",
        visualEffectsHeader: "Visual Effects",
        focusStyleName: "Focus Style",
        focusStyleDesc: "Select the visual focus style",
        focusStyleNone: "None",
        focusStyleParagraph: "Paragraph Focus",
        focusStyleSentence: "Sentence Focus",
        focusStyleActiveLine: "Active Line Focus",
        hideFrontmatterName: "Hide Frontmatter",
        hideFrontmatterDesc: "Hide YAML frontmatter in focus mode",
        scrollUiHeader: "Scroll & UI",
        typewriterScrollName: "Typewriter Scroll",
        typewriterScrollDesc: "Keep cursor centered vertically",
        typewriterOffsetName: "Typewriter Offset",
        typewriterOffsetDesc: "Vertical position of the cursor (0% = top, 50% = center, 100% = bottom)",
        typewriterScrollSpeedName: "Typewriter Scroll Speed",
        typewriterScrollSpeedDesc: "Speed of the scrolling animation (ms)",
        zenUiName: "Zen UI",
        zenUiDesc: "Hide sidebars and other UI elements",
        statisticsDisplayHeader: "Statistics Display",
        showStatisticsName: "Show Statistics",
        showStatisticsDesc: "Display writing statistics in the bottom-right corner",
        statisticsToDisplayName: "Statistics to Display",
        statisticsToDisplayDesc: "Select which statistics to show",
        statCharacters: "Characters (with spaces)",
        statCharactersNoSpaces: "Characters (no spaces)",
        statWords: "Words",
        statLines: "Lines",
        statParagraphs: "Paragraphs"
    },
    ja: {
        settingsHeader: "フォーカスモード設定",
        languageName: "言語",
        languageDesc: "設定画面の言語を選択します",
        focusFolderPathsName: "有効にするフォルダ",
        focusFolderPathsDesc: "フォーカスモードを自動的に有効にするフォルダ（1行に1つ）",
        visualEffectsHeader: "視覚効果",
        focusStyleName: "フォーカススタイル",
        focusStyleDesc: "指定したフォーカスタイプ以外のテキストが薄く表示されます",
        focusStyleNone: "なし",
        focusStyleParagraph: "段落フォーカス",
        focusStyleSentence: "文フォーカス",
        focusStyleActiveLine: "アクティブ行フォーカス",
        hideFrontmatterName: "フロントマターを隠す",
        hideFrontmatterDesc: "フォーカスモード中にYAMLフロントマターを隠します",
        scrollUiHeader: "スクロールとUI",
        typewriterScrollName: "タイプライタースクロール",
        typewriterScrollDesc: "カーソルが位置している行を自動的に画面中央部に移動します",
        typewriterOffsetName: "タイプライターオフセット",
        typewriterOffsetDesc: "画面中央部に表示する行の垂直位置（0%=上部、50%=中央、100%=下部）",
        typewriterScrollSpeedName: "タイプライタースクロール速度",
        typewriterScrollSpeedDesc: "スクロールアニメーションの速度（ミリ秒）",
        zenUiName: "Zen UI",
        zenUiDesc: "サイドバーやその他のUI要素を隠します",
        statisticsDisplayHeader: "統計表示",
        showStatisticsName: "統計を表示",
        showStatisticsDesc: "右下に執筆統計を表示します",
        statisticsToDisplayName: "表示する統計",
        statisticsToDisplayDesc: "表示する統計を選択します",
        statCharacters: "文字数（スペース含む）",
        statCharactersNoSpaces: "文字数（スペース除く）",
        statWords: "単語数",
        statLines: "行数",
        statParagraphs: "段落数"
    }
};
