import { useId } from 'react';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const uid = useId().replace(/:/g, '');
  const leftId = `pv-hex-left-${uid}`;
  const rightId = `pv-hex-right-${uid}`;
  const coreId = `pv-hex-core-${uid}`;

  const dims =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  return (
    <div className={`relative flex shrink-0 items-center justify-center ${dims}`}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-[0_4px_12px_rgba(37,99,235,0.35)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={leftId} x1="4" y1="6" x2="18" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id={rightId} x1="18" y1="3" x2="32" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id={coreId} x1="12" y1="10" x2="25" y2="25" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
        {/* Outer isometric faceted hexagon */}
        <path
          d="M18 2.5L31.4 10.25V25.75L18 33.5L4.6 25.75V10.25L18 2.5Z"
          fill="#0B1328"
          stroke="rgba(96, 165, 250, 0.4)"
          strokeWidth="1.2"
        />
        {/* Left cyan-blue facet */}
        <path
          d="M18 4.2L6.2 11V25L13.6 29.3V14.8L18 12.2V4.2Z"
          fill={`url(#${leftId})`}
        />
        {/* Right cobalt-blue facet */}
        <path
          d="M18 4.2L29.8 11V21.5L22.5 25.7V14.8L18 12.2V4.2Z"
          fill={`url(#${rightId})`}
        />
        {/* Center geometric P bridge */}
        <path
          d="M13.6 14.8L22.5 14.8L22.5 21.8L13.6 25.2V14.8Z"
          fill={`url(#${coreId})`}
          fillOpacity="0.92"
        />
        {/* Crisp negative-space inner P aperture */}
        <path
          d="M16.1 14.6L21.5 14.6C23.1 14.6 24.1 15.6 24.1 17.1C24.1 18.6 23.1 19.6 21.5 19.6L16.1 19.6V14.6Z"
          fill="#070C1B"
        />
      </svg>
    </div>
  );
}
