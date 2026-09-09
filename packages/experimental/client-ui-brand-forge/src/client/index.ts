/** DSH Forge occupants for the conversation hero attribution and sidebar brand slots. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
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

/** Owner state plus this feature's locale seat. */
export type ForgeBrandNameProps =
  PropsRuntime<'sidebar.brand.name'> & PropsLocale<'brandForge'>

/**
 * Render the deployment's brand name in the sidebar.
 * @param props - the sidebar brand-name slot's owner props and locale seat.
 * @returns the product brand name.
 */
export function ForgeBrandName(props: ForgeBrandNameProps): string {
  return props.t('attribution.product')
}

/**
 * Fill the hero attribution and sidebar brand-name slots. The nested
 * `ctx.slots.inject` waits on the declarations, so occupants install whether
 * this row activates before or after the declarers and withdraw when they collapse.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-brand-forge: dictionaries')
  ctx.slots.inject('conversation.hero.attribution', () => ctx.slots.register({
    name: 'conversation.hero.attribution',
    locale: NS,
  }, ForgeAttribution))
  ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({
    name: 'sidebar.brand.name',
    locale: NS,
  }, ForgeBrandName))
}
