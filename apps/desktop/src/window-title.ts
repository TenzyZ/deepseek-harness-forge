/** Native Desktop window title ownership. */

/** Electron window operations required to keep one native title. */
export interface DesktopWindowTitleTarget {
  setTitle(title: string): void
  on(
    event: 'page-title-updated',
    listener: (event: { preventDefault(): void }, title: string, explicitSet: boolean) => void,
  ): unknown
}

/**
 * Set a native window title and prevent renderer pages from replacing it.
 * @param target - Electron window receiving the title policy.
 * @param title - Native title retained for the lifetime of the window.
 * @returns Nothing.
 */
export function setDesktopWindowTitle(target: DesktopWindowTitleTarget, title: string): void {
  target.setTitle(title)
  target.on('page-title-updated', (event) => { event.preventDefault() })
}
