/** Local calendar day of the browser — the streak follows the listener's midnight. */
export function localDay(date = new Date()): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 10)
}

/** Seconds of listening that close the day. Mirrors STREAK_GOAL_SECONDS on the server. */
export const STREAK_GOAL_SECONDS = 60
