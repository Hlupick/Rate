import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const OUT = path.join(process.cwd(), 'public', 'icons')
const SUPER = 4

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const kind = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([kind, data])), 0)
  return Buffer.concat([length, kind, data, crc])
}

function writePng(file, size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size * 4; x += 1) {
      raw[row + 1 + x] = pixels[y * size * 4 + x]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

function roundedRectCoverage(x, y, size, radius, scale) {
  const cx = Math.min(Math.max(x, radius), size - radius)
  const cy = Math.min(Math.max(y, radius), size - radius)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius ? 1 : 0
}

function render(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4)
  const scale = size / 64
  const center = size / 2
  const pad = maskable ? size * 0.16 : 0
  const boardSize = size - pad * 2
  const boardScale = boardSize / 64
  const radius = (maskable ? 14 : 14) * boardScale
  const rings = [
    { r: 23 * boardScale, w: 1.1 * boardScale, a: 0.3 },
    { r: 16 * boardScale, w: 1.1 * boardScale, a: 0.55 },
    { r: 9 * boardScale, w: 1.1 * boardScale, a: 0.85 },
  ]
  const dotRadius = 3.2 * boardScale

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let rectHits = 0
      let ringMix = 0
      let dotHits = 0

      for (let sy = 0; sy < SUPER; sy += 1) {
        for (let sx = 0; sx < SUPER; sx += 1) {
          const px = x + (sx + 0.5) / SUPER
          const py = y + (sy + 0.5) / SUPER
          const bx = px - pad
          const by = py - pad
          if (bx < 0 || by < 0 || bx >= boardSize || by >= boardSize) {
            if (maskable) rectHits += 1
            continue
          }
          rectHits += roundedRectCoverage(bx, by, boardSize, radius, boardScale)
          const dx = bx - boardSize / 2
          const dy = by - boardSize / 2
          const distance = Math.sqrt(dx * dx + dy * dy)
          for (const ring of rings) {
            if (Math.abs(distance - ring.r) <= ring.w) ringMix += ring.a
          }
          if (distance <= dotRadius) dotHits += 1
        }
      }

      const total = SUPER * SUPER
      const rectAlpha = maskable ? 1 : rectHits / total
      let value = 16
      const ringPart = Math.min(1, ringMix / total)
      value = value * (1 - ringPart) + 243 * ringPart
      const dotPart = Math.min(1, dotHits / total)
      value = value * (1 - dotPart) + 243 * dotPart
      const index = (y * size + x) * 4
      const rgb = Math.round(value)
      pixels[index] = rgb
      pixels[index + 1] = rgb
      pixels[index + 2] = rgb
      pixels[index + 3] = Math.round(rectAlpha * 255)
    }
  }
  return pixels
}

fs.mkdirSync(OUT, { recursive: true })
writePng(path.join(OUT, 'icon-192.png'), 192, render(192))
writePng(path.join(OUT, 'icon-512.png'), 512, render(512))
writePng(path.join(OUT, 'icon-maskable-512.png'), 512, render(512, { maskable: true }))
console.log('icons written to', OUT)
