"use client";
// hooks/useAuth.ts
// Hook-i za avtentikacijo in upravljanje seje

import { useState, useEffect, useCallback, useRef } from "react";
import { INACTIVE_MS, WARNING_S } from "@/lib/constants";

// ============================================================
// useCurrentUser — vrne prijavljeno uporabniško ime
// ============================================================
export function useCurrentUser() {
  const [username, setUsername] = useState("");
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.username || ""));
  }, []);
  return username;
}

// ============================================================
// useSessionTimeout — odštevalnik neaktivnosti
// ============================================================
export function useSessionTimeout() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    timerRef.current = setTimeout(() => {
      setCountdown(WARNING_S);
      let secs = WARNING_S;
      countdownRef.current = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          logout();
        }
      }, 1000);
    }, INACTIVE_MS);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  return { countdown, resetTimer, logout };
}
