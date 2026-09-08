import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './Attribution.module.css'

/** Owner state plus this feature's locale seat. */
export type ForgeAttributionProps =
  PropsRuntime<'conversation.hero.attribution'> & PropsLocale<'brandForge'>

/**
 * Render the deployment's own three-line identity under the hero headline.
 * @param props - the hero attribution slot's owner props and locale seat.
 * @returns the attribution element.
 */
export function ForgeAttribution({ t }: ForgeAttributionProps): ReactNode {
  return (
    <div className={css.root}>
      <span className={css.product}>{t('attribution.product')}</span>
      <span>{t('attribution.author')}</span>
      <span>{t('attribution.upstream')}</span>
    </div>
  )
}
