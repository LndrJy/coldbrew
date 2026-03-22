type CoffeePourLoaderProps = {
  size?: number
  className?: string
}

export default function CoffeePourLoader({ size = 180, className = '' }: CoffeePourLoaderProps) {
  return (
    <div className={`loader-wrap coffee-loader ${className}`.trim()} aria-label="Loading" role="status">
      <svg width={size} height={size} viewBox="0 0 180 180" aria-hidden="true">
        <rect x="0" y="0" width="180" height="180" fill="var(--background)" />

        <g className="coffee-stream">
          <rect x="86" y="16" width="8" height="58" className="ink-fill" />
        </g>

        <g className="ink-stroke">
          <path d="M44 74 H124 V138 H44 Z" />
          <path d="M124 88 H142 V122 H124" />
        </g>

        <clipPath id="coffee-mug-clip">
          <rect x="46" y="76" width="76" height="60" />
        </clipPath>

        <g clipPath="url(#coffee-mug-clip)">
          <rect x="46" y="76" width="76" height="60" className="ink-fill coffee-fill" />
        </g>

        <g className="ink-stroke">
          <path d="M44 74 H124 V138 H44 Z" />
          <path d="M124 88 H142 V122 H124" />
        </g>

        <g className="ink-fill">
          <path className="star-1" d="M30 52 L34 60 L42 64 L34 68 L30 76 L26 68 L18 64 L26 60 Z" />
          <path className="star-2" d="M150 54 L153 60 L160 63 L153 66 L150 72 L147 66 L140 63 L147 60 Z" />
          <path className="star-3" d="M28 118 L31 123 L36 126 L31 129 L28 134 L25 129 L20 126 L25 123 Z" />
        </g>
      </svg>
    </div>
  )
}
