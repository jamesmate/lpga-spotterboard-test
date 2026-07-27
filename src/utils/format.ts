/** Last word of a player's name — used for compact, scoreboard-style labels. */
export function surname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}
