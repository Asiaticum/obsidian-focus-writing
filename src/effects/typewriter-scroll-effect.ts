import { WorkspaceLeaf, ItemView } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { IFocusEffect } from "./i-focus-effect";

// Track drag state for each editor view
interface DragState {
    isDragging: boolean;
    hasPendingScroll: boolean;
    autoScrollInterval: number | null;
}

// WeakMap to store drag state per editor instance
const dragStateMap = new WeakMap<EditorView, DragState>();

// Get or create drag state for an editor view
function getDragState(view: EditorView): DragState {
    let state = dragStateMap.get(view);
    if (!state) {
        state = { isDragging: false, hasPendingScroll: false, autoScrollInterval: null };
        dragStateMap.set(view, state);
    }
    return state;
}

// Auto-scroll when dragging near edges
function startAutoScroll(view: EditorView, dragState: DragState): void {
    if (dragState.autoScrollInterval !== null) {
        return; // Already scrolling
    }

    let lastMouseY = 0;
    const EDGE_THRESHOLD = 80; // pixels from edge to start scrolling (increased)
    const MAX_SCROLL_SPEED = 20; // maximum pixels per frame (increased)
    const MIN_SCROLL_SPEED = 3; // minimum speed when at threshold edge

    const handleMouseMove = (e: MouseEvent) => {
        lastMouseY = e.clientY;
    };

    const scrollInterval = window.setInterval(() => {
        if (!dragState.isDragging) {
            stopAutoScroll(view, dragState);
            return;
        }

        const scrollRect = view.scrollDOM.getBoundingClientRect();
        const distanceFromTop = lastMouseY - scrollRect.top;
        const distanceFromBottom = scrollRect.bottom - lastMouseY;

        let scrollAmount = 0;

        if (distanceFromTop < EDGE_THRESHOLD && distanceFromTop > 0) {
            // Near top edge, scroll up
            const intensity = 1 - (distanceFromTop / EDGE_THRESHOLD);
            scrollAmount = -(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * intensity);
        } else if (distanceFromBottom < EDGE_THRESHOLD && distanceFromBottom > 0) {
            // Near bottom edge, scroll down
            const intensity = 1 - (distanceFromBottom / EDGE_THRESHOLD);
            scrollAmount = MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * intensity;
        }

        if (scrollAmount !== 0) {
            view.scrollDOM.scrollBy({
                top: scrollAmount,
                behavior: 'auto' // Use 'auto' for smooth continuous scrolling
            });
        }
    }, 16); // ~60fps

    document.addEventListener('mousemove', handleMouseMove);
    dragState.autoScrollInterval = scrollInterval;

    // Store the mousemove handler for cleanup
    (dragState as any).autoScrollMouseMove = handleMouseMove;
}

function stopAutoScroll(view: EditorView, dragState: DragState): void {
    if (dragState.autoScrollInterval !== null) {
        clearInterval(dragState.autoScrollInterval);
        dragState.autoScrollInterval = null;

        const handleMouseMove = (dragState as any).autoScrollMouseMove;
        if (handleMouseMove) {
            document.removeEventListener('mousemove', handleMouseMove);
            delete (dragState as any).autoScrollMouseMove;
        }
    }
}

// Perform the actual scroll to center cursor
function performTypewriterScroll(view: EditorView, offsetPercent: number): void {
    // Get cursor position
    const cursorPos = view.state.selection.main.head;
    const cursorCoords = view.coordsAtPos(cursorPos);

    if (!cursorCoords) {
        console.log("[TypewriterScroll Extension] No cursor coords");
        return;
    }

    // Get viewport dimensions
    const viewportHeight = view.scrollDOM.clientHeight;
    const scrollTop = view.scrollDOM.scrollTop;

    // Calculate where cursor currently is relative to viewport top
    const cursorRelativeToViewport = cursorCoords.top - view.scrollDOM.getBoundingClientRect().top;

    // Calculate where we want the cursor to be (offset% from top)
    const targetPosition = viewportHeight * (offsetPercent / 100);

    // Calculate scroll adjustment needed
    const scrollAdjustment = cursorRelativeToViewport - targetPosition;

    console.log("[TypewriterScroll Extension] Scrolling - cursorY:", cursorRelativeToViewport,
        "target:", targetPosition, "adjustment:", scrollAdjustment);

    // Apply smooth scroll with animation
    if (Math.abs(scrollAdjustment) > 1) {
        const newScrollTop = scrollTop + scrollAdjustment;
        view.scrollDOM.scrollTo({
            top: newScrollTop,
            behavior: 'smooth'
        });
    }
}

