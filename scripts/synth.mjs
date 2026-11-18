/**
 * MONAH demo engine — tiny software synthesizer used to generate the demo catalogue.
 * Pure JS, no native deps. Renders 44.1 kHz stereo float buffers.
 */

export const SR = 44100
const TAU = Math.PI * 2

export function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

/* -------------------------------- filters -------------------------------- */

class Biquad {
  constructor(type, freq, q = 0.707) {
    this.x1 = 0
    this.x2 = 0
    this.y1 = 0
    this.y2 = 0
    this.set(type, freq, q)
  }

  set(type, freq, q = 0.707) {
    const w0 = (TAU * clamp(freq, 20, SR * 0.45)) / SR
    const cos = Math.cos(w0)
    const alpha = Math.sin(w0) / (2 * q)
    let b0, b1, b2, a0, a1, a2
    if (type === 'highpass') {
      b0 = (1 + cos) / 2
      b1 = -(1 + cos)
      b2 = (1 + cos) / 2
      a0 = 1 + alpha
      a1 = -2 * cos
      a2 = 1 - alpha
    } else if (type === 'bandpass') {
      b0 = alpha
      b1 = 0
      b2 = -alpha
      a0 = 1 + alpha
      a1 = -2 * cos
      a2 = 1 - alpha
    } else {
      b0 = (1 - cos) / 2
      b1 = 1 - cos
      b2 = (1 - cos) / 2
      a0 = 1 + alpha
      a1 = -2 * cos
      a2 = 1 - alpha
    }
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = a1 / a0
    this.a2 = a2 / a0
    return this
  }

  process(x) {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

/* ------------------------------ oscillators ------------------------------ */

function polyblep(t, dt) {
  if (t < dt) {
    t /= dt
    return t + t - t * t - 1
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt
    return t * t + t + t + 1
  }
  return 0
}

function sawAt(phase, dt) {
  return 2 * phase - 1 - polyblep(phase, dt)
}

function pulseAt(phase, dt, width = 0.5) {
  const p = phase % 1
  return sawAt(p, dt) - sawAt((p + 1 - width) % 1, dt)
}

/* ------------------------------ instruments ------------------------------ */

function attackCurve(t, attack) {
  return attack <= 0 ? 1 : Math.min(1, t / attack)
}

/** Warm detuned saw pad with a slow filter sweep. */
export function pad(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const voices = opts.voices ?? 3
  const spread = opts.spread ?? 0.006
  const cutoff = opts.cutoff ?? 1100
  const attack = opts.attack ?? 0.25
  const release = opts.release ?? 0.5
  const lp1 = new Biquad('lowpass', cutoff, 0.5)
  const lp2 = new Biquad('lowpass', cutoff * 1.4, 0.5)
  const phases = new Float32Array(voices)
  for (let v = 0; v < voices; v += 1) phases[v] = (v * 0.31) % 1
  const dtBase = freq / SR
  let sweep = 0
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    let s = 0
    for (let v = 0; v < voices; v += 1) {
      const det = 1 + (v - (voices - 1) / 2) * spread
      const dt = dtBase * det
      phases[v] = (phases[v] + dt) % 1
      s += sawAt(phases[v], dt)
    }
    s /= voices
    const sub = Math.sin((TAU * freq * 0.5 * t + 0.3) % TAU) * 0.35
    if (i % 96 === 0) {
      sweep = cutoff * (0.75 + 0.5 * Math.min(1, t / Math.max(0.9, dur * 0.6)))
      lp1.set('lowpass', sweep, 0.55)
      lp2.set('lowpass', sweep * 1.7, 0.45)
    }
    const env =
      attackCurve(t, attack) *
      (t > dur - release ? Math.max(0, (dur - t) / release) : 1) *
      Math.exp(-t * (opts.decay ?? 0.12))
    out[i] = (lp2.process(lp1.process(s + sub * 0.5)) * env * (opts.gain ?? 0.5))
  }
  return out
}

/** Karplus-Strong plucked string. */
export function pluck(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const period = Math.max(2, Math.round(SR / freq))
  const buf = new Float32Array(period)
  const rnd = mulberry32(opts.seed ?? Math.floor(freq * 13))
  let prev = 0
  const bright = opts.brightness ?? 0.5
  for (let i = 0; i < period; i += 1) {
    const raw = rnd() * 2 - 1
    prev = prev + (raw - prev) * (0.15 + bright * 0.7)
    buf[i] = prev
  }
  const damp = opts.damp ?? 0.996
  let idx = 0
  for (let i = 0; i < n; i += 1) {
    const cur = buf[idx]
    const nxt = buf[(idx + 1) % period]
    buf[idx] = (cur + nxt) * 0.5 * damp
    const t = i / SR
    out[i] = cur * attackCurve(t, 0.002) * Math.exp(-t * (opts.decay ?? 1.1)) * (opts.gain ?? 0.8)
    idx = (idx + 1) % period
  }
  return out
}

/** Fender-Rhodes-ish FM electric piano. */
export function rhodes(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const index = opts.index ?? 2.4
  const ratio = opts.ratio ?? 2
  const lp = new Biquad('lowpass', 2600, 0.6)
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    const modEnv = Math.exp(-t * 5.5)
    const mod = Math.sin(TAU * freq * ratio * t) * index * modEnv
    const car = Math.sin(TAU * freq * t + mod)
    const tine = Math.sin(TAU * freq * 4.01 * t) * 0.18 * Math.exp(-t * 12)
    const env = attackCurve(t, 0.006) * Math.exp(-t * 1.15)
    const trem = 0.92 + 0.08 * Math.sin(TAU * 4.5 * t)
    out[i] = lp.process(car + tine) * env * trem * (opts.gain ?? 0.55)
  }
  return out
}

