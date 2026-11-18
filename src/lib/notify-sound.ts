const SOUND_KEY = 'rate:chat-sound'

let audio: AudioContext | null = null

export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off')
  } catch {
    /* private mode */
  }
  if (enabled) playNotificationTone(true)
  window.dispatchEvent(new Event('monah:notify-settings'))
}

/** Must run after a user gesture so browsers allow audio. */
export function unlockNotificationSound(): void {
  if (audio) {
    if (audio.state === 'suspended') void audio.resume()
    return
  }
  try {
    audio = new AudioContext()
    void audio.resume()
  } catch {
    audio = null
  }
}

export function playNotificationTone(force = false): void {
  if (!force && !isSoundEnabled()) return
  try {
    if (!audio) audio = new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    const now = audio.currentTime
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now)
    oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.14)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.24)
  } catch {
    /* audio blocked */
  }
}
