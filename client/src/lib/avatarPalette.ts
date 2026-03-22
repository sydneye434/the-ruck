// Developed by Sydney Edwards
/** Eight pink shades from `index.css` — use for avatars and poker identity chips. */
export const AVATAR_COLOR_VARIABLES = [
  "var(--color-avatar-1)",
  "var(--color-avatar-2)",
  "var(--color-avatar-3)",
  "var(--color-avatar-4)",
  "var(--color-avatar-5)",
  "var(--color-avatar-6)",
  "var(--color-avatar-7)",
  "var(--color-avatar-8)"
] as const;

export function pickAvatarColor(seedValue: string) {
  const seed = seedValue.trim().toLowerCase();
  if (!seed) return AVATAR_COLOR_VARIABLES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return AVATAR_COLOR_VARIABLES[Math.abs(hash) % AVATAR_COLOR_VARIABLES.length];
}
