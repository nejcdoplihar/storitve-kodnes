"use client";
// hooks/useMountedAnim.ts
// Vrne false v prvem framu, nato true — uporabno za triggering CSS transitions
// na začetnem mount-u (npr. SVG chart bari rastejo iz 0).

import { useEffect, useState } from "react";

export function useMountedAnim(delay = 50): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return mounted;
}
