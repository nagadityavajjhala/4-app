let audioCtx = null
let gainNode = null
let osc1 = null
let osc2 = null
let timeoutId = null

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

export function startRinging() {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    if (!gainNode) {
      gainNode = ctx.createGain()
      gainNode.gain.value = 0
      gainNode.connect(ctx.destination)
    }

    let playing = true

    function ringCycle() {
      if (!playing) return

      osc1 = ctx.createOscillator()
      osc2 = ctx.createOscillator()
      const g1 = ctx.createGain()
      const g2 = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.value = 440
      osc2.type = 'sine'
      osc2.frequency.value = 554.37

      g1.gain.setValueAtTime(0, ctx.currentTime)
      g1.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.08)
      g1.gain.setValueAtTime(0.06, ctx.currentTime + 0.6)
      g1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)

      g2.gain.setValueAtTime(0, ctx.currentTime)
      g2.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.08)
      g2.gain.setValueAtTime(0.04, ctx.currentTime + 0.6)
      g2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)

      osc1.connect(g1).connect(gainNode)
      osc2.connect(g2).connect(gainNode)

      osc1.start(ctx.currentTime)
      osc2.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.8)
      osc2.stop(ctx.currentTime + 0.8)

      osc1.onended = () => {
        osc1 = null
        osc2 = null
      }

      const interval = 1600
      timeoutId = setTimeout(() => {
        if (playing) ringCycle()
      }, interval)
    }

    ringCycle()

    return () => {
      playing = false
      clearTimeout(timeoutId)
      if (osc1) { try { osc1.stop() } catch {} }
      if (osc2) { try { osc2.stop() } catch {} }
      osc1 = null
      osc2 = null
    }
  } catch {
    return () => {}
  }
}

export function stopRinging() {
  clearTimeout(timeoutId)
  if (osc1) { try { osc1.stop() } catch {} }
  if (osc2) { try { osc2.stop() } catch {} }
  osc1 = null
  osc2 = null
  timeoutId = null
}
