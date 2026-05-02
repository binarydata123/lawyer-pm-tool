export const isOnline = (is_signedin: boolean, last_seen: string | null) => {
  if (!is_signedin) return false;
  if (!last_seen) return false;
  return Date.now() - new Date(last_seen).getTime() < 90_000;
};