// Store event listener references for cleanup
const eventListenersMap = new WeakMap<EditorView, {
    mousedown: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
}>();

// Map contentEl to EditorView for cleanup purposes
const contentElToViewMap = new WeakMap<HTMLElement, EditorView>();

// Setup mouse event listeners for drag detection
function setupMouseEventListeners(view: EditorView, contentEl: HTMLElement): void {
    // Skip if already setup
    if (eventListenersMap.has(view)) {
        return;
    }

    // Store mapping for cleanup
    contentElToViewMap.set(contentEl, view);

    const dragState = getDragState(view);

    const handleMouseDown = (e: MouseEvent) => {
        // Only track left button drag (button 0)
        if (e.button === 0) {
            console.log("[TypewriterScroll] Mouse down - drag started");
            dragState.isDragging = true;
            // Start auto-scroll for edge detection
            startAutoScroll(view, dragState);
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (dragState.isDragging) {
            console.log("[TypewriterScroll] Mouse up - drag ended, hasPendingScroll:", dragState.hasPendingScroll);
            dragState.isDragging = false;

            // Stop auto-scroll
            stopAutoScroll(view, dragState);

            // Execute pending scroll if needed
            if (dragState.hasPendingScroll) {
                dragState.hasPendingScroll = false;
                const offsetPercent = parseInt(contentEl.dataset.typewriterOffset || "50", 10);
                performTypewriterScroll(view, offsetPercent);
            }
        }
    };

    // Add listeners
    // Use capturing phase for mousedown to catch it before CodeMirror processes it
    view.contentDOM.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp);

    // Store references for cleanup
    eventListenersMap.set(view, {
        mousedown: handleMouseDown,
        mouseup: handleMouseUp
    });

    console.log("[TypewriterScroll] Event listeners setup complete");
}

// Cleanup mouse event listeners
function cleanupMouseEventListeners(view: EditorView): void {
    const listeners = eventListenersMap.get(view);
    if (listeners) {
        // Stop any ongoing auto-scroll
        const dragState = dragStateMap.get(view);
        if (dragState) {
            stopAutoScroll(view, dragState);
        }

        // Remove with capturing phase flag to match how it was added
        view.contentDOM.removeEventListener("mousedown", listeners.mousedown, true);
        document.removeEventListener("mouseup", listeners.mouseup);
        eventListenersMap.delete(view);
        console.log("[TypewriterScroll] Event listeners cleaned up");
    }
}

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

        // Cleanup event listeners
        const view = contentElToViewMap.get(contentEl);
        if (view) {
            cleanupMouseEventListeners(view);
            contentElToViewMap.delete(contentEl);
        }

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

        // Setup mouse event listeners (only once per view)
        setupMouseEventListeners(update.view, contentEl);

        // Only scroll on selection changes (cursor movement, typing)
        if (!update.selectionSet && !update.docChanged) return;

        const dragState = getDragState(update.view);

        // If currently dragging, mark that we have a pending scroll but don't execute
        if (dragState.isDragging) {
            console.log("[TypewriterScroll Extension] Dragging detected - deferring scroll");
            dragState.hasPendingScroll = true;
            return;
        }

        // Not dragging, execute scroll immediately
        const offsetPercent = parseInt(contentEl.dataset.typewriterOffset || "50", 10);
        performTypewriterScroll(update.view, offsetPercent);
    });
}
