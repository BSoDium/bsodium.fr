/** Whether the visitor's keyboard has a Command key (the shortcut hint says "⌘K" there and "Ctrl K" elsewhere). Browser only: call it in an effect, never during render. */
export const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
