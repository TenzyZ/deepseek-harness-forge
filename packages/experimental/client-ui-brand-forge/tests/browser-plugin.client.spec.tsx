// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { ForgeAttribution, type ForgeAttributionProps } from '../src/client/Attribution.tsx'
import { en, zh } from '../src/client/locales.ts'
import { apply as hostApply } from '../src/index.ts'

afterEach(cleanup)

const HOLE = 'conversation.hero.attribution'

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  // jsdom reports no browser language here, so state the asserted locale.
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('en')
  ctx.provide('locale', locale)
  const slots = ctx.get('slots') as SlotRegistry
  const declareHole = () => slots.register({
    name: 'root',
    children: { [HOLE]: { kind: 'single', scope: 'root' } },
  } as never, () => null)
  const disposeHole = declare ? declareHole() : undefined
  return { ctx, slots, locale, declareHole, disposeHole }
}

describe('DSH Forge attribution plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers its dictionaries and fills the hero attribution slot', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const t = subject.locale.bind('brandForge')
    expect(t('attribution.product')).toBe('DSH Forge')
    expect(t('attribution.author')).toBe('by Tenzy')
    expect(t('attribution.upstream')).toBe('Built on DeepSeek Harness')
    expect(subject.slots.entries(HOLE)).toHaveLength(1)

    await fiber.dispose()
    expect(subject.slots.entries(HOLE)).toHaveLength(0)
  })

  it('carries the locale seat on its registration', async () => {
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    expect(subject.slots.entries(HOLE)[0]?.locale).toBe('brandForge')
  })

  it('fills the declaration whether it lands before or after apply', async () => {
    const before = await bench()
    await before.ctx.plugin({ inject: [...inject], apply }).await()
    before.disposeHole?.()
    expect(before.slots.entries(HOLE)).toHaveLength(0)
    before.declareHole()
    await Promise.resolve()
    expect(before.slots.entries(HOLE)).toHaveLength(1)

    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    expect(after.slots.entries(HOLE)).toHaveLength(0)
    after.declareHole()
    await Promise.resolve()
    expect(after.slots.entries(HOLE)).toHaveLength(1)
  })

  it('renders the exact three attribution lines', () => {
    // Only the locale seat reaches this component; the standard props the
    // renderer also supplies are unused here.
    const t = ((key: keyof typeof en) => en[key]) as ForgeAttributionProps['t']
    const view = render(<ForgeAttribution {...({ t } as ForgeAttributionProps)} />)
    expect(view.getByText('DSH Forge')).toBeTruthy()
    expect(view.getByText('by Tenzy')).toBeTruthy()
    expect(view.getByText('Built on DeepSeek Harness')).toBeTruthy()
    expect(view.container.textContent).toBe('DSH Forgeby TenzyBuilt on DeepSeek Harness')
  })

  it('never attributes DeepSeek Harness itself to the author', () => {
    // "by Tenzy" names the author of DSH Forge; the upstream line stays a
    // separate, purely descriptive statement in every locale.
    for (const dictionary of [en, zh]) {
      expect(dictionary['attribution.author']).not.toMatch(/DeepSeek|Harness/)
      expect(dictionary['attribution.upstream']).not.toMatch(/Tenzy/)
      expect(dictionary['attribution.product']).toBe('DSH Forge')
    }
    expect(JSON.stringify({ en, zh })).not.toMatch(/TenzyZxy/)
  })
})
