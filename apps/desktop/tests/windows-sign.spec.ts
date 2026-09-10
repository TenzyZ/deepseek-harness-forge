import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildWindowsSigningEnvironment,
  createRedactedWindowsSigningError,
  createWindowsLocalTestSigner,
  createWindowsSigner,
  createWindowsTokenSigner,
  installWindowsNsisBootstrapSigner,
  repairDanglingAuthenticodeDirectory,
  resolveWindowsSigningEnvironment,
  scrubWindowsSigningEnvironment,
} from '../scripts/windows-sign.mjs'

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn((...args: unknown[]) => {
    const callback = args.at(-1) as (error: null, result: { stdout: string; stderr: string }) => void
    callback(null, { stdout: '', stderr: '' })
  }),
}))

vi.mock('node:child_process', () => ({ execFile: execFileMock }))

vi.mock('node:crypto', () => ({
  X509Certificate: class {
    readonly ca = false
    readonly keyUsage = ['1.3.6.1.5.5.7.3.3']

    constructor(contents: Buffer) {
      if (contents.toString('utf8') !== 'code-signing-certificate-fixture') {
        throw new Error('invalid test certificate')
      }
    }
  },
}))

const CERTIFICATE_FILE = 'C:\\release\\server.cer'
const SIGN_SCRIPT = resolve(import.meta.dirname, '../scripts/windows-sign.cmd')
const TEST_CERTIFICATE_SHA1 = '0123456789abcdef0123456789ABCDEF01234567'

