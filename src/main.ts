import { Plugin, WorkspaceLeaf } from "obsidian";
import { FocusModeSettings, DEFAULT_SETTINGS, FocusModeSettingTab } from "./settings";
import { FocusController } from "./focus-controller";
import { ContextObserver } from "./context-observer";
import { ZenUiEffect } from "./effects/zen-ui-effect";
import { ParagraphDimmerEffect } from "./effects/paragraph-dimmer-effect";
import { FrontmatterHidingEffect } from "./effects/frontmatter-hiding-effect";
import { TypewriterScrollEffect } from "./effects/typewriter-scroll-effect";
import { ChromeHidingEffect } from "./effects/chrome-hiding-effect";
import { SentenceFocusEffect } from "./effects/sentence-focus-effect";
import { ActiveLineFocusEffect } from "./effects/active-line-focus-effect";

export default class FocusModePlugin extends Plugin {
    settings: FocusModeSettings;
    controller: FocusController;
    observer: ContextObserver;

    async onload() {
        await this.loadSettings();

        // Initialize Controller
        this.controller = new FocusController();

        // Initialize Effects
        // ... imports

        const zenUiEffect = new ZenUiEffect(this.app, this);
        const paragraphDimmerEffect = new ParagraphDimmerEffect(this);
        const frontmatterHidingEffect = new FrontmatterHidingEffect(this);
        const typewriterScrollEffect = new TypewriterScrollEffect(this);
        const chromeHidingEffect = new ChromeHidingEffect(this.app, this);
        const sentenceFocusEffect = new SentenceFocusEffect(this);
        const activeLineFocusEffect = new ActiveLineFocusEffect(this);

        this.controller.addEffect(zenUiEffect);
        this.controller.addEffect(paragraphDimmerEffect);
        this.controller.addEffect(frontmatterHidingEffect);
        this.controller.addEffect(typewriterScrollEffect);
        this.controller.addEffect(chromeHidingEffect);
        this.controller.addEffect(sentenceFocusEffect);
        this.controller.addEffect(activeLineFocusEffect);

        // Register CM6 Extensions
        console.log("[Main] Registering CM6 Extensions");
        console.log("[Main] ParagraphDimmerEffect.extension:", ParagraphDimmerEffect.extension);
        this.registerEditorExtension(ParagraphDimmerEffect.extension);
        console.log("[Main] TypewriterScrollEffect.extension:", TypewriterScrollEffect.extension);
        this.registerEditorExtension(TypewriterScrollEffect.extension);
        console.log("[Main] SentenceFocusEffect.extension:", SentenceFocusEffect.extension);
        this.registerEditorExtension(SentenceFocusEffect.extension);
        console.log("[Main] ActiveLineFocusEffect.extension:", ActiveLineFocusEffect.extension);
        this.registerEditorExtension(ActiveLineFocusEffect.extension);

        // Initialize Observer
        this.observer = new ContextObserver(this.app, this.controller, this.settings);

        // Register Event Listeners
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf | null) => {
                this.observer.onActiveLeafChange(leaf);
            })
        );

        // Add Command for Manual Toggle
        this.addCommand({
            id: "toggle-focus-mode",
            name: "Toggle Focus Mode",
            callback: () => {
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) {
                    this.controller.toggle(leaf);
                }
            },
        });

        // Add Commands for Individual Toggles
        this.addCommand({
            id: "toggle-paragraph-focus",
            name: "Toggle Paragraph Focus",
            callback: async () => {
                this.settings.visualEffect = this.settings.visualEffect === "paragraph" ? "none" : "paragraph";
                await this.saveSettings();
                // We need to trigger an update on the controller or active leaf
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) this.controller.update(leaf);
            }
        });

        this.addCommand({
            id: "toggle-sentence-focus",
            name: "Toggle Sentence Focus",
            callback: async () => {
                this.settings.visualEffect = this.settings.visualEffect === "sentence" ? "none" : "sentence";
                await this.saveSettings();
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) this.controller.update(leaf);
            }
        });

        this.addCommand({
            id: "toggle-typewriter-scroll",
            name: "Toggle Typewriter Scroll",
            callback: async () => {
                this.settings.enableTypewriterScroll = !this.settings.enableTypewriterScroll;
                await this.saveSettings();
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) this.controller.update(leaf);
            }
        });

        this.addCommand({
            id: "toggle-frontmatter-hiding",
            name: "Toggle Frontmatter Hiding",
            callback: async () => {
                this.settings.enableFrontmatterHiding = !this.settings.enableFrontmatterHiding;
                await this.saveSettings();
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) this.controller.update(leaf);
            }
        });

        this.addCommand({
            id: "toggle-zen-ui",
            name: "Toggle Zen UI",
            callback: async () => {
                this.settings.enableZenUi = !this.settings.enableZenUi;
                await this.saveSettings();
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) this.controller.update(leaf);
            }
        });

        this.addCommand({
            id: "toggle-active-line-focus",
            name: "Toggle Active Line Focus",
            callback: async () => {
                this.settings.visualEffect = this.settings.visualEffect === "active-line" ? "none" : "active-line";
                await this.saveSettings();
                const leaf = this.app.workspace.getLeaf(false);
                if (leaf) this.controller.update(leaf);
            }
        });

        // Add Settings Tab
        this.addSettingTab(new FocusModeSettingTab(this.app, this));
    }

    onunload() {
        // Ensure we restore state when plugin is disabled
        // We can try to get the active leaf, but it might be tricky if unloading.
        // At least we should restore global UI state.
        // The controller.deactivate requires a leaf for some effects, but ZenUiEffect stores state internally.
        // We might need a 'teardown' method on effects.

        // For MVP, let's try to deactivate on the current active leaf if possible.
        const activeLeaf = this.app.workspace.getActiveViewOfType(Object as any)?.leaf; // simplified
        if (activeLeaf) {
            this.controller.deactivate(activeLeaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update observer with new settings
        if (this.observer) {
            this.observer.updateSettings(this.settings);
        }
        // Trigger a check immediately to apply new settings to current leaf
        const activeLeaf = this.app.workspace.getLeaf(false); // Get active leaf
        if (activeLeaf) {
            this.observer.onActiveLeafChange(activeLeaf);
        }
    }
}
