// Developed by Sydney Edwards

/** Origin for Socket.io (no `/api` suffix). */
export function getSocketUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";
  return base.replace(/\/?api\/?$/, "") || "http://localhost:3001";
}
