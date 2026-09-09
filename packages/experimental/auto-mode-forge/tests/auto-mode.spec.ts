import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import PermissionPresetService from '@deepseek-ai/dsh-permission-presets'
import SessionStore, { Session, SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { ShellExecutor } from '@deepseek-ai/dsh-shell'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineTool, type ToolExecution } from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import * as AutoModeForge from '../src/index.ts'
import { classifyAutoModeCall } from '../src/index.ts'

const contexts: Context[] = []
const roots: string[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

const decision = (command: string, name = 'pwsh') => classifyAutoModeCall({
  name,
  arguments: { command },
})

function agent(id: string): NonNullable<ToolExecution['agent']> {
  const session = Session.create(SessionId(id))
  session.append('turn/start', { turn: 1 })
  return { session } as unknown as NonNullable<ToolExecution['agent']>
}

async function loadComposition() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-auto-mode-forge-'))
  roots.push(root)
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-session'",
    "- name: '@deepseek-ai/dsh-session-projection'",
    '- name: test-shell',
    "- name: '@deepseek-ai/dsh-user-approval'",
    "- name: '@deepseek-ai/dsh-permission-presets'",
    '  config:',
    '    presets:',
    '      read-only: { sandbox: read-only, approval: ask }',
    '      workspace-write: { sandbox: workspace-write, approval: ask }',
    '      danger-full-access: { sandbox: danger-full-access, approval: never }',
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-experimental-auto-mode-forge'",
    '- name: test-tools',
    '',
  ].join('\n'))

  const executions: string[] = []
  const shell = {
    sandboxMode: 'workspace-write' as const,
    resolve() { throw new Error('test shell does not execute') },
    run() { throw new Error('test shell does not execute') },
    start() { throw new Error('test shell does not execute') },
  } as unknown as ShellExecutor
  const shellPlugin = { apply(ctx: Context) { ctx.provide('shell', shell) } }
  const tool = (name: string, parameters: Record<string, { type: 'string'; required?: true }>) => defineTool({
    name,
    description: `test ${name}`,
    parameters,
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text' as const, text: value }] },
    async execute() {
      executions.push(name)
      return 'executed'
    },
  })
  const toolsPlugin = {
    inject: ['tools'],
    apply(ctx: Context) {
      ctx.tools.register(tool('pwsh', { command: { type: 'string', required: true } }))
      ctx.tools.register(tool('write', { path: { type: 'string', required: true } }))
    },
  }
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-session', SessionStore],
    ['@deepseek-ai/dsh-session-projection', SessionProjectionRegistry],
    ['test-shell', shellPlugin],
    ['@deepseek-ai/dsh-user-approval', ApprovalService],
    ['@deepseek-ai/dsh-permission-presets', PermissionPresetService],
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime],
    ['@deepseek-ai/dsh-experimental-auto-mode-forge', AutoModeForge],
    ['test-tools', toolsPlugin],
  ])

  const ctx = new Context()
  contexts.push(ctx)
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  expect([...ctx.loader.entries()].filter(entry => entry.fiber === undefined && !entry.disabled)).toEqual([])
  return { ctx, executions }
}

const execute = (ctx: Context, owner: NonNullable<ToolExecution['agent']>, name: string, args: object) =>
  ctx.tools.execute({
    callId: ToolCallId(`${name}-${owner.session.id}-${owner.session.seq}`),
    name,
    arguments: args,
    agent: owner,
    signal: new AbortController().signal,
  })

describe('Forge Auto Mode classifier', () => {
  it.each([
    ['git reset --hard HEAD', 'destructive Git'],
    ['git clean -fdx', 'destructive Git'],
    ['git branch -D old', 'destructive Git'],
    ['git push origin main', 'external Git'],
    ['npm publish', 'package publication'],
    ['PNPM.CMD publish --access public', 'package publication'],
    ['Remove-Item .\\build -Recurse -Force', 'destructive filesystem'],
    ['cmd.exe /c rmdir /s /q C:\\temp\\old', 'destructive filesystem'],
    ['Restart-Computer -Force', 'system-level mutation'],
    ['shutdown.exe /r /t 0', 'system-level mutation'],
    ['git status --short; git push origin main', 'external Git'],
    ['pnpm run test # keep the build\nRemove-Item .\\build -Recurse -Force', 'destructive filesystem'],
  ])('asks for %s', (command, reason) => {
    const classified = decision(command)
    expect(classified.kind).toBe('ask')
    if (classified.kind === 'ask') expect(classified.reason).toContain(reason)
  })

  it.each([
    ['pnpm run test', 'pwsh'],
    ['git status --short', 'pwsh'],
    ['Remove-Item .\\one-file.txt', 'pwsh'],
    ['Write-Output "git push; Remove-Item x -Recurse -Force"', 'pwsh'],
    ['pnpm run test # git push', 'pwsh'],
    ['Write-Output "x `" ; git push origin main "', 'pwsh'],
    ['git push', 'write'],
  ])('delegates ordinary or unrelated call %s', (command, name) => {
    expect(decision(command, name)).toEqual({ kind: 'allow' })
  })

  it('delegates arguments the tool JSON boundary did not produce as a command string', () => {
    for (const args of [{ command: 42 }, null, 'git push'] as unknown as ToolExecution['arguments'][]) {
      expect(classifyAutoModeCall({ name: 'pwsh', arguments: args })).toEqual({ kind: 'allow' })
    }
  })
})

