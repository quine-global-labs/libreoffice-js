/**
 * SfxDispatcher — routes UNO commands (".uno:Bold") to the shells on the
 * shell stack (sfx2/source/control/dispatch.cxx). Each SfxShell exposes a
 * slot map (the SFX_IMPL_INTERFACE / .sdi slot tables upstream); the first
 * shell from the top that has the slot handles both Execute and GetState.
 * Commands no shell implements report as disabled, which is how the menus
 * show not-yet-implemented features.
 */
import { createContext, useContext } from "react";

export type SfxArgs = Record<string, unknown>;

export interface SfxItemState {
  enabled: boolean;
  /** Toggle state for checkable commands. */
  checked?: boolean;
  /** Current value for controls (style name, font, size, …). */
  value?: unknown;
}

export interface SfxSlot {
  exec: (args?: SfxArgs) => unknown;
  state?: () => Partial<SfxItemState>;
}

export interface SfxShell {
  readonly name: string;
  readonly slots: Readonly<Record<string, SfxSlot>>;
}

export class SfxDispatcher {
  /** `shells[0]` is the top of the stack. */
  constructor(
    private readonly shells: readonly SfxShell[],
    private readonly onError: (command: string, error: unknown) => void = (c, e) =>
      console.error(`[sfx2] ${c} failed`, e),
  ) {}

  private slot(command: string): SfxSlot | undefined {
    for (const shell of this.shells) {
      const slot = shell.slots[command];
      if (slot) return slot;
    }
    return undefined;
  }

  queryState(command: string): SfxItemState {
    const slot = this.slot(command);
    if (!slot) return { enabled: false };
    return { enabled: true, ...slot.state?.() };
  }

  /** Executes a command; returns false if it is unknown or disabled. */
  execute(command: string, args?: SfxArgs): boolean {
    const slot = this.slot(command);
    if (!slot || !this.queryState(command).enabled) return false;
    try {
      const result = slot.exec(args);
      if (result instanceof Promise) result.catch((e) => this.onError(command, e));
    } catch (e) {
      this.onError(command, e);
    }
    return true;
  }
}

export const SfxDispatcherContext = createContext<SfxDispatcher>(new SfxDispatcher([]));

export function useDispatcher(): SfxDispatcher {
  return useContext(SfxDispatcherContext);
}
