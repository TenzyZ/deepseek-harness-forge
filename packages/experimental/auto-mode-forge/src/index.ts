/**
 * DSH Forge Auto Mode approval policy. The plugin asks through the existing
 * tool pipeline for a narrow set of consequential PowerShell commands while
 * the effective permission preset is `workspace-write`.
 *
 * @module @deepseek-ai/dsh-experimental-auto-mode-forge
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-permission-presets'

export const name = 'auto-mode-forge'
export const inject = ['permissionPresets']

/** A Forge Auto Mode decision before the normal tool policy continues. */
export type AutoModeDecision =
  | { kind: 'allow' }
  | { kind: 'ask'; reason: string }

const ASK_DESTRUCTIVE_FILES = 'Auto Mode requires approval for destructive filesystem commands.'
const ASK_DESTRUCTIVE_GIT = 'Auto Mode requires approval for destructive Git commands.'
const ASK_EXTERNAL_GIT = 'Auto Mode requires approval for external Git operations.'
const ASK_PACKAGE_PUBLISH = 'Auto Mode requires approval for package publication.'
const ASK_SYSTEM_MUTATION = 'Auto Mode requires approval for system-level mutation.'

/** Split direct PowerShell statements without treating quoted separators or comments as commands. */
function statements(command: string): string[] {
  const result: string[] = []
  let start = 0
  let quote: "'" | '"' | undefined
  let comment = false
  for (let index = 0; index < command.length; index += 1) {
    const char = command.charAt(index)
    if (comment) {
      if (char !== '\n') continue
      comment = false
    } else if (quote !== undefined) {
      // A doubled '' inside single quotes needs no special case: quote characters
      // are never separators, so closing and reopening leaves the same inside or
      // outside state at every separator this loop tests.
      if (quote === '"' && char === '`') index += 1
      else if (char === quote) quote = undefined
      continue
    } else if (char === "'" || char === '"') {
      quote = char
      continue
    } else if (char === '#') {
      comment = true
      continue
    }
    if (';\r\n|&{}'.includes(char)) {
      result.push(command.slice(start, index))
      start = index + 1
    }
  }
  result.push(command.slice(start))
  return result
}

/** Classify one direct PowerShell statement when its command name is unambiguous. */
function classifyStatement(statement: string): AutoModeDecision {
  const direct = statement.trim()
  const git = /^(?:git(?:\.exe)?)\s+(\S+)([\s\S]*)$/iu.exec(direct)
  if (git !== null) {
    const [, operation = '', args = ''] = git
    if (operation.toLowerCase() === 'push') return { kind: 'ask', reason: ASK_EXTERNAL_GIT }
    if (operation.toLowerCase() === 'reset' && /(?:^|\s)--hard(?:\s|$)/u.test(args)) {
      return { kind: 'ask', reason: ASK_DESTRUCTIVE_GIT }
    }
    if (operation.toLowerCase() === 'clean' && /(?:^|\s)(?:--force|-[a-z]*f[a-z]*)(?:\s|$)/u.test(args)) {
      return { kind: 'ask', reason: ASK_DESTRUCTIVE_GIT }
    }
    if (operation.toLowerCase() === 'branch' && /(?:^|\s)-D(?:\s|$)/u.test(args)) {
      return { kind: 'ask', reason: ASK_DESTRUCTIVE_GIT }
    }
  }

  const removeItem = /^remove-item\b([\s\S]*)$/iu.exec(direct)?.[1]
  if (removeItem !== undefined
    && /(?:^|\s)-recurse(?:\s|$)/iu.test(removeItem)
    && /(?:^|\s)-force(?:\s|$)/iu.test(removeItem)) {
    return { kind: 'ask', reason: ASK_DESTRUCTIVE_FILES }
  }
  const removeTree = /^(?:cmd(?:\.exe)?\s+\/[cd]\s+)?(?:rd|rmdir)\b([\s\S]*)$/iu.exec(direct)?.[1]
  if (removeTree !== undefined
    && /(?:^|\s)\/s(?:\s|$)/iu.test(removeTree)
    && /(?:^|\s)\/q(?:\s|$)/iu.test(removeTree)) {
    return { kind: 'ask', reason: ASK_DESTRUCTIVE_FILES }
  }

  if (/^(?:npm(?:\.cmd)?|pnpm(?:\.cmd)?|yarn(?:\.cmd)?)\s+publish(?:\s|$)/iu.test(direct)) {
    return { kind: 'ask', reason: ASK_PACKAGE_PUBLISH }
  }
  if (/^(?:stop-computer|restart-computer|format-volume|clear-disk|initialize-disk)(?:\s|$)/iu.test(direct)) {
    return { kind: 'ask', reason: ASK_SYSTEM_MUTATION }
  }
  const shutdown = /^shutdown(?:\.exe)?\b([\s\S]*)$/iu.exec(direct)?.[1]
  if (shutdown !== undefined && /(?:^|\s)\/(?:s|r|g)(?:\s|$)/iu.test(shutdown)) {
    return { kind: 'ask', reason: ASK_SYSTEM_MUTATION }
  }
  return { kind: 'allow' }
}

/**
 * Classify a parsed tool execution for the Forge Auto Mode risk policy.
 * Unknown tools, malformed arguments, and unrecognized syntax delegate to the
 * normal DSH policy.
 * @param exec - the pending tool name and its parsed arguments.
 * @returns `ask` for a recognized consequential PowerShell command; otherwise `allow`.
 */
export function classifyAutoModeCall(
  exec: Pick<ToolExecution, 'name' | 'arguments'>,
): AutoModeDecision {
  if (exec.name !== 'pwsh' || typeof exec.arguments !== 'object' || exec.arguments === null) {
    return { kind: 'allow' }
  }
  const command = (exec.arguments as Record<string, unknown>)['command']
  if (typeof command !== 'string') return { kind: 'allow' }
  for (const statement of statements(command)) {
    const decision = classifyStatement(statement)
    if (decision.kind === 'ask') return decision
  }
  return { kind: 'allow' }
}

/** Install the Forge-only pre-execution listener. */
export function apply(ctx: Context): void {
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    if (exec.agent === undefined
      || ctx.permissionPresets.current(exec.agent.session) !== 'workspace-write') {
      return next()
    }
    const decision = classifyAutoModeCall(exec)
    return decision.kind === 'ask' ? decision : next()
  })
}
