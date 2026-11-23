import Lenis from "lenis";

/*
  iPhone-style smooth scrolling (momentum + easing) using the Lenis library.
  - Tweak the feel with `lerp` (smaller = floatier, bigger = snappier).
  - Anything with its own inner scrollbar needs the attribute data-lenis-prevent.
*/
let lenis = null;

export function startSmoothScroll() {
  if (lenis) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.9,
    smoothWheel: true,
    autoRaf: true,
  });

  return () => {
    lenis?.destroy();
    lenis = null;
  };
}

// Glide to an element (falls back to the browser's own smooth scroll)
export function scrollToElement(el, offset = -96) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.3 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}