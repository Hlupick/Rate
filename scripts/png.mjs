/**
 * Minimal procedural PNG cover generator (no dependencies).
 */
import zlib from 'node:zlib'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function hexToRgb(hex) {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function createCanvas(size) {
  return { size, data: new Uint8ClampedArray(size * size * 4) }
}

function blend(canvas, x, y, rgb, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return
  const i = (y * canvas.size + x) * 4
  const d = canvas.data
  const a = clamp01(alpha)
  d[i] = d[i] + (rgb[0] - d[i]) * a
  d[i + 1] = d[i + 1] + (rgb[1] - d[i + 1]) * a
  d[i + 2] = d[i + 2] + (rgb[2] - d[i + 2]) * a
  d[i + 3] = 255
}

function background(canvas, c0, c1, angle = 0.9) {
  const { size } = canvas
  const [r0, g0, b0] = hexToRgb(c0)
  const [r1, g1, b1] = hexToRgb(c1)
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = clamp01(((x / size) * dx + (y / size) * dy + 0.5) / 1.5)
      const s = t * t * (3 - 2 * t)
      blend(canvas, x, y, [r0 + (r1 - r0) * s, g0 + (g1 - g0) * s, b0 + (b1 - b0) * s], 1)
    }
  }
}

function glow(canvas, cx, cy, radius, rgb, strength) {
  const { size } = canvas
  const y0 = Math.max(0, Math.floor(cy - radius))
  const y1 = Math.min(size, Math.ceil(cy + radius))
  const x0 = Math.max(0, Math.floor(cx - radius))
  const x1 = Math.min(size, Math.ceil(cx + radius))
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const dist = Math.hypot(x - cx, y - cy) / radius
      blend(canvas, x, y, rgb, clamp01(1 - dist) ** 2 * strength)
    }
  }
}

function ring(canvas, cx, cy, radius, thickness, rgb, alpha) {
  const { size } = canvas
  const r0 = radius - thickness / 2
  const r1 = radius + thickness / 2
  const y0 = Math.max(0, Math.floor(cy - radius - 2))
  const y1 = Math.min(size, Math.ceil(cy + radius + 2))
  const x0 = Math.max(0, Math.floor(cx - radius - 2))
  const x1 = Math.min(size, Math.ceil(cx + radius + 2))
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const d = Math.hypot(x - cx, y - cy)
      const cov = clamp01(r1 - d + 0.5) * clamp01(d - r0 + 0.5)
      if (cov > 0) blend(canvas, x, y, rgb, cov * alpha)
    }
  }
}

function disc(canvas, cx, cy, radius, rgb, alpha) {
  const { size } = canvas
  const y0 = Math.max(0, Math.floor(cy - radius - 2))
  const y1 = Math.min(size, Math.ceil(cy + radius + 2))
  const x0 = Math.max(0, Math.floor(cx - radius - 2))
  const x1 = Math.min(size, Math.ceil(cx + radius + 2))
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const d = Math.hypot(x - cx, y - cy)
      const cov = clamp01(radius - d + 0.5)
      if (cov > 0) blend(canvas, x, y, rgb, cov * alpha)
    }
  }
}

function segment(canvas, x1, y1, x2, y2, width, rgb, alpha) {
  const minX = Math.floor(Math.min(x1, x2) - width)
  const maxX = Math.ceil(Math.max(x1, x2) + width)
  const minY = Math.floor(Math.min(y1, y2) - width)
  const maxY = Math.ceil(Math.max(y1, y2) + width)
  const vx = x2 - x1
  const vy = y2 - y1
  const len2 = vx * vx + vy * vy || 1
  for (let y = Math.max(0, minY); y < Math.min(canvas.size, maxY); y += 1) {
    for (let x = Math.max(0, minX); x < Math.min(canvas.size, maxX); x += 1) {
      const t = clamp01(((x - x1) * vx + (y - y1) * vy) / len2)
      const d = Math.hypot(x - (x1 + vx * t), y - (y1 + vy * t))
      const cov = clamp01(width / 2 - d + 0.5)
      if (cov > 0) blend(canvas, x, y, rgb, cov * alpha)
    }
  }
}

function grainy(canvas, amount, seed) {
  let s = seed || 1
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  const { size } = canvas
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = (rnd() - 0.5) * amount
      const i = (y * size + x) * 4
      canvas.data[i] += n
      canvas.data[i + 1] += n
      canvas.data[i + 2] += n
    }
  }
}

function vignette(canvas, strength) {
  const { size, data } = canvas
  const c = size / 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - c, y - c) / (size * 0.72)
      const k = 1 - clamp01(d) ** 2 * strength
      const i = (y * size + x) * 4
      data[i] *= k
      data[i + 1] *= k
      data[i + 2] *= k
    }
  }
}