beforeEach(() => {
  execFileMock.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Windows signing selection', () => {
  it('defaults to production and accepts only the two exact signing environments', () => {
    expect(resolveWindowsSigningEnvironment(undefined)).toBe('production')
    expect(resolveWindowsSigningEnvironment('production')).toBe('production')
    expect(resolveWindowsSigningEnvironment('local-test')).toBe('local-test')
    for (const value of ['', 'test', 'Local-Test']) {
      expect(() => resolveWindowsSigningEnvironment(value)).toThrow(/DSH_DESKTOP_WINDOWS_SIGNING_ENV/u)
    }
  })

  it('dispatches complete production and local-test configurations', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-windows-sign-dispatch-'))
    const certificateFile = join(directory, 'server.cer')
    const signTool = join(directory, 'signtool.exe')
    await writeFile(certificateFile, 'code-signing-certificate-fixture')
    await writeFile(signTool, 'fixture')
    try {
      expect(createWindowsSigner({
        DSH_DESKTOP_WINDOWS_CER_FILE: certificateFile,
        DSH_DESKTOP_WINDOWS_SIGNTOOL: signTool,
        DSH_DESKTOP_WINDOWS_KEY_CONTAINER: 'te-container',
        DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret!',
      })).toBeTypeOf('function')
      expect(createWindowsSigner({
        DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
        DSH_DESKTOP_WINDOWS_SIGNTOOL: signTool,
        DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1: TEST_CERTIFICATE_SHA1,
      })).toBeTypeOf('function')
    }
    finally {
      await rm(directory, { recursive: true })
    }
  })

  it('rejects fields from the other signing environment', () => {
    expect(() => createWindowsSigner({
      DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1: TEST_CERTIFICATE_SHA1,
    })).toThrow(/DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1/u)
    for (const name of [
      'DSH_DESKTOP_WINDOWS_CER_FILE',
      'DSH_DESKTOP_WINDOWS_KEY_CONTAINER',
      'DSH_DESKTOP_WINDOWS_TOKEN_PIN',
    ] as const) {
      expect(() => createWindowsSigner({
        DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
        [name]: 'contamination',
      })).toThrow(new RegExp(name, 'u'))
    }
  })

  it('requires an exact SHA-1 thumbprint and a validated SignTool for local-test', async () => {
    expect(() => createWindowsSigner({
      DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
    })).toThrow(/DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1/u)
    for (const certificateSha1 of [
      ` ${TEST_CERTIFICATE_SHA1}`,
      `"${TEST_CERTIFICATE_SHA1}"`,
      `/${TEST_CERTIFICATE_SHA1}`,
      `-${TEST_CERTIFICATE_SHA1}`,
      TEST_CERTIFICATE_SHA1.slice(0, 39),
      `${TEST_CERTIFICATE_SHA1}0`,
      `${TEST_CERTIFICATE_SHA1.slice(0, 39)}g`,
    ]) {
      expect(() => createWindowsLocalTestSigner({ certificateSha1 }))
        .toThrow(/exactly 40 hexadecimal characters/u)
    }
    expect(() => createWindowsLocalTestSigner({
      certificateSha1: TEST_CERTIFICATE_SHA1,
      signTool: 'missing.exe',
    })).toThrow(/DSH_DESKTOP_WINDOWS_SIGNTOOL/u)
  })

  it('invokes SignTool directly with the fixed local-test arguments and scrubbed environment', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-windows-local-test-sign-'))
    const signTool = join(directory, 'signtool.exe')
    const target = join(directory, 'setup.exe')
    await writeFile(signTool, 'fixture')
    await writeFile(target, 'fixture')
    vi.stubEnv('DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1', TEST_CERTIFICATE_SHA1)
    vi.stubEnv('DSH_DESKTOP_WINDOWS_TOKEN_PIN', 'token-secret')
    vi.stubEnv('DEEPSEEK_API_KEY', 'api-secret')
    vi.stubEnv('BUILD_PASSWORD', 'build-secret')
    try {
      const signer = createWindowsLocalTestSigner({
        certificateSha1: TEST_CERTIFICATE_SHA1,
        signTool,
      })
      await signer({ path: target, hash: 'sha256', isNest: false })
      await signer({ path: target, hash: 'sha256', isNest: true })

      expect(execFileMock).toHaveBeenCalledTimes(2)
      const [executable, args, options] = execFileMock.mock.calls[0] as [
        string,
        string[],
        { env: NodeJS.ProcessEnv },
      ]
      expect(executable).toBe(signTool)
      expect(args).toEqual([
        'sign', '/v', '/fd', 'sha256', '/sha1', TEST_CERTIFICATE_SHA1, '/s', 'My', target,
      ])
      expect(args).not.toContain('/kc')
      expect(args).not.toContain('/csp')
      expect(args).not.toContain('/f')
      expect(args).not.toContain('/tr')
      expect(options.env.DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1).toBeUndefined()
      expect(options.env.DSH_DESKTOP_WINDOWS_TOKEN_PIN).toBeUndefined()
      expect(options.env.DEEPSEEK_API_KEY).toBeUndefined()
      expect(options.env.BUILD_PASSWORD).toBeUndefined()
      expect(execFileMock.mock.calls[1]?.[1]).toEqual([
        'sign', '/v', '/fd', 'sha256', '/sha1', TEST_CERTIFICATE_SHA1, '/s', 'My', '/as', target,
      ])
    }
    finally {
      await rm(directory, { recursive: true })
    }
  })

  it('rejects non-SHA-256 local-test signing tasks before invoking SignTool', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-windows-local-test-hash-'))
    const signTool = join(directory, 'signtool.exe')
    await writeFile(signTool, 'fixture')
    try {
      const signer = createWindowsLocalTestSigner({
        certificateSha1: TEST_CERTIFICATE_SHA1,
        signTool,
      })
      await expect(signer({ path: 'setup.exe', hash: 'sha1', isNest: false }))
        .rejects.toThrow(/requires SHA-256/u)
      expect(execFileMock).not.toHaveBeenCalled()
    }
    finally {
      await rm(directory, { recursive: true })
    }
  })
})

