/**
 * `brandForge` namespace dictionaries.
 *
 * The three lines are one attribution: the product name, its author, and the
 * truthful upstream relationship. `attribution.upstream` names DeepSeek
 * Harness as the software this product is built on, never as the author's
 * work, so the author line must stay separate from it in every locale.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'attribution.product': 'DSH Forge',
  'attribution.author': '作者 Tenzy',
  'attribution.upstream': '基于 DeepSeek Harness 构建',
} as const

/** One dictionary key of the `brandForge` namespace. */
export type BrandForgeKey = keyof typeof zh

/** English dictionary. */
export const en = {
  'attribution.product': 'DSH Forge',
  'attribution.author': 'by Tenzy',
  'attribution.upstream': 'Built on DeepSeek Harness',
} satisfies Record<BrandForgeKey, string>
