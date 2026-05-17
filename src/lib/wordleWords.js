export const WORDLE_WORDS = [
  'APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HEART',
  'IVORY', 'JOKER', 'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PIANO',
  'QUEEN', 'RIVER', 'SMILE', 'TABLE', 'UNITY', 'VOICE', 'WATER', 'YOUTH',
  'ZEBRA', 'BREAD', 'CLOUD', 'DREAM', 'EARTH', 'FROST', 'GREEN', 'HAPPY',
  'LIGHT', 'MAGIC', 'PEACE', 'QUICK', 'STORM', 'TRUTH', 'WORLD', 'BLOOM',
]

export function pickWordleWord(seed) {
  return WORDLE_WORDS[seed % WORDLE_WORDS.length]
}

export function scoreGuess(guess, answer) {
  const result = []
  const answerArr = answer.split('')
  const used = Array(5).fill(false)

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answerArr[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue
    const idx = answerArr.findIndex((c, j) => c === guess[i] && !used[j])
    if (idx >= 0) {
      result[i] = 'present'
      used[idx] = true
    } else {
      result[i] = 'absent'
    }
  }
  return result
}