/** Sub-heavy bass. */
export function bass(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const lp = new Biquad('lowpass', opts.cutoff ?? 600, 0.8)
  let phase = 0
  const dt = freq / SR
  const subDt = (freq * 0.5) / SR
  let subPhase = 0
  const sawAmount = opts.saw ?? 0.7
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    phase = (phase + dt) % 1
    subPhase = (subPhase + subDt) % 1
    if (i % 64 === 0) {
      lp.set('lowpass', (opts.cutoff ?? 600) * (0.45 + 1.1 * Math.exp(-t * 6)), 0.9)
    }
    const s = sawAt(phase, dt) * sawAmount + Math.sin(TAU * subPhase) * (1 - sawAmount) * 0.9
    const env =
      attackCurve(t, opts.attack ?? 0.008) *
      (t > dur - 0.05 ? Math.max(0, (dur - t) / 0.05) : 1) *
      Math.exp(-t * (opts.decay ?? 0.6))
    out[i] = lp.process(s) * env * (opts.gain ?? 0.7)
  }
  return out
}

/** FM bell / music-box. */
export function bell(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const ratio = opts.ratio ?? 3.01
  const index = opts.index ?? 3.2
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    const mod = Math.sin(TAU * freq * ratio * t) * index * Math.exp(-t * 3.2)
    const car = Math.sin(TAU * freq * t + mod)
    const shimmer = Math.sin(TAU * freq * 2.005 * t) * 0.22 * Math.exp(-t * 2.2)
    const env = attackCurve(t, 0.004) * Math.exp(-t * (opts.decay ?? 1.6))
    out[i] = (car + shimmer) * env * (opts.gain ?? 0.45)
  }
  return out
}

/** Soft square lead with vibrato. */
export function lead(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const lp = new Biquad('lowpass', opts.cutoff ?? 2400, 0.7)
  let phase = 0
  const vibRate = opts.vibrato ?? 5.2
  const vibDepth = opts.vibDepth ?? 0.004
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    const vib = 1 + Math.sin(TAU * vibRate * t) * vibDepth * Math.min(1, t * 2)
    const dt = (freq * vib) / SR
    phase = (phase + dt) % 1
    const s = pulseAt(phase, dt, 0.42) * 0.6 + Math.sin(TAU * freq * 0.5 * t) * 0.25
    const env =
      attackCurve(t, opts.attack ?? 0.02) *
      (t > dur - 0.08 ? Math.max(0, (dur - t) / 0.08) : 1) *
      Math.exp(-t * (opts.decay ?? 0.35))
    out[i] = lp.process(s) * env * (opts.gain ?? 0.4)
  }
  return out
}

