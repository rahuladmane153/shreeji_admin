/** Motivational proverbs shown on the mobile dashboard, one per day. */
const QUOTES = [
  { text: 'Honesty is the first chapter in the book of wisdom.', author: 'Thomas Jefferson' },
  { text: 'Trust is built with consistency.', author: 'Lincoln Chafee' },
  { text: 'Satyameva Jayate — Truth alone triumphs.', author: 'Mundaka Upanishad' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Small steps every day lead to big results.', author: 'Proverb' },
  { text: 'Do the right thing, even when no one is looking.', author: 'Proverb' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Integrity is doing the right thing when it is not convenient.', author: 'Proverb' },
  { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C. S. Lewis' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { text: 'Arise, awake, and stop not till the goal is reached.', author: 'Swami Vivekananda' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'Hard work beats talent when talent does not work hard.', author: 'Tim Notke' },
  { text: 'Be the change that you wish to see in the world.', author: 'Mahatma Gandhi' },
  { text: 'Excellence is not an act, but a habit.', author: 'Aristotle' },
  { text: 'Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.', author: 'A. P. J. Abdul Kalam' },
  { text: 'Well begun is half done.', author: 'Aristotle' },
  { text: 'Patience and perseverance have a magical effect before which difficulties disappear.', author: 'John Quincy Adams' },
  { text: 'A clear conscience is a soft pillow.', author: 'Proverb' },
];

/** Same quote for everyone on a given day (IST), changing daily. */
function quoteOfTheDay(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const day = Math.floor(ist.getTime() / 86400000);
  return QUOTES[day % QUOTES.length];
}

module.exports = { quoteOfTheDay };
