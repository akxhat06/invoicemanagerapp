"use client";

import { workspaceUiStorageKey } from "@/lib/workspace-ui-session";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const DEBOUNCE_MS = 400;

type Options<T> = {
  route: string;
  version: number;
  buildSnapshot: () => T;
  applyRestore: (data: T) => void;
  /** When false, restore is skipped (e.g. data not ready). */
  restoreReady: boolean;
  saveDeps: unknown[];
};

/**
 * Persists lightweight UI state to sessionStorage so returning from another app / tab
 * (or after a frozen tab) can reopen sheets and drafts. Clears when the tab is closed.
 */
export function useWorkspaceUiSession<T extends { v: number }>({
  route,
  version,
  buildSnapshot,
  applyRestore,
  restoreReady,
  saveDeps,
}: Options<T>): void {
  const storageKey = workspaceUiStorageKey(route);
  const restoredRef = useRef(false);
  const buildRef = useRef(buildSnapshot);
  buildRef.current = buildSnapshot;
  const applyRef = useRef(applyRestore);
  applyRef.current = applyRestore;

  const flushSave = useCallback(() => {
    if (!restoredRef.current || typeof window === "undefined") return;
    try {
      const snap = buildRef.current();
      sessionStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* quota / private mode */
    }
  }, [storageKey]);

  useLayoutEffect(() => {
    if (!restoreReady || restoredRef.current) return;
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) {
        restoredRef.current = true;
        return;
      }
      const data = JSON.parse(raw) as T;
      if (data.v !== version) {
        sessionStorage.removeItem(storageKey);
        restoredRef.current = true;
        return;
      }
      applyRef.current(data);
    } catch {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    restoredRef.current = true;
  }, [restoreReady, storageKey, version]);

  useEffect(() => {
    if (!restoredRef.current) return;
    const id = window.setTimeout(flushSave, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller lists all snapshot inputs
  }, saveDeps);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    const onPageHide = () => flushSave();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flushSave]);
}