/** Short house-style chord stab. */
export function stab(freq, dur, opts = {}) {
  const n = Math.max(1, Math.floor(dur * SR))
  const out = new Float32Array(n)
  const lp = new Biquad('lowpass', 3000, 0.8)
  const voices = [1, 1.003, 0.997]
  const phases = new Float32Array(voices.length)
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    let s = 0
    for (let v = 0; v < voices.length; v += 1) {
      const dt = (freq * voices[v]) / SR
      phases[v] = (phases[v] + dt) % 1
      s += sawAt(phases[v], dt)
    }
    const env = attackCurve(t, 0.003) * Math.exp(-t * (opts.decay ?? 9))
    out[i] = lp.process(s / voices.length) * env * (opts.gain ?? 0.35)
  }
  return out
}

/* --------------------------------- drums --------------------------------- */

export function kick(dur = 0.45, opts = {}) {
  const n = Math.floor(dur * SR)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    const f = 46 + 120 * Math.exp(-t * 32)
    phase += f / SR
    const body = Math.sin(TAU * phase) * Math.exp(-t * 6.2)
    const click = Math.exp(-t * 180) * 0.35 * Math.sin(TAU * 1500 * t)
    out[i] = Math.tanh((body + click) * 1.25) * (opts.gain ?? 0.85)
  }
  return out
}

export function snare(dur = 0.3, opts = {}) {
  const n = Math.floor(dur * SR)
  const out = new Float32Array(n)
  const rnd = mulberry32(opts.seed ?? 7)
  const bp = new Biquad('bandpass', 1900, 0.8)
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    const noise = bp.process(rnd() * 2 - 1)
    const tone = Math.sin(TAU * 185 * t) * Math.exp(-t * 26) * 0.45
    out[i] = (noise * Math.exp(-t * 17) + tone) * (opts.gain ?? 0.55)
  }
  return out
}

export function hat(dur = 0.14, opts = {}) {
  const n = Math.floor(dur * SR)
  const out = new Float32Array(n)
  const rnd = mulberry32(opts.seed ?? 11)
  const hp = new Biquad('highpass', opts.open ? 5200 : 7200, 0.8)
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    const s = hp.process(rnd() * 2 - 1)
    out[i] = s * Math.exp(-t * (opts.open ? 12 : 46)) * (opts.gain ?? 0.28)
  }
  return out
}

export function clap(dur = 0.24, opts = {}) {
  const n = Math.floor(dur * SR)
  const out = new Float32Array(n)
  const rnd = mulberry32(opts.seed ?? 23)
  const bp = new Biquad('bandpass', 1600, 1.2)
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    let env = Math.exp(-t * 22)
    if (t < 0.02) env *= 0.4
    else if (t < 0.045) env = Math.max(env, Math.exp(-(t - 0.02) * 40) * 0.8)
    out[i] = bp.process(rnd() * 2 - 1) * env * (opts.gain ?? 0.4)
  }
  return out
}

/** Vinyl-ish dust layer for lo-fi tracks. */
export function vinyl(dur, opts = {}) {
  const n = Math.floor(dur * SR)
  const out = new Float32Array(n)
  const rnd = mulberry32(opts.seed ?? 99)
  const hp = new Biquad('highpass', 1200, 0.7)
  let hum = 0
  for (let i = 0; i < n; i += 1) {
    const t = i / SR
    hum += (rnd() * 2 - 1 - hum) * 0.02
    const crackle = rnd() < 0.00012 ? (rnd() * 2 - 1) * 0.7 : 0
    out[i] = (hp.process(hum) * 0.05 + crackle) * (opts.gain ?? 0.5)
  }
  return out
}

/* -------------------------------- renderer ------------------------------- */

export class Renderer {
  constructor(duration) {
    this.n = Math.max(1, Math.ceil(duration * SR))
    this.dryL = new Float32Array(this.n)
    this.dryR = new Float32Array(this.n)
    this.sendL = new Float32Array(this.n)
    this.sendR = new Float32Array(this.n)
  }

  add(mono, time, opts = {}) {
    const { gain = 1, pan = 0, send = 0 } = opts
    const start = Math.floor(time * SR)
    if (start >= this.n) return
    const len = Math.min(mono.length, this.n - start)
    const angle = ((pan + 1) * Math.PI) / 4
    const gl = Math.cos(angle) * gain
    const gr = Math.sin(angle) * gain
    for (let i = 0; i < len; i += 1) {
      const s = mono[i]
      if (start + i < 0) continue
      this.dryL[start + i] += s * gl
      this.dryR[start + i] += s * gr
      if (send > 0) {
        this.sendL[start + i] += s * gl * send
        this.sendR[start + i] += s * gr * send
      }
    }
  }

