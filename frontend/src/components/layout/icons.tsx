/** Inline stroke icons — no icon-font dependency, every glyph inherits `currentColor` in both themes. */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const NAV_ICONS = {
  gauge: (
    <svg {...base} aria-hidden>
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="m13.4 10.6 4.1-4.1" />
      <path d="M3.3 17A9 9 0 1 1 20.7 17" />
    </svg>
  ),
  users: (
    <svg {...base} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  cart: (
    <svg {...base} aria-hidden>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.6 12h11l2-8H6" />
    </svg>
  ),
  invoice: (
    <svg {...base} aria-hidden>
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5M9 12h6M9 16h6" />
    </svg>
  ),
  wallet: (
    <svg {...base} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h13v4" />
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2Z" />
      <circle cx="17" cy="14" r="1" />
    </svg>
  ),
  chart: (
    <svg {...base} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="m7 14 3-3 3 3 5-6" />
    </svg>
  ),
  gear: (
    <svg {...base} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 7.8l1.7 1M18.1 15.2l1.7 1M3 12h2M19 12h2M4.2 16.2l1.7-1M18.1 8.8l1.7-1" />
    </svg>
  ),
}

export const UI_ICONS = {
  ...NAV_ICONS,
  menu: (
    <svg {...base} aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  chevron: (
    <svg {...base} width={16} height={16} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  sun: (
    <svg {...base} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  moon: (
    <svg {...base} aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
  globe: (
    <svg {...base} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </svg>
  ),
  plus: (
    <svg {...base} width={16} height={16} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  search: (
    <svg {...base} width={16} height={16} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  car: (
    <svg {...base} aria-hidden>
      <path d="M5 17h14M6.5 17v2M17.5 17v2" />
      <path d="M4 17v-4l2-5h12l2 5v4" />
      <circle cx="7.5" cy="13.5" r="1" />
      <circle cx="16.5" cy="13.5" r="1" />
    </svg>
  ),
  alert: (
    <svg {...base} aria-hidden>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  ),
  coins: (
    <svg {...base} aria-hidden>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  ),
}
