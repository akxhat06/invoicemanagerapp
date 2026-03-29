export function formatDisplayName(
  username: string | undefined,
  email: string | undefined
): string {
  if (username?.trim()) {
    return username
      .trim()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const local = email?.split("@")[0] ?? "User";
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

export function firstName(displayName: string): string {
  const part = displayName.trim().split(/\s+/)[0] ?? displayName;
  return part || "there";
}
