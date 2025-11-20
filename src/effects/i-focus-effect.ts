import { WorkspaceLeaf } from "obsidian";

export interface IFocusEffect {
    enable(leaf: WorkspaceLeaf): void;
    disable(leaf: WorkspaceLeaf): void;
    update(leaf: WorkspaceLeaf): void;
}
