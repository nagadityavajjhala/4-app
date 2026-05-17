const PROMPTS = [
  'What made you smile today?',
  'Share a photo from your week.',
  'What are you grateful for right now?',
  'What song is on repeat for you?',
  'Describe your day in three words.',
  'What is something new you learned recently?',
  'Who do you want to check in on today?',
  'What is your comfort food this week?',
  'Share a small win you had today.',
  'What place would you love to visit next?',
  'What book, show, or podcast are you into?',
  'Send someone in this app a kind message.',
  'What is one goal for tomorrow?',
  'Share a childhood memory.',
  'What hobby are you enjoying lately?',
]

export function getDailyPrompt() {
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
  return PROMPTS[day % PROMPTS.length]
}
