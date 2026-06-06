// Built-in prompt sets for benchmarking

export const STANDARD_PROMPTS = [
  'Explain quantum computing in simple terms.',
  'Write a short poem about the ocean.',
  'What are the main differences between SQL and NoSQL databases?',
  'Summarize the history of the internet in 3 sentences.',
  'What is the meaning of life according to different philosophers?',
];

export const CODING_PROMPTS = [
  'Write a Python function that sorts a list using merge sort.',
  'Create a React component for a todo list with add/delete.',
  'Explain how async/await works in JavaScript.',
  'Write a SQL query to find duplicate emails in a table.',
  'Implement a binary search algorithm in TypeScript.',
];

export const REASONING_PROMPTS = [
  'A farmer has 17 sheep. All but 9 die. How many are left?',
  'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
  'What comes next in the sequence: 2, 6, 12, 20, 30, ?',
  'A bat and a ball cost $1.10. The bat costs $1.00 more than the ball. How much does the ball cost?',
  'Three switches control one bulb in another room. You can only enter the room once. How do you determine which switch controls the bulb?',
];

export const ALL_PROMPT_SETS = {
  STANDARD: STANDARD_PROMPTS,
  CODING: CODING_PROMPTS,
  REASONING: REASONING_PROMPTS,
};
