import { useEffect, useState } from "react";
// ONE ring of icons: veggies + electronics + clothes
const ICONS = ["🥦", "📱", "👕", "🍎", "💻", "👗", "🥕", "🎧", "👟"];

const ORBIT_MS = 2200; // icons go around ONCE
const NAME_MS = 500;   // Vyapari name stays this long
const FADE_MS = 400;   // fade-out at the end

function Ring({ items, radius, duration }) {
  return (
    <div className="ring" style={{ animationDuration: duration + "s" }}>
      {items.map((icon, i) => (
        <div
          key={i}
          className="ring-item"
          style={{ "--a": (360 / items.length) * i + "deg", "--r": radius }}
        >
          <span style={{ animationDuration: duration + "s", animationDirection: "reverse" }}>
            {icon}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Intro({ onDone }) {
  const [phase, setPhase] = useState("orbit"); // orbit -> name -> leave

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("name"), ORBIT_MS);
    const t2 = setTimeout(() => setPhase("leave"), ORBIT_MS + NAME_MS);
    const t3 = setTimeout(onDone, ORBIT_MS + NAME_MS + FADE_MS);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className={"intro intro-" + phase}>
      <div className="orbit">
        <Ring items={ICONS} radius="min(150px, 34vw)" duration={ORBIT_MS / 1000} />
        
        <div className="orbit-core" />
      </div>

      <h1 className="intro-title" aria-label="Vyapari">
        {"Vyapari".split("").map((ch, i) => (
          <span key={i} style={{ animationDelay: i * 25 + "ms" }}>
            {ch}
          </span>
        ))}
      </h1>

      
       
     
    </div>
  );
}