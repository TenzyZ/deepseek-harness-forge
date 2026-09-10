import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  DESKTOP_EXPERIMENTAL_PACK_DIRECTORIES,
  desktopElectronBuilderArguments,
  parseDesktopPackageInvocation,
  resolveDesktopPackageTarget,
  withoutDesktopUploadCredentials,
  withoutWindowsSigningEnvironment,
  windowsSigningEnvironmentForElectronBuilder,
  writeReleaseRecord,
} from '../scripts/package-target.ts'

vi.mock('../scripts/windows-sign.mjs', () => ({
  createWindowsSigner: vi.fn(() => vi.fn()),
  installWindowsNsisBootstrapSigner: vi.fn(),
}))

describe('desktop package target', () => {
  it('selects matching runtime and electron-builder architectures', () => {
    expect(resolveDesktopPackageTarget('mac-arm64', 'darwin', 'arm64')).toMatchObject({
      platform: 'darwin', arch: 'arm64', builderPlatform: '--mac', builderArch: '--arm64',
    })
    expect(resolveDesktopPackageTarget('mac-x64', 'darwin', 'x64')).toMatchObject({
      platform: 'darwin', arch: 'x64', builderPlatform: '--mac', builderArch: '--x64',
    })
    expect(resolveDesktopPackageTarget('win-x64', 'win32', 'x64')).toMatchObject({
      platform: 'win32', arch: 'x64', builderPlatform: '--win', builderArch: '--x64',
    })
  })

  it('allows an Apple Silicon host to build the Intel target through Rosetta', () => {
    expect(resolveDesktopPackageTarget('mac-x64', 'darwin', 'arm64').arch).toBe('x64')
  })

  it('rejects unsupported targets and hosts before building', () => {
    expect(() => resolveDesktopPackageTarget('linux-x64', 'linux', 'x64')).toThrow(/unsupported target/u)
    expect(() => resolveDesktopPackageTarget('win-x64', 'darwin', 'arm64')).toThrow(/Windows x64/u)
    expect(() => resolveDesktopPackageTarget('mac-arm64', 'darwin', 'x64')).toThrow(/Apple Silicon/u)
    expect(() => resolveDesktopPackageTarget('mac-arm64', 'linux', 'arm64')).toThrow(/macOS/u)
    expect(() => resolveDesktopPackageTarget('mac-x64', 'darwin', 'ppc64')).toThrow(/Rosetta/u)
  })

  it('parses installer and unpacked-directory invocations', () => {
    expect(parseDesktopPackageInvocation(['mac-arm64'], 'darwin', 'arm64').directory).toBe(false)
    expect(parseDesktopPackageInvocation(['mac-arm64', '--dir'], 'darwin', 'arm64').directory).toBe(true)
    expect(parseDesktopPackageInvocation([], 'darwin', 'arm64').target.name).toBe('mac-arm64')
    expect(parseDesktopPackageInvocation(['--prepare-only'], 'darwin', 'arm64').prepareOnly).toBe(true)
    expect(() => parseDesktopPackageInvocation(['mac-arm64', 'mac-x64'], 'darwin', 'arm64'))
      .toThrow(/at most one target/u)
  })

  it('keeps electron-builder publishing disabled for the separate validated upload', () => {
    const target = resolveDesktopPackageTarget('mac-arm64', 'darwin', 'arm64')
    expect(desktopElectronBuilderArguments(target, false)).toEqual([
      'exec',
      'electron-builder',
      '--config',
      'electron-builder.config.mjs',
      '--mac',
      '--arm64',
      '--publish',
      'never',
    ])
    expect(desktopElectronBuilderArguments(target, true)).toContain('--dir')
  })

  it('keeps Windows signing fields out of build and seed preparation subprocesses', () => {
    expect(withoutWindowsSigningEnvironment({
      DSH_DESKTOP_WINDOWS_CER_FILE: 'C:\\release\\server.cer',
      DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret',
      DSH_DESKTOP_WINDOWS_KEY_CONTAINER: 'container',
      DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
      DSH_DESKTOP_WINDOWS_SIGNTOOL: 'C:\\tools\\signtool.exe',
      DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1: '0123456789abcdef0123456789ABCDEF01234567',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    })).toEqual({ DSH_DESKTOP_AUTO_UPDATE_ENV: 'production' })
  })

  it('restores only approved Windows signing fields for electron-builder', () => {
    expect(windowsSigningEnvironmentForElectronBuilder({
      DSH_DESKTOP_TARGET_PLATFORM: 'win32',
    }, {
      DSH_DESKTOP_WINDOWS_CER_FILE: 'C:\\release\\server.cer',
      DSH_DESKTOP_WINDOWS_KEY_CONTAINER: 'container',
      DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
      DSH_DESKTOP_WINDOWS_SIGNTOOL: 'C:\\tools\\signtool.exe',
      DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1: '0123456789abcdef0123456789ABCDEF01234567',
      DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret',
      DSH_DESKTOP_WINDOWS_UNAPPROVED: 'not-forwarded',
    })).toEqual({
      DSH_DESKTOP_TARGET_PLATFORM: 'win32',
      DSH_DESKTOP_WINDOWS_CER_FILE: 'C:\\release\\server.cer',
      DSH_DESKTOP_WINDOWS_KEY_CONTAINER: 'container',
      DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
      DSH_DESKTOP_WINDOWS_SIGNTOOL: 'C:\\tools\\signtool.exe',
      DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1: '0123456789abcdef0123456789ABCDEF01234567',
      DSH_DESKTOP_WINDOWS_TOKEN_PIN: 'token-secret',
    })
  })

  it('keeps COS credentials out of every packaging subprocess', () => {
    expect(withoutDesktopUploadCredentials({
      DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com',
      DOWNLOAD_TEST_COS_BUCKET: 'test-download-bucket',
      DOWNLOAD_TEST_COS_SECRET_ID: 'test-id',
      DOWNLOAD_TEST_COS_SECRET_KEY: 'test-key',
      DOWNLOAD_PROD_COS_BUCKET: 'production-download-bucket',
      DOWNLOAD_PROD_COS_SECRET_ID: 'production-id',
      DOWNLOAD_PROD_COS_SECRET_KEY: 'production-key',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    })).toEqual({
      DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com',
      DOWNLOAD_TEST_COS_BUCKET: 'test-download-bucket',
      DOWNLOAD_PROD_COS_BUCKET: 'production-download-bucket',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    })
  })

  it('declares the experimental packages required by Desktop Host', () => {
    expect(DESKTOP_EXPERIMENTAL_PACK_DIRECTORIES).toEqual([
      'packages/experimental/auto-mode-forge',
      'packages/experimental/client-ui-brand-forge',
    ])
  })

  it('writes a release record omitting publicUrl when auto-update environment is none', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dsh-release-record-'))
    try {
      const target = resolveDesktopPackageTarget('win-x64', 'win32', 'x64')
      writeReleaseRecord(target, { DSH_DESKTOP_AUTO_UPDATE_ENV: 'none' }, tempDir)
      const content = JSON.parse(readFileSync(join(tempDir, 'win-x64-release.json'), 'utf8')) as {
        schemaVersion: number
        target: string
        environment: string
        publicUrl?: string
      }
      expect(content).toMatchObject({
        schemaVersion: 1,
        target: 'win-x64',
        environment: 'none',
      })
      expect(content.publicUrl).toBeUndefined()
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

describe('electron-builder forge configuration', () => {
  beforeAll(() => {
    vi.stubEnv('DSH_DESKTOP_APP_ID', 'com.example.forge')
    vi.stubEnv('DSH_DESKTOP_AUTO_UPDATE_ENV', 'none')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('identifies as DSH Forge with dsh-forge artifact naming and publish null when none', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    const config = createElectronBuilderConfig({
      DSH_DESKTOP_APP_ID: 'com.example.forge',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'none',
      DSH_DESKTOP_TARGET_PLATFORM: 'win32',
      DSH_DESKTOP_TARGET_ARCH: 'x64',
    }, 'win32', 'x64')
    expect(config.productName).toBe('DSH Forge')
    expect(config.artifactName).toBe('dsh-forge-${version}-${os}-${arch}.${ext}')
    expect(config.publish).toBeNull()
    expect(config.win.forceCodeSigning).toBe(true)
    expect(config.win.target).toEqual(['nsis'])
    expect(config.win.signtoolOptions.signingHashAlgorithms).toEqual(['sha256'])
    expect(config.win.signtoolOptions.sign).toBeTypeOf('function')
  })

  it('selects a signing function for explicit local-test packaging', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    const config = createElectronBuilderConfig({
      DSH_DESKTOP_APP_ID: 'com.example.forge',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'none',
      DSH_DESKTOP_TARGET_PLATFORM: 'win32',
      DSH_DESKTOP_TARGET_ARCH: 'x64',
      DSH_DESKTOP_WINDOWS_SIGNING_ENV: 'local-test',
      DSH_DESKTOP_WINDOWS_SIGNTOOL: 'C:\\tools\\signtool.exe',
      DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1: '0123456789abcdef0123456789ABCDEF01234567',
    }, 'win32', 'x64')
    expect(config.win.forceCodeSigning).toBe(true)
    expect(config.win.target).toEqual(['nsis'])
    expect(config.win.signtoolOptions.signingHashAlgorithms).toEqual(['sha256'])
    expect(config.win.signtoolOptions.sign).toBeTypeOf('function')
    expect(config.publish).toBeNull()
  })

  it('keeps generic publish config when update deployment is production or test', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    const prodConfig = createElectronBuilderConfig({
      DSH_DESKTOP_APP_ID: 'com.example.forge',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
      DSH_DESKTOP_TARGET_PLATFORM: 'win32',
      DSH_DESKTOP_TARGET_ARCH: 'x64',
    }, 'win32', 'x64')
    expect(prodConfig.publish).toEqual([
      { provider: 'generic', url: 'https://download.deepseek.com/_/harness/desktop/stable/win-x64/' },
    ])

    const testConfig = createElectronBuilderConfig({
      DSH_DESKTOP_APP_ID: 'com.example.forge',
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'test',
      DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com',
      DSH_DESKTOP_TARGET_PLATFORM: 'win32',
      DSH_DESKTOP_TARGET_ARCH: 'x64',
    }, 'win32', 'x64')
    expect(testConfig.publish).toEqual([
      { provider: 'generic', url: 'https://desktop-updates.example.com/_/harness/desktop/stable/win-x64/' },
    ])
  })
})
