import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { extractZip } from '../scripts/prepare-runtime.ts'

interface SyntheticZipEntry {
  readonly name: string
  readonly content?: string
  readonly compress?: boolean
}

function createSyntheticZip(entries: readonly SyntheticZipEntry[]): Buffer {
  const localParts: Buffer[] = []
  const cdParts: Buffer[] = []
  let offset = 0

  for (const { name, content = '', compress = false } of entries) {
    const rawData = Buffer.from(content, 'utf8')
    const compData = compress ? deflateRawSync(rawData) : rawData
    const method = compress ? 8 : 0
    const nameBuf = Buffer.from(name, 'utf8')

    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(0, 6)
    lh.writeUInt16LE(method, 8)
    lh.writeUInt32LE(0, 10)
    lh.writeUInt32LE(0, 14)
    lh.writeUInt32LE(compData.length, 18)
    lh.writeUInt32LE(rawData.length, 24)
    lh.writeUInt16LE(nameBuf.length, 26)
    lh.writeUInt16LE(0, 28)

    localParts.push(lh, nameBuf, compData)

    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)
    cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(0, 8)
    cd.writeUInt16LE(method, 10)
    cd.writeUInt32LE(0, 12)
    cd.writeUInt32LE(0, 16)
    cd.writeUInt32LE(compData.length, 20)
    cd.writeUInt32LE(rawData.length, 24)
    cd.writeUInt16LE(nameBuf.length, 28)
    cd.writeUInt16LE(0, 30)
    cd.writeUInt16LE(0, 32)
    cd.writeUInt16LE(0, 34)
    cd.writeUInt16LE(0, 36)
    cd.writeUInt32LE(0, 38)
    cd.writeUInt32LE(offset, 42)

    cdParts.push(cd, nameBuf)
    offset += 30 + nameBuf.length + compData.length
  }

  const cdTotalSize = cdParts.reduce((acc, part) => acc + part.length, 0)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdTotalSize, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, ...cdParts, eocd])
}

describe('prepare runtime zip extraction', () => {
  it('does not execute main when imported as a library', async () => {
    await expect(import('../scripts/prepare-runtime.ts')).resolves.toHaveProperty('extractZip')
  })

  it('extracts stored and deflated entries into the destination directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dsh-extract-test-'))
    try {
      const zipPath = join(tempDir, 'test.zip')
      const outDir = join(tempDir, 'out')
      writeFileSync(zipPath, createSyntheticZip([
        { name: 'plain.txt', content: 'hello world', compress: false },
        { name: 'compressed.txt', content: 'compressed contents repeating '.repeat(20), compress: true },
        { name: 'nested/', compress: false },
        { name: 'nested/inner.txt', content: 'inner file', compress: true },
      ]))

      extractZip(zipPath, { dir: outDir })

      expect(readFileSync(join(outDir, 'plain.txt'), 'utf8')).toBe('hello world')
      expect(readFileSync(join(outDir, 'compressed.txt'), 'utf8')).toBe('compressed contents repeating '.repeat(20))
      expect(readFileSync(join(outDir, 'nested/inner.txt'), 'utf8')).toBe('inner file')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('rejects zip entries that escape the destination directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dsh-extract-traversal-'))
    try {
      const zipPath = join(tempDir, 'evil.zip')
      const outDir = join(tempDir, 'out')
      writeFileSync(zipPath, createSyntheticZip([
        { name: '../escape.txt', content: 'malicious', compress: false },
      ]))

      expect(() => {
        extractZip(zipPath, { dir: outDir })
      }).toThrow(/escapes extraction directory/u)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('rejects corrupt or undersized files', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dsh-extract-corrupt-'))
    try {
      const zipPath = join(tempDir, 'corrupt.zip')
      const outDir = join(tempDir, 'out')
      writeFileSync(zipPath, Buffer.from('short'))
      expect(() => {
        extractZip(zipPath, { dir: outDir })
      }).toThrow(/too small/u)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
