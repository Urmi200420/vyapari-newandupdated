import { useEffect } from "react";

/*
  Sets up the "glass" look once for the whole app:
  1. an SVG filter that gently bends what is behind a glass button (Chrome / Edge only)
  2. a light that follows your finger or mouse across any element with class "glass"
  Pure CSS + SVG, so no extra scripts to load and nothing that can blank the page.
*/
export default function GlassDefs() {
  useEffect(() => {
    // refraction (backdrop-filter: url(#...)) only works in Chromium browsers
    if (/Chrome\//.test(navigator.userAgent)) {
      document.documentElement.classList.add("refract");
    }

    const move = (e) => {
      const el = e.target instanceof Element ? e.target.closest(".glass") : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);

  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="glass-refract" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.5" result="smooth" />
          <feDisplacementMap in="SourceGraphic" in2="smooth" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}