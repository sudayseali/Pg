export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : size === 'lg'
        ? 'h-11 w-11 rounded-xl'
        : 'h-9 w-9 rounded-lg';

  const svgDims = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center border border-blue-400/30 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] ${dims}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgDims}
        aria-hidden="true"
      >
        <path
          d="M6.5 19V5H13.25C16.15 5 18.25 6.85 18.25 9.6C18.25 12.35 16.15 14.2 13.25 14.2H10.25"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.25 14.2L14.5 19"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.65"
        />
      </svg>
    </div>
  );
}
