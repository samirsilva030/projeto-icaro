let ctx

function context() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function unlockAudio() {
  try {
    context()
  } catch {
    /* autoplay policies */
  }
}

export function playTone(enabled, { freq = 440, dur = 0.08, type = 'square', gain = 0.03, slide } = {}) {
  if (!enabled) return
  try {
    const audio = context()
    const osc = audio.createOscillator()
    const amp = audio.createGain()
    osc.type = type
    osc.frequency.value = freq
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, audio.currentTime + dur)
    amp.gain.value = gain
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur)
    osc.connect(amp)
    amp.connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + dur + 0.02)
  } catch {
    /* ignore */
  }
}

export function playClick(enabled) {
  playTone(enabled, { freq: 520, dur: 0.05, type: 'square', gain: 0.02 })
}

export function playWarn(enabled) {
  playTone(enabled, { freq: 180, dur: 0.18, type: 'sawtooth', gain: 0.02, slide: 90 })
}

export function playGood(enabled) {
  playTone(enabled, { freq: 520, dur: 0.12, type: 'triangle', gain: 0.03, slide: 780 })
}

export function playBad(enabled) {
  playTone(enabled, { freq: 220, dur: 0.22, type: 'sawtooth', gain: 0.025, slide: 70 })
}