describe('Windows token signing', () => {
  it('passes only the validated BAT fields to the signing command interpreter', () => {
    expect(buildWindowsSigningEnvironment({
      SystemRoot: 'C:\\Windows',
      DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'inherited-token-secret',
      DEEPSEEK_API_KEY: 'api-secret',
      BUILD_PASSWORD: 'build-secret',
    }, {
      certificateFile: CERTIFICATE_FILE,
      signTool: 'C:\\tools\\signtool.exe',
      path: 'C:\\release\\DeepSeek Harness.exe',
      isNest: false,
      tokenPin: 'token-secret!',
      keyContainer: 'te-container',
    })).toEqual({
      SystemRoot: 'C:\\Windows',
      DSH_DESKTOP_WINDOWS_SIGNTOOL: 'C:\\tools\\signtool.exe',
      DSH_DESKTOP_WINDOWS_CER_FILE: CERTIFICATE_FILE,
      DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret!',
      DSH_DESKTOP_WINDOWS_KEY_CONTAINER: 'te-container',
      DSH_DESKTOP_WINDOWS_SIGN_TARGET: 'C:\\release\\DeepSeek Harness.exe',
      DSH_DESKTOP_WINDOWS_SIGN_APPEND: '',
    })
  })

  it('requests an appended signature only for an electron-builder nested task', () => {
    expect(buildWindowsSigningEnvironment({}, {
      certificateFile: CERTIFICATE_FILE,
      signTool: 'C:\\tools\\signtool.exe',
      path: 'C:\\release\\setup.exe',
      isNest: true,
      tokenPin: 'token-secret!',
      keyContainer: 'te-container',
    }).DSH_DESKTOP_WINDOWS_SIGN_APPEND).toBe('1')
  })

  it('keeps the verified SafeNet command in an ASCII CRLF CMD file', async () => {
    const contents = await readFile(SIGN_SCRIPT)
    const text = contents.toString('ascii')
    expect(contents.every(byte => byte <= 0x7F)).toBe(true)
    expect(text).toContain('\r\n')
    expect(text.replaceAll('\r\n', '')).not.toContain('\n')
    expect(text).toContain('setlocal DisableDelayedExpansion\r\n')
    expect(text).toContain('set "DSH_DESKTOP_WINDOWS_CER_FILE="\r\n')
    expect(text).toContain('set "DSH_DESKTOP_WINDOWS_TOKEN_PIN="\r\n')
    expect(text).toContain('"%signTool%" sign /v /fd sha256 /f "%certificateFile%" /kc "[{{%tokenPin%}}]=%keyContainer%" /csp "eToken Base Cryptographic Provider" %appendSignature% /tr http://timestamp.digicert.com /td sha256 "%targetFile%"\r\n')
  })

  it('rejects incomplete signing identities and non-SHA-256 signing tasks', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-windows-sign-tool-'))
    const certificateFile = join(directory, 'server.cer')
    const signTool = join(directory, 'signtool.exe')
    await writeFile(certificateFile, 'code-signing-certificate-fixture')
    await writeFile(signTool, 'fixture')
    expect(() => createWindowsTokenSigner({
      certificateFile: undefined,
      signTool,
      tokenPin: 'token-secret!',
      keyContainer: 'te-container',
    })).toThrow(/DSH_DESKTOP_WINDOWS_CER_FILE/u)
    expect(() => createWindowsTokenSigner({
      certificateFile,
      signTool: undefined,
      tokenPin: 'token-secret!',
      keyContainer: 'te-container',
    })).toThrow(/DSH_DESKTOP_WINDOWS_SIGNTOOL/u)
    const signer = createWindowsTokenSigner({
      certificateFile,
      signTool,
      tokenPin: 'token-secret!',
      keyContainer: 'te-container',
    })
    try {
      expect(() => createWindowsTokenSigner({
        certificateFile,
        signTool,
        tokenPin: 'token-secret!',
      })).toThrow(/DSH_DESKTOP_WINDOWS_KEY_CONTAINER/u)
      expect(() => createWindowsTokenSigner({
        certificateFile,
        signTool,
        tokenPin: '',
        keyContainer: 'te-container',
      })).toThrow(/DSH_DESKTOP_WINDOWS_TOKEN_PIN/u)
      expect(() => createWindowsTokenSigner({
        certificateFile,
        signTool,
        tokenPin: 'token]secret',
        keyContainer: 'te-container',
      })).toThrow(/cannot contain/u)
      await expect(signer({
        path: 'C:\\release\\setup.exe',
        hash: 'sha1',
        isNest: false,
      })).rejects.toThrow(/requires SHA-256/u)
    }
    finally {
      await rm(directory, { recursive: true })
    }
  })

  it('removes inherited credentials and redacts SignTool process failures', () => {
    expect(scrubWindowsSigningEnvironment({
      SystemRoot: 'C:\\Windows',
      DSH_DESKTOP_WINDOWS_CER_FILE: 'C:\\release\\server.cer',
      DSH_DESKTOP_WINDOWS_SIGNTOOL: 'C:\\tools\\signtool.exe',
      DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret',
      DEEPSEEK_API_KEY: 'api-secret',
      BUILD_PASSWORD: 'build-secret',
    })).toEqual({ SystemRoot: 'C:\\Windows' })

    const processError = Object.assign(new Error('failed'), {
      code: 1,
      cmd: 'signtool /kc [{{token-secret}}]=te-container',
      stderr: 'provider rejected token-secret',
    })
    const failure = createRedactedWindowsSigningError(
      processError,
      'C:\\release\\setup.exe',
      ['token-secret'],
    )
    expect(failure.message).toBe('Windows release signing failed for C:\\release\\setup.exe (exit 1): provider rejected <redacted>')
    expect(failure.message).not.toContain('token-secret')
    expect(failure).not.toHaveProperty('cause')
    expect(failure).not.toHaveProperty('cmd')
  })

  it('signs the temporary NSIS executable before enterprise policy evaluates it', async () => {
    const events: string[] = []
    let receivedEnvironment: NodeJS.ProcessEnv | undefined
    class FakeWineVmManager {
      async exec(
        file: string,
        _args: string[],
        options?: { env?: NodeJS.ProcessEnv },
      ): Promise<string> {
        events.push(`exec:${file}`)
        receivedEnvironment = options?.env
        return 'executed'
      }
    }
    installWindowsNsisBootstrapSigner({
      sign: async (configuration) => {
        events.push(`sign:${configuration.path}:${configuration.hash}:${String(configuration.isNest)}`)
      },
      wineVmManager: FakeWineVmManager,
      platform: 'win32',
      environment: {
        SystemRoot: 'C:\\Windows',
        DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret',
      },
    })

    const result = await new FakeWineVmManager().exec('C:\\release\\setup.exe', [], {
      env: {
        __COMPAT_LAYER: 'RunAsInvoker',
        BUILD_PASSWORD: 'build-secret',
      },
    })

    expect(result).toBe('executed')
    expect(events).toEqual([
      'sign:C:\\release\\setup.exe:sha256:false',
      'exec:C:\\release\\setup.exe',
    ])
    expect(receivedEnvironment).toEqual({
      SystemRoot: 'C:\\Windows',
      __COMPAT_LAYER: 'RunAsInvoker',
    })
  })

  it('clears a certificate table inherited beyond the generated uninstaller', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-windows-sign-'))
    const path = join(directory, 'uninstaller.exe')
    const executable = Buffer.alloc(512)
    const peOffset = 216
    const optionalHeaderOffset = peOffset + 24
    const certificateDirectoryOffset = optionalHeaderOffset + 96 + (4 * 8)
    executable.write('MZ', 0, 'ascii')
    executable.writeUInt32LE(peOffset, 60)
    executable.write('PE\0\0', peOffset, 'ascii')
    executable.writeUInt16LE(0x10B, optionalHeaderOffset)
    executable.writeUInt32LE(600, certificateDirectoryOffset)
    executable.writeUInt32LE(100, certificateDirectoryOffset + 4)
    await writeFile(path, executable)
    try {
      await expect(repairDanglingAuthenticodeDirectory(path)).resolves.toBe(true)
      const repaired = await readFile(path)
      expect(repaired.readUInt32LE(certificateDirectoryOffset)).toBe(0)
      expect(repaired.readUInt32LE(certificateDirectoryOffset + 4)).toBe(0)
      await expect(repairDanglingAuthenticodeDirectory(path)).resolves.toBe(false)
    }
    finally {
      await rm(directory, { recursive: true })
    }
  })
})