/**
 * style: rings | arcs | waves | grid | diagonal | orb | bars | prism
 */
export function makeCover({ size = 640, palette, style = 'rings', seed = 1 }) {
  const [bg0, bg1, accent] = palette
  const accentRgb = hexToRgb(accent)
  const canvas = createCanvas(size)
  background(canvas, bg0, bg1, (seed % 10) * 0.31)
  const c = size / 2

  if (style === 'rings') {
    glow(canvas, size * 0.72, size * 0.28, size * 0.62, accentRgb, 0.26)
    for (let i = 0; i < 8; i += 1) {
      ring(canvas, c, c, size * (0.09 + i * 0.056), 2.6 + (i % 3) * 2.2, accentRgb, 0.85 - i * 0.07)
    }
    disc(canvas, c, c, size * 0.055, accentRgb, 1)
  } else if (style === 'arcs') {
    glow(canvas, size * 0.25, size * 0.7, size * 0.6, accentRgb, 0.14)
    for (let i = 0; i < 5; i += 1) {
      const r = size * (0.18 + i * 0.1)
      const start = -1.1 + i * 0.16
      const end = 0.9 + i * 0.12
      const steps = 240
      let px = null
      let py = null
      for (let s = 0; s <= steps; s += 1) {
        const a = start + ((end - start) * s) / steps
        const x = size * 0.18 + Math.cos(a) * r
        const y = size * 0.82 + Math.sin(a) * r
        if (px !== null) segment(canvas, px, py, x, y, 2.4, accentRgb, 0.5 - i * 0.06)
        px = x
        py = y
      }
    }
  } else if (style === 'waves') {
    glow(canvas, c, size * 0.4, size * 0.7, accentRgb, 0.12)
    for (let line = 0; line < 26; line += 1) {
      const baseY = size * 0.2 + line * (size * 0.024)
      let px = null
      let py = null
      for (let x = 0; x <= size; x += 4) {
        const y =
          baseY +
          Math.sin((x / size) * Math.PI * 2.2 + line * 0.42 + seed) * size * (0.018 + line * 0.0016)
        if (px !== null) segment(canvas, px, py, x, y, 1.1, accentRgb, 0.16 + (line / 26) * 0.4)
        px = x
        py = y
      }
    }
  } else if (style === 'grid') {
    const cell = size / 9
    glow(canvas, size * 0.6, size * 0.6, size * 0.5, accentRgb, 0.1)
    for (let gx = 0; gx < 9; gx += 1) {
      for (let gy = 0; gy < 9; gy += 1) {
        const d = Math.hypot(gx - 4, gy - 4)
        const r = (cell / 2 - 6) * Math.max(0.15, 1 - d / 7)
        disc(canvas, gx * cell + cell / 2, gy * cell + cell / 2, r, accentRgb, 0.25 + (1 - d / 7) * 0.5)
      }
    }
  } else if (style === 'diagonal') {
    for (let i = 0; i < 22; i += 1) {
      const off = i * (size / 14)
      segment(canvas, off - size * 0.4, size, off + size * 0.4, 0, 2.2, accentRgb, 0.1 + (i % 4) * 0.1)
    }
    glow(canvas, size * 0.78, size * 0.2, size * 0.42, accentRgb, 0.2)
  } else if (style === 'orb') {
    glow(canvas, c, c, size * 0.62, accentRgb, 0.3)
    disc(canvas, c, c, size * 0.25, accentRgb, 0.22)
    disc(canvas, c, c, size * 0.12, accentRgb, 0.35)
    ring(canvas, c, c, size * 0.36, 2, accentRgb, 0.5)
  } else if (style === 'bars') {
    const bars = 16
    const w = size / 26
    for (let i = 0; i < bars; i += 1) {
      const h = size * (0.1 + Math.abs(Math.sin(i * 1.7 + seed)) * 0.55)
      const x = size * 0.18 + i * w * 1.35
      segment(canvas, x, size * 0.78, x, size * 0.78 - h, w, accentRgb, 0.55)
    }
    glow(canvas, c, size * 0.25, size * 0.5, accentRgb, 0.1)
  } else {
    const pts = 3
    for (let i = 0; i < pts; i += 1) {
      const a = (i / pts) * Math.PI * 2 + seed * 0.2
      const x = c + Math.cos(a) * size * 0.24
      const y = c + Math.sin(a) * size * 0.24
      disc(canvas, x, y, size * 0.16, accentRgb, 0.18)
    }
    ring(canvas, c, c, size * 0.3, 2, accentRgb, 0.55)
  }

  grainy(canvas, 12, seed * 977 + 13)
  vignette(canvas, 0.45)
  return encodePng(size, size, canvas.data)
}
