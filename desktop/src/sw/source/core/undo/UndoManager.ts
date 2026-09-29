/**
 * Undo/redo — counterpart of sw/source/core/undo/UndoManager.cxx.
 * Upstream records inverse actions (SwUndo subclasses); since SwDoc is
 * immutable here, an undo step is simply the state before the action.
 * Consecutive typing is grouped into one step, like SwUndoInsert merging.
 */
import type { SwDoc } from "../../../inc/doc";
import type { SwPaM } from "../../../inc/pam";

export interface SwUndoState {
  readonly doc: SwDoc;
  readonly pam: SwPaM;
}

/** Matches the default "Number of steps" in Tools > Options > Memory. */
const UNDO_LIMIT = 100;

export class SwUndoManager {
  private undoStack: { state: SwUndoState; comment: string }[] = [];
  private redoStack: { state: SwUndoState; comment: string }[] = [];
  private groupKind: string | null = null;

  /**
   * Records `before` as an undo step. When `groupKind` is given and matches
   * the previous action, the step is merged into it instead.
   */
  record(before: SwUndoState, comment: string, groupKind?: string): void {
    this.redoStack = [];
    if (groupKind && groupKind === this.groupKind) return;
    this.groupKind = groupKind ?? null;
    this.undoStack.push({ state: before, comment });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
  }

  /** Ends the current typing group (cursor moved, formatting changed, …). */
  breakGroup(): void {
    this.groupKind = null;
  }

  undo(current: SwUndoState): SwUndoState | null {
    const step = this.undoStack.pop();
    if (!step) return null;
    this.groupKind = null;
    this.redoStack.push({ state: current, comment: step.comment });
    return step.state;
  }

  redo(current: SwUndoState): SwUndoState | null {
    const step = this.redoStack.pop();
    if (!step) return null;
    this.groupKind = null;
    this.undoStack.push({ state: current, comment: step.comment });
    return step.state;
  }

  get undoComment(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.comment;
  }

  get redoComment(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.comment;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.groupKind = null;
  }
}
