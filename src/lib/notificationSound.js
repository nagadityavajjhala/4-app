let audioCtx = null

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

export function playMessageSound() {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const g1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 523.25
    g1.gain.setValueAtTime(0, now)
    g1.gain.linearRampToValueAtTime(0.08, now + 0.01)
    g1.gain.setValueAtTime(0.08, now + 0.06)
    g1.gain.linearRampToValueAtTime(0, now + 0.12)
    osc1.connect(g1).connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.12)

    const osc2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 659.25
    g2.gain.setValueAtTime(0, now + 0.08)
    g2.gain.linearRampToValueAtTime(0.08, now + 0.09)
    g2.gain.setValueAtTime(0.08, now + 0.14)
    g2.gain.linearRampToValueAtTime(0, now + 0.2)
    osc2.connect(g2).connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.2)
  } catch {}
}
