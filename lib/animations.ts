// lib/animations.ts
// Skupne konstante in helperji za animacije v admin vmesniku.
// Pridruženi CSS keyframes / utility class-i so v app/globals.css.

// ============================================================
// EASING KRIVULJE
// ============================================================
export const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.45, 0.05, 0.55, 0.95)";
export const EASE_STANDARD = "ease-out";

// ============================================================
// TRAJANJA (ms)
// ============================================================
export const DUR_FAST = 200;   // view transition, hover
export const DUR_MED = 350;    // fade-up vsebine
export const DUR_LONG = 700;   // chart bar/donut animacije

// ============================================================
// STAGGER — zamiki za zaporedno animiranje seznamov
// ============================================================
export const STAGGER = 50;          // vrstice tabel
export const STAGGER_CARDS = 70;    // kartice v vrsti
export const STAGGER_CHART = 90;    // segmenti grafa

// ============================================================
// HELPERJI
// ============================================================
/**
 * Vrne `animation-delay` style vrednost za stagger pozicijo.
 * Uporabi pri zaporednih elementih (npr. `.ka-fade-up` z zamikom).
 */
export function staggerDelay(index: number, base = 0, step = STAGGER): string {
  return `${base + index * step}ms`;
}

/**
 * Vrne CSS transition string za eno lastnost z standardnim easing-om.
 */
export function transition(property: string, duration: number = DUR_MED, easing: string = EASE_OUT, delay = 0): string {
  return `${property} ${duration}ms ${easing}${delay ? ` ${delay}ms` : ""}`;
}
