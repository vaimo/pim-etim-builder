import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** The element right of the open step's heading that its actions render into. */
export const StepActionsSlot = createContext<HTMLElement | null>(null);

/** Buttons for the whole step, shown right of the step heading. Renders nothing where it is placed. */
export function StepActions({ children }: { children: ReactNode }) {
  const slot = useContext(StepActionsSlot);
  return slot ? createPortal(children, slot) : null;
}
