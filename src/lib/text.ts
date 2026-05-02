export function capitalizeFirst(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trimStart();
  if (!trimmed) return "";

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export const parseInviteEmails = (rawValue: string) =>
  Array.from(
    new Set(
      rawValue
        .split(/[\n,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