  finish(opts = {}) {
    const { wet = 0.3, decay = 0.78, fadeIn = 0.4, fadeOut = 2.2 } = opts
    const n = this.n
    const rvL = reverbChannel(this.sendL, decay)
    const rvR = reverbChannel(this.sendR, decay)
    const L = new Float32Array(n)
    const R = new Float32Array(n)
    let peak = 0

    for (let i = 0; i < n; i += 1) {
      const t = i / SR
      const dur = n / SR
      let g = 1
      if (t < fadeIn) g *= t / fadeIn
      if (t > dur - fadeOut) g *= Math.max(0, (dur - t) / fadeOut)
      const l = (this.dryL[i] + rvL[i] * wet) * g
      const r = (this.dryR[i] + rvR[i] * wet) * g
      L[i] = Math.tanh(l * 1.05)
      R[i] = Math.tanh(r * 1.05)
      const m = Math.max(Math.abs(L[i]), Math.abs(R[i]))
      if (m > peak) peak = m
    }

    const norm = peak > 0 ? 0.94 / peak : 1
    for (let i = 0; i < n; i += 1) {
      L[i] *= norm
      R[i] *= norm
    }
    return { left: L, right: R, duration: n / SR }
  }
}

/**
 * Schroeder-ish reverb: 4 damped feedback combs in parallel + 2 allpasses.
 * Cheap, but gives mixes depth and glue.
 */
function reverbChannel(input, decay) {
  const n = input.length
  const out = new Float32Array(n)
  const combDelays = [1557, 1617, 1491, 1422]
  const combs = combDelays.map((d) => ({ buf: new Float32Array(d), idx: 0, store: 0 }))
  const apDelays = [225, 556]
  const aps = apDelays.map((d) => ({ buf: new Float32Array(d), idx: 0 }))

  for (let i = 0; i < n; i += 1) {
    let sum = 0
    for (let c = 0; c < combs.length; c += 1) {
      const comb = combs[c]
      const y = comb.buf[comb.idx]
      comb.store = y * 0.6 + comb.store * 0.4
      comb.buf[comb.idx] = input[i] + comb.store * decay
      comb.idx = (comb.idx + 1) % comb.buf.length
      sum += y
    }
    sum *= 0.25
    for (let a = 0; a < aps.length; a += 1) {
      const ap = aps[a]
      const bufOut = ap.buf[ap.idx]
      const y = -sum + bufOut
      ap.buf[ap.idx] = sum + bufOut * 0.5
      ap.idx = (ap.idx + 1) % ap.buf.length
      sum = y
    }
    out[i] = sum
  }
  return out
}

/* ------------------------------- composition ----------------------------- */

const CHORD_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  min9: [0, 3, 7, 10, 14],
}

function chordNotes(chord) {
  return CHORD_INTERVALS[chord.type].map((i) => chord.root + i)
}

function drumEvents(style, bar, rand) {
  const ev = []
  const put = (step, inst, vel = 1) => ev.push({ step, inst, vel })
  const swing = (step) => (step % 4 === 2 ? 0.045 : 0)
  const push = (step, inst, vel) => ev.push({ step, inst, vel, swing: swing(step) })

  if (style === 'lofi') {
    push(0, 'kick', 1)
    push(10, 'kick', 0.8)
    if (bar % 4 === 3) push(14, 'kick', 0.6)
    push(4, 'snare', 0.85)
    push(12, 'snare', 0.9)
    for (let s = 0; s < 16; s += 2) push(s, 'hat', s % 4 === 0 ? 0.75 : 0.5)
    if (bar % 2 === 1) push(15, 'hat', 0.35)
  } else if (style === 'house') {
    for (let s = 0; s < 16; s += 4) put(s, 'kick', 1)
    for (let s = 2; s < 16; s += 4) put(s, 'hat', 0.55)
    put(4, 'clap', 0.8)
    put(12, 'clap', 0.8)
    put(14, 'hat', 0.4)
    if (bar % 4 === 3) put(10, 'hat', 0.5)
  } else if (style === 'synthwave') {
    put(0, 'kick', 1)
    put(8, 'kick', 0.95)
    put(4, 'snare', 0.85)
    put(12, 'snare', 0.9)
    for (let s = 0; s < 16; s += 2) put(s, 'hat', s % 4 === 0 ? 0.6 : 0.4)
    if (bar % 4 === 3) {
      put(14, 'snare', 0.5)
      put(15, 'snare', 0.65)
    }
  } else if (style === 'rock') {
    put(0, 'kick', 1)
    put(6, 'kick', 0.8)
    put(8, 'kick', 0.9)
    if (bar % 2 === 1) put(14, 'kick', 0.7)
    put(4, 'snare', 0.85)
    put(12, 'snare', 0.9)
    for (let s = 0; s < 16; s += 1) put(s, 'hat', s % 2 === 0 ? 0.5 : 0.25)
  } else if (style === 'idm') {
    put(0, 'kick', 1)
    put(7, 'kick', 0.7)
    put(10, 'kick', 0.85)
    put(4, 'snare', 0.75)
    put(13, 'snare', 0.8)
    const hats = [1, 3, 5, 9, 11, 12, 14, 15]
    for (const s of hats) put(s, 'hat', 0.25 + rand() * 0.45)
    if (bar % 4 === 2) put(6, 'clap', 0.5)
  } else if (style === 'ambient') {
    if (bar % 4 === 0) put(0, 'kick', 0.35)
  }

  return ev
}

