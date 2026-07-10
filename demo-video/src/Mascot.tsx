/** Lumi, the PrismLearning.AI mascot — same mark as frontend/public/mascot-lumi-logo.svg,
 *  inlined as JSX so it can be sized/animated per-frame inside the video. */
export function Mascot({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lumi-face-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="lumi-face-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="lumi-face-c" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <radialGradient id="lumi-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
        <filter id="lumi-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#5B21B6" floodOpacity="0.35" />
        </filter>
      </defs>

      <circle cx="120" cy="120" r="118" fill="url(#lumi-glow)" />

      <g filter="url(#lumi-shadow)" transform="translate(20,26) scale(2)">
        <polygon points="50,8 88,72 50,58" fill="url(#lumi-face-a)" />
        <polygon points="50,8 50,58 12,72" fill="url(#lumi-face-b)" />
        <polygon points="12,72 50,58 88,72 50,92" fill="url(#lumi-face-c)" />
        <circle cx="42" cy="52" r="3.2" fill="#312E81" />
        <circle cx="60" cy="52" r="3.2" fill="#312E81" />
      </g>
    </svg>
  );
}
