// Simple line icons — Lucide-inspired, minimal strokes
export const Icon = ({ name, size = 18, stroke = 1.6, className = "", style = {} }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round",
    className, style,
  };
  switch (name) {
    case "calendar":
      return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>);
    case "calendarDays":
      return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M7.5 13h.01"/><path d="M12 13h.01"/><path d="M16.5 13h.01"/><path d="M7.5 17h.01"/><path d="M12 17h.01"/></svg>);
    case "luggage":
      return (<svg {...props}><rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M5 12h14"/><path d="M9 20v1"/><path d="M15 20v1"/></svg>);
    case "meal":
      // Couverts (fourchette à gauche, couteau à droite) — symbole repas universel.
      return (<svg {...props}><path d="M7 3v7a2 2 0 0 0 2 2v9"/><path d="M11 3v7"/><path d="M9 3v7"/><path d="M15 21v-7c0-3 2-5 2-7V3"/></svg>);
    case "list":
      return (<svg {...props}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h12"/></svg>);
    case "basket":
      return (<svg {...props}><path d="M3 8h18l-2 11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 8z"/><path d="M8 8l3-5"/><path d="M16 8l-3-5"/><path d="M10 13v4"/><path d="M14 13v4"/></svg>);
    case "book":
      return (<svg {...props}><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1 0-4h13"/></svg>);
    case "home":
      return (<svg {...props}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>);
    case "history":
      return (<svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></svg>);
    case "sparkle":
      return (<svg {...props}><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M6 6l2.5 2.5"/><path d="M15.5 15.5L18 18"/><path d="M6 18l2.5-2.5"/><path d="M15.5 8.5L18 6"/></svg>);
    case "plus":
      return (<svg {...props}><path d="M12 5v14"/><path d="M5 12h14"/></svg>);
    case "search":
      return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>);
    case "clock":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case "users":
      return (<svg {...props}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14c3 .3 5 2.2 5 5"/></svg>);
    case "filter":
      return (<svg {...props}><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>);
    case "more":
      return (<svg {...props}><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></svg>);
    case "x":
      return (<svg {...props}><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>);
    case "check":
      return (<svg {...props}><path d="M4 12l5 5 11-12"/></svg>);
    case "chevronL":
      return (<svg {...props}><path d="M15 6l-6 6 6 6"/></svg>);
    case "chevronR":
      return (<svg {...props}><path d="M9 6l6 6-6 6"/></svg>);
    case "chevronD":
      return (<svg {...props}><path d="M6 9l6 6 6-6"/></svg>);
    case "note":
      return (<svg {...props}><path d="M5 4h11l4 4v12H5z"/><path d="M16 4v4h4"/><path d="M8 13h7"/><path d="M8 17h5"/></svg>);
    case "leaf":
      return (<svg {...props}><path d="M5 19c0-7 5-12 14-13-1 8-6 13-13 13"/><path d="M5 19c2-4 6-7 10-8"/></svg>);
    case "print":
      return (<svg {...props}><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><rect x="7" y="14" width="10" height="7"/></svg>);
    case "share":
      return (<svg {...props}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>);
    case "drag":
      return (<svg {...props}><circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/></svg>);
    case "trash":
      return (<svg {...props}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>);
    case "wand":
      return (<svg {...props}><path d="M4 20l13-13"/><path d="M14 4l2 2"/><path d="M18 8l2 2"/><path d="M9 3v3"/><path d="M20 14h3"/></svg>);
    case "settings":
      return (<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2.1-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2.1 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.6a7 7 0 0 0 2.1-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>);
    case "circle":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/></svg>);
    case "upload":
      return (<svg {...props}><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/></svg>);
    case "download":
      return (<svg {...props}><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M12 16V3"/><path d="M7 11l5 5 5-5"/></svg>);
    case "c-entree": // bol (entrée)
      return (<svg {...props}><path d="M3 11h18"/><path d="M5 11a7 7 0 0 1 14 0"/><path d="M6 11l1.2 6a2 2 0 0 0 2 1.6h5.6a2 2 0 0 0 2-1.6L18 11"/></svg>);
    case "c-plat": // fourchette + cuillère (plat)
      return (<svg {...props}><path d="M6 3v6a2 2 0 0 0 4 0V3"/><path d="M8 9v12"/><path d="M16 3c-1.4 0-2.3 1.9-2.3 4.5S14.6 12 16 12s2.3-1.9 2.3-4.5S17.4 3 16 3z"/><path d="M16 12v9"/></svg>);
    case "c-dessert": // part de gâteau (dessert)
      return (<svg {...props}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13h16v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="6" r="1.3"/><path d="M12 7.3V10"/></svg>);
    case "tasks": // presse-papier + coche
      return (<svg {...props}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 12.5l2 2 4-4"/></svg>);
    case "menu":
      return (<svg {...props}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>);
    default:
      return null;
  }
};

// Tiny stylized ingredient "glyph" — used as recipe avatar
export const RecipeGlyph = ({ glyph, color, size = 36 }) => {
  const bg = color + "1f"; // hex alpha ~12%
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: bg, display: "grid", placeItems: "center",
      flexShrink: 0,
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {glyph === "spear" && (
          <>
            <path d="M12 3v18"/>
            <path d="M9 7c1 1 2 1.5 3 1.5S14 8 15 7"/>
            <path d="M9 12c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>
            <path d="M9 17c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>
          </>
        )}
        {glyph === "round" && (
          <>
            <circle cx="12" cy="14" r="6"/>
            <path d="M12 8v-3"/>
            <path d="M10 5c1 1 3 1 4 0"/>
          </>
        )}
        {glyph === "dots" && (
          <>
            <circle cx="8" cy="13" r="2.2"/>
            <circle cx="14" cy="10" r="2.2"/>
            <circle cx="15" cy="16" r="2.2"/>
            <path d="M6 13c-1-3 1-6 4-7"/>
          </>
        )}
        {glyph === "leaf" && (
          <>
            <path d="M5 19c0-7 5-12 14-13-1 8-6 13-13 13"/>
            <path d="M5 19c2-4 6-7 10-8"/>
          </>
        )}
        {glyph === "wave" && (
          <>
            <path d="M4 10c2-2 4-2 6 0s4 2 6 0 3-1 4 0"/>
            <path d="M4 15c2-2 4-2 6 0s4 2 6 0 3-1 4 0"/>
          </>
        )}
        {!["spear", "round", "dots", "leaf", "wave"].includes(glyph) && (
          <>
            <path d="M7 3v6a2 2 0 0 0 4 0V3"/>
            <path d="M9 11v10"/>
            <path d="M16 3c-1.4 0-2.3 1.9-2.3 4.5S14.6 12 16 12s2.3-1.9 2.3-4.5S17.4 3 16 3z"/>
            <path d="M16 12v9"/>
          </>
        )}
      </svg>
    </div>
  );
};
