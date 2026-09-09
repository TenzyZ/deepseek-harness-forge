/** Schema-owned pi-ai reasoning choices and validation for model drafts. */
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { modelDrafts, validateDeepSeekModels } from './DeepSeekModelsEditor.tsx'
import type { SettingsSchemaOperations } from './schema-operations.ts'
import { PROBE_ROUTE } from './store.ts'
import type { ModelsKey } from './locales.ts'

/**
 * The thinking levels a pi-ai model may declare, read out of the owning
 * namespace's own schema so the offered levels cannot drift from the ones the
 * adapter accepts. `nodeAtPath` resolves a dict to its value schema, which
 * leaves a `reasoningEfforts` key union unreachable; the route-level
 * `reasoning` union is the reachable spelling of the same canonical set.
 * @param namespace - the namespace view whose schema declares the profile shape.
 * @param schema - settings schema operations.
 * @returns the accepted levels, or an empty list when the schema has none.
 */
export function reasoningChoices(namespace: SettingsNamespaceView | undefined, schema: SettingsSchemaOperations): string[] {
  if (namespace === undefined) return []
  const node = schema.nodeAtPath(schema.rehydrate(namespace.schema), ['providers', PROBE_ROUTE, 'reasoning'])
  const union = (node as { type?: string; list?: readonly { value?: unknown }[] } | undefined)
  if (union?.type !== 'union' || union.list === undefined) return []
  return union.list.map(entry => entry.value).filter((value): value is string => typeof value === 'string')
}

/**
 * Validate model rows including constraints not expressed by the pi-ai schema.
 * @param value - drafted model array.
 * @returns the first invalid row and its localized message key.
 */
export function validatePiAiModels(value: unknown): { index: number; key: ModelsKey } | undefined {
  const failure = validateDeepSeekModels(value)
  if (failure !== undefined) return failure
  for (const [index, model] of modelDrafts(value).entries()) {
    const efforts = model['reasoningEfforts']
    if (efforts === undefined || efforts === false) continue
    if (typeof efforts !== 'object' || efforts === null || Array.isArray(efforts)
      || !Object.keys(efforts).some(level => level !== 'off')
      || Object.entries(efforts).some(([level, wire]) => !(level === 'off' && wire === null)
        && (typeof wire !== 'string' || wire.length === 0))) {
      return { index, key: 'modelReasoningInvalid' }
    }
  }
  return undefined
}
