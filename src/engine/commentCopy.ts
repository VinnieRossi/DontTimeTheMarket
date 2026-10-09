/** Maps the engine's commentary keys (see comments.ts) to actual copy.
 * Keeping the words here, outside engine state, means a replayed action
 * log compares cleanly on keys even if this copy changes later. */
export const COMMENT_COPY: Record<string, string> = {
  "winning-1": "Looks like you're doing great! (for now)",
  "winning-2": "Diamond hands, allegedly.",
  "winning-3": "The chart likes you today.",
  "winning-4": "Careful, confidence is expensive.",
  "losing-1": "I hope you didn't quit your job to day trade.",
  "losing-2": "This is not financial advice. Neither was that trade.",
  "losing-3": "The benchmark is not impressed.",
  "losing-4": "It's not a loss until you sell. Or is it.",
  "overtrading-1": "That's a lot of trades for someone who could've just... not.",
  "overtrading-2": "Our fee calculator wants to thank you personally.",
  "overtrading-3": "Have you considered doing nothing?",
  "cash-1": "Sitting in cash, very bold, very safe, very unlikely to win.",
  "cash-2": "The Bogle NPC is out here working. You are not.",
};
