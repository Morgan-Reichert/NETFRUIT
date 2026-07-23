import type { SVGProps } from 'react'

/** Shared stroke-icon set — replaces emoji throughout the UI. */
type P = SVGProps<SVGSVGElement> & { size?: number }

function base(p: P) {
  const { size = 20, strokeWidth = 2, ...rest } = p
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }
}

export const PlayIcon = ({ size = 20, ...p }: P) => (
  <svg {...base({ size, ...p })} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
)
export const PauseIcon = ({ size = 20, ...p }: P) => (
  <svg {...base({ size, ...p })} fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>
)
export const ThumbUpIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
    <path d="M7 10l4.5-7a2 2 0 0 1 3.5 1.9L14 9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" />
  </svg>
)
export const ThumbDownIcon = (p: P) => (
  <svg {...base(p)} style={{ transform: 'rotate(180deg)', ...p.style }}>
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
    <path d="M7 10l4.5-7a2 2 0 0 1 3.5 1.9L14 9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" />
  </svg>
)
export const VolumeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  </svg>
)
export const MuteIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
)
export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
export const BellIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)
export const SettingsIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const ChevronRight = (p: P) => (
  <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
)
export const ChevronLeft = (p: P) => (
  <svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>
)
export const ChevronDown = (p: P) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
)
export const ReplayIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
)
export const InfoIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
)
export const SparklesIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.8z" />
    <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
)
export const FlameIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2c1 3-1 5-2 6-1.2 1.2-2 2.6-2 4a4 4 0 0 0 8 0c0-1.2-.4-2.2-1-3 .3 1.6-1 2-1 2 .4-2-1-4-2-4 .6-2 .3-3.7 2-5z" />
  </svg>
)
export const BasketIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 11h14l-1.2 8.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
    <path d="M9 11 12 4l3 7M3 11h18" />
  </svg>
)
export const FilmIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </svg>
)
export const UserIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
)
export const CaptionsIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 11a2 2 0 1 0 0 2M15 11a2 2 0 1 0 0 2" />
  </svg>
)
export const MusicIcon = (p: P) => (
  <svg {...base(p)}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
)
export const GaugeIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="m14 11 4-3" /><path d="M4 18a9 9 0 1 1 16 0" /></svg>
)

// --- extra icons (replace emoji across the app) ---
export const CoinIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0M9.5 14.5a2.5 2.5 0 0 0 5 0M12 7v1M12 16v1" /></svg>
)
export const GemIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18M9 3l3 6 3-6M12 9l0 12" /></svg>
)
export const ChartIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" /></svg>
)
export const HourglassIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9" /></svg>
)
export const UsersIcon = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3" /><path d="M4 20a5 5 0 0 1 10 0M16 6a3 3 0 0 1 0 6M20 20a5 5 0 0 0-3-4.6" /></svg>
)
export const MegaphoneIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1zM18 8a4 4 0 0 1 0 8" /></svg>
)
export const StarIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9z" /></svg>
)
export const SparkIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
)
export const FireIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 1-3-1-5 2 0 3 1 3 0z" /></svg>
)
export const CardIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
)
export const FrownIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8 15c1-1.5 2.3-2 4-2s3 .5 4 2M9 9h.01M15 9h.01" /></svg>
)
export const EditIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 20h4L18 10l-4-4L4 16zM13 5l4 4" /></svg>
)
export const TrashIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
)
export const TvIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 21h8M12 6 8 3M12 6l4-3" /></svg>
)
