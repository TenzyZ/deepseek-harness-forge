/** DSH Forge attribution occupant for the generic conversation hero slot. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ForgeAttribution } from './Attribution.tsx'
import { en, zh, type BrandForgeKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The DSH Forge hero attribution copy. */
    brandForge: BrandForgeKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'brandForge'

/** Required services: the UI slot registry and the copy dictionaries. */
export const inject = ['slots', 'locale']

/**
 * Fill the hero attribution slot. The nested `ctx.slots.inject` waits on the
 * conversation declaration, so the occupant installs whether this row
 * activates before or after the declarer and withdraws when it collapses.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-brand-forge: dictionaries')
  ctx.slots.inject('conversation.hero.attribution', () => ctx.slots.register({
    name: 'conversation.hero.attribution',
    locale: NS,
  }, ForgeAttribution))
}
