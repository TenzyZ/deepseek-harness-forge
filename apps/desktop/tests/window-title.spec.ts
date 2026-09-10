import { describe, expect, it, vi } from 'vitest'
import { en } from '../src/locale.ts'
import { setDesktopWindowTitle, type DesktopWindowTitleTarget } from '../src/window-title.ts'

describe('desktop native window title', () => {
  it('sets the DSH Forge title and blocks renderer title changes', () => {
    let pageTitleUpdated: Parameters<DesktopWindowTitleTarget['on']>[1] | undefined
    const setTitle = vi.fn()
    const target = {
      setTitle,
      on: vi.fn((
        _event: 'page-title-updated',
        listener: Parameters<DesktopWindowTitleTarget['on']>[1],
      ) => { pageTitleUpdated = listener }),
    } satisfies DesktopWindowTitleTarget

    setDesktopWindowTitle(target, en.mainWindowTitle)
    expect(setTitle).toHaveBeenCalledWith('DSH Forge')

    const preventDefault = vi.fn()
    pageTitleUpdated?.({ preventDefault }, 'Renderer title', true)
    expect(preventDefault).toHaveBeenCalledOnce()
  })
})
