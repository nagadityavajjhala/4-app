export const TRIVIA_QUESTIONS = [
  { q: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
  { q: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], answer: 2 },
  { q: 'What gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
  { q: 'What is the capital of Japan?', options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], answer: 2 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
  { q: 'What is H2O commonly known as?', options: ['Salt', 'Water', 'Air', 'Sugar'], answer: 1 },
  { q: 'Which animal is the largest mammal?', options: ['Elephant', 'Blue whale', 'Giraffe', 'Shark'], answer: 1 },
  { q: 'What year did the Titanic sink?', options: ['1905', '1912', '1920', '1931'], answer: 1 },
]

export function pickTriviaQuestion(seed) {
  return TRIVIA_QUESTIONS[seed % TRIVIA_QUESTIONS.length]
}
