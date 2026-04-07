const PREFIX = "vse/ws/ui/";

export function workspaceUiStorageKey(route: string): string {
  return `${PREFIX}${route}`;
}

export function clearAllWorkspaceUiSessions(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