/**
 * Compose and render a song from a compact description.
 */
export function composeSong(cfg) {
  const beatsPerBar = 4
  const barDur = (60 / cfg.bpm) * beatsPerBar
  const bars = Math.max(8, Math.round(cfg.targetDuration / barDur))
  const duration = bars * barDur + 1.6
  const r = new Renderer(duration)
  const rand = mulberry32(cfg.seed)
  const root = cfg.root
  const stepDur = barDur / 16
  const scale = cfg.scale ?? [0, 2, 3, 5, 7, 8, 10]

  const chords = cfg.chords.map((c) => ({ ...c, root: c.root ?? root }))

  // A short melodic idea reused across the song (repetition makes it feel composed).
  const motif = []
  for (let s = 0; s < 16; s += 1) {
    const active = rand() < (s % 2 === 0 ? 0.55 : 0.22)
    if (!active) {
      motif.push(null)
      continue
    }
    const degree = Math.floor(rand() * scale.length)
    const octave = rand() < 0.28 ? 12 : 0
    motif.push({ degree, octave, len: rand() < 0.3 ? 2 : 1, vel: 0.55 + rand() * 0.4 })
  }

  for (let bar = 0; bar < bars; bar += 1) {
    const time = bar * barDur
    const chord = chords[bar % chords.length]
    const notes = chordNotes(chord)
    const section = bar / bars
    const intensity = section < 0.16 ? 0.45 : section < 0.7 ? 0.85 : 0.7
    const at = (step) => time + step * stepDur

    // --- harmonic bed -------------------------------------------------
    if (cfg.parts.includes('pad')) {
      const voiced = notes.map((n) => n + (cfg.padOctave ?? 0))
      for (const n of voiced) {
        r.add(pad(mtof(n), barDur * 1.02, { cutoff: cfg.padCutoff ?? 900, attack: 0.35, decay: 0.05, gain: 0.2 }), time, {
          gain: 0.5 * intensity,
          pan: (rand() - 0.5) * 0.5,
          send: 0.5,
        })
      }
      r.add(pad(mtof(voiced[0] - 12), barDur, { cutoff: 600, attack: 0.3, gain: 0.28 }), time, {
        gain: 0.4,
        send: 0.35,
      })
    }

    if (cfg.parts.includes('rhodes')) {
      const pattern = cfg.keysPattern ?? [0, 3, 6, 10, 12]
      for (const step of pattern) {
        for (const n of notes) {
          r.add(rhodes(mtof(n), stepDur * 2.6, { gain: 0.34 }), at(step), {
            gain: 0.5 * intensity,
            pan: (rand() - 0.5) * 0.4,
            send: 0.3,
          })
        }
      }
    }

    if (cfg.parts.includes('stab')) {
      for (const step of cfg.stabPattern ?? [2, 7, 10, 14]) {
        for (const n of notes) {
          r.add(stab(mtof(n + 12), stepDur * 1.5, { gain: 0.22 }), at(step), {
            gain: 0.5,
            pan: (rand() - 0.5) * 0.6,
            send: 0.25,
          })
        }
      }
    }

    // --- bass ---------------------------------------------------------
    if (cfg.parts.includes('bass')) {
      const pattern = cfg.bassPattern ?? [0, 3, 6, 8, 11, 14]
      for (const step of pattern) {
        const note = step % 8 === 0 ? chord.root - 12 : chord.root - 12 + (step === 6 ? 7 : 0)
        r.add(bass(mtof(note), stepDur * 1.7, { saw: cfg.bassSaw ?? 0.65, cutoff: cfg.bassCutoff ?? 520 }), at(step), {
          gain: 0.55 * intensity,
          send: 0.05,
        })
      }
    }

    // --- arpeggio / pluck --------------------------------------------
    if (cfg.parts.includes('arp')) {
      const arpNotes = [...notes, notes[0] + 12]
      const steps = cfg.arpSteps ?? 16
      for (let s = 0; s < steps; s += 1) {
        const n = arpNotes[s % arpNotes.length] + (cfg.arpOctave ?? 12)
        const vel = s % 4 === 0 ? 0.9 : 0.6
        r.add(pluck(mtof(n), stepDur * 3.4, { brightness: 0.62, decay: 0.9, gain: 0.5 }), at(s), {
          gain: 0.35 * vel * intensity,
          pan: ((s % 4) - 1.5) * 0.12,
          send: 0.35,
        })
      }
    }

    // --- lead melody --------------------------------------------------
    if (cfg.parts.includes('lead')) {
      const playMotif = bar >= Math.floor(bars * 0.25)
      if (playMotif) {
        for (let s = 0; s < 16; s += 1) {
          const m = motif[(s + (bar % 2 === 0 ? 0 : 4)) % 16]
          if (!m) continue
          if (rand() < 0.25) continue
          const note = root + 24 + scale[m.degree] + m.octave
          const inst = cfg.leadKind ?? 'bell'
          const buf =
            inst === 'bell'
              ? bell(mtof(note), stepDur * 4, { gain: 0.3 })
              : inst === 'pluck'
                ? pluck(mtof(note), stepDur * 4, { brightness: 0.7, decay: 0.9, gain: 0.45 })
                : lead(mtof(note), stepDur * m.len * 1.2, { gain: 0.28 })
          r.add(buf, at(s), {
            gain: 0.5 * m.vel * intensity,
            pan: (rand() - 0.5) * 0.45,
            send: 0.45,
          })
        }
      }
    }

    // --- drums --------------------------------------------------------
    if (cfg.drums !== 'none') {
      const drumIntensity = bar < 2 ? intensity * 0.65 : intensity
      for (const e of drumEvents(cfg.drums, bar, rand)) {
        const t = at(e.step) + (e.swing ?? 0)
        const g = (e.vel ?? 0.8) * drumIntensity
        if (e.inst === 'kick') r.add(kick(0.5), t, { gain: 0.95 * g, send: 0.04 })
        else if (e.inst === 'snare') r.add(snare(0.32, { seed: 40 + e.step }), t, { gain: 0.7 * g, send: 0.16 })
        else if (e.inst === 'hat') r.add(hat(e.vel > 0.6 ? 0.16 : 0.1, { seed: 60 + e.step, open: e.step === 14 }), t, { gain: 0.5 * g, pan: 0.2, send: 0.05 })
        else if (e.inst === 'clap') r.add(clap(0.26, { seed: 80 + e.step }), t, { gain: 0.6 * g, pan: -0.15, send: 0.25 })
      }
    }
  }

  if (cfg.vinyl) {
    r.add(vinyl(duration), 0, { gain: 0.25, send: 0.1 })
    r.add(vinyl(duration, { seed: 1234, gain: 0.6 }), 0, { gain: 0.12, pan: 0.3 })
  }

  if (cfg.noiseSweep) {
    const n = Math.floor(barDur * 2 * SR)
    const sweep = new Float32Array(n)
    const rnd = mulberry32(555)
    const bp = new Biquad('bandpass', 400, 1.4)
    for (let i = 0; i < n; i += 1) {
      const t = i / SR
      if (i % 64 === 0) bp.set('bandpass', 300 + 4200 * (t / (n / SR)), 1.2)
      const env = Math.sin((Math.PI * t) / (n / SR))
      sweep[i] = bp.process(rnd() * 2 - 1) * env * 0.35
    }
    r.add(sweep, barDur * Math.floor(bars * 0.45), { gain: 0.5, send: 0.7 })
  }

  const mixed = r.finish({ wet: cfg.wet ?? 0.3, decay: cfg.decay ?? 0.78 })
  return mixed
}
