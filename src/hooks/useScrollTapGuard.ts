"use client";

import { useCallback, useRef } from "react";

const DRAG_THRESHOLD_PX = 10;

/**
 * Ignore taps on buttons inside a horizontally scrollable row when the user
 * was swiping — prevents Boys/Girls toggles firing during filter-row scroll.
 */
export function useScrollTapGuard() {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) return;
    const dx = Math.abs(e.clientX - startX.current);
    const dy = Math.abs(e.clientY - startY.current);
    if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
      dragging.current = true;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    window.setTimeout(() => {
      dragging.current = false;
    }, 80);
  }, []);

  const shouldIgnoreTap = useCallback(() => dragging.current, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClickCapture,
    shouldIgnoreTap,
  };
}
