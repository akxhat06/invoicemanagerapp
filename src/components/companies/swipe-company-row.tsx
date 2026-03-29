"use client";

import { useRef, useState } from "react";

const REVEAL_PX = 88;
const TRIGGER_PX = 56;

type Props = {
  children: React.ReactNode;
  /** Fires when swipe passes threshold on release — parent shows confirm and deletes */
  onSwipeDelete: () => void;
  disabled?: boolean;
};

/**
 * Swipe right on the row to reveal delete on the left; release past the threshold to trigger onSwipeDelete.
 */
export function SwipeCompanyRow({ children, onSwipeDelete, disabled }: Props) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const offsetRef = useRef(0);
  const blockNavClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    startX.current = e.clientX;
    startOffset.current = offsetRef.current;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || disabled) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 8) {
      blockNavClick.current = true;
    }
    let next = startOffset.current + dx;
    if (next < 0) next = 0;
    if (next > REVEAL_PX) next = REVEAL_PX;
    offsetRef.current = next;
    setOffset(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const end = offsetRef.current;
    if (end >= TRIGGER_PX && !disabled) {
      onSwipeDelete();
    }
    offsetRef.current = 0;
    setOffset(0);

    if (blockNavClick.current) {
      window.setTimeout(() => {
        blockNavClick.current = false;
      }, 120);
    }
  };

  return (
    <li
      className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-[box-shadow] hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600/80"
      aria-label="Company row; swipe right to delete"
    >
      <div
        className="absolute inset-y-0 left-0 flex w-[88px] items-center justify-center bg-red-600 dark:bg-red-700"
        aria-hidden
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/95">Delete</span>
      </div>

      <div
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (blockNavClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        className="bg-card relative"
      >
        {children}
      </div>
    </li>
  );
}