describe('Forge desktop composition', () => {
  it('presents exactly three renamed presets and loads the Forge gate', () => {
    const base = new URL('../../../bundle/base/cordis.patch.yml', import.meta.url)
    const web = new URL('../../../bundle/web-app/cordis.patch.yml', import.meta.url)
    const desktop = new URL('../../../../apps/desktop-host/config/desktop.cordis.patch.yml', import.meta.url)
    const rows = composeEntries([
      loadOverlayPatches('forge-test', fileURLToPath(base)),
      loadOverlayPatches('forge-test', fileURLToPath(web)),
      loadOverlayPatches('forge-test', fileURLToPath(desktop)),
    ])
    const permission = rows.find(row => row.id === 'permission')
    const presets = (permission?.config as { presets?: Record<string, object> } | undefined)?.presets
    expect(Object.keys(presets ?? {})).toEqual(['read-only', 'workspace-write', 'danger-full-access'])
    expect(presets?.['read-only']).toMatchObject({ sandbox: 'read-only', approval: 'ask', name: 'Read & Plan' })
    expect(presets?.['workspace-write']).toMatchObject({ sandbox: 'workspace-write', approval: 'ask', name: 'Auto Mode' })
    expect(presets?.['danger-full-access']).toMatchObject({ sandbox: 'danger-full-access', approval: 'never', name: 'Full Access' })
    expect(rows.filter(row => row.name === '@deepseek-ai/dsh-experimental-auto-mode-forge')).toHaveLength(1)
  })
})

describe('Forge Auto Mode through a real Loader composition', () => {
  it('keeps routine workspace calls automatic and accepts historical workspace-write state', async () => {
    const { ctx, executions } = await loadComposition()
    const owner = agent('routine')
    owner.session.append('permission/preset', { preset: 'workspace-write' })
    const asked = vi.fn()
    ctx.on('approval/request', () => { asked(); return Promise.resolve<ApprovalOutcome>('rejected') })

    expect((await execute(ctx, owner, 'write', { path: 'file.txt' })).isError).toBe(false)
    expect((await execute(ctx, owner, 'pwsh', { command: 'pnpm run test' })).isError).toBe(false)
    expect(ctx.permissionPresets.current(owner.session)).toBe('workspace-write')
    expect(executions).toEqual(['write', 'pwsh'])
    expect(asked).not.toHaveBeenCalled()
  })

  it('requires a fresh allowed-once decision for each recognized call', async () => {
    const { ctx, executions } = await loadComposition()
    const owner = agent('allowed-once')
    const answers: ApprovalOutcome[] = ['allowed-once', 'rejected']
    const asked = vi.fn(() => Promise.resolve(answers.shift() ?? 'unavailable'))
    ctx.on('approval/request', asked)

    expect((await execute(ctx, owner, 'pwsh', { command: 'git push origin main' })).isError).toBe(false)
    expect((await execute(ctx, owner, 'pwsh', { command: 'git push origin main' })).isError).toBe(true)
    expect(executions).toEqual(['pwsh'])
    expect(asked).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['rejected', 'the user rejected'],
    ['cancelled', 'was cancelled'],
  ] as const)('fails closed when approval is %s', async (outcome, message) => {
    const { ctx, executions } = await loadComposition()
    const owner = agent(outcome)
    ctx.on('approval/request', () => Promise.resolve<ApprovalOutcome>(outcome))

    const result = await execute(ctx, owner, 'pwsh', { command: 'git reset --hard HEAD' })
    expect(result.isError).toBe(true)
    const first = result.content[0]
    expect(first?.type).toBe('text')
    if (first?.type === 'text') expect(first.text).toContain(message)
    expect(executions).toEqual([])
  })

  it('fails closed when approval is unavailable', async () => {
    const { ctx, executions } = await loadComposition()
    const owner = agent('unavailable')
    const result = await execute(ctx, owner, 'pwsh', { command: 'Remove-Item .\\build -Recurse -Force' })
    expect(result.isError).toBe(true)
    const first = result.content[0]
    expect(first?.type).toBe('text')
    if (first?.type === 'text') expect(first.text).toContain('no approval channel is available')
    expect(executions).toEqual([])
    expect(owner.session.snapshotEvents().filter(event => event.type === 'approval/asked')).toHaveLength(1)
    expect(owner.session.snapshotEvents().filter(event => event.type === 'approval/decided')).toHaveLength(1)
  })

  it.each(['read-only', 'danger-full-access'] as const)('does not interfere with %s', async (preset) => {
    const { ctx, executions } = await loadComposition()
    const owner = agent(preset)
    ctx.permissionPresets.set(owner.session, preset)
    const asked = vi.fn()
    ctx.on('approval/request', () => { asked(); return Promise.resolve<ApprovalOutcome>('rejected') })

    expect((await execute(ctx, owner, 'pwsh', { command: 'git reset --hard HEAD' })).isError).toBe(false)
    expect(executions).toEqual(['pwsh'])
    expect(asked).not.toHaveBeenCalled()
  })

  it('delegates sandbox escalation arguments to the existing pwsh path', async () => {
    const { ctx, executions } = await loadComposition()
    const owner = agent('escalation')
    const asked = vi.fn()
    ctx.on('approval/request', () => { asked(); return Promise.resolve<ApprovalOutcome>('rejected') })

    expect((await execute(ctx, owner, 'pwsh', {
      command: 'Get-Content C:\\outside\\file.txt',
      sandbox_permissions: 'danger-full-access',
      justification: 'Read one file outside the workspace.',
    })).isError).toBe(false)
    expect(executions).toEqual(['pwsh'])
    expect(asked).not.toHaveBeenCalled()
  })
})
