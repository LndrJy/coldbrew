type FolderImportLoaderProps = {
  size?: number
  className?: string
}

export default function FolderImportLoader({ size = 190, className = '' }: FolderImportLoaderProps) {
  return (
    <div className={`loader-wrap folder-loader ${className}`.trim()} aria-label="Importing file" role="status">
      <svg width={size} height={size} viewBox="0 0 190 190" aria-hidden="true">
        <rect x="0" y="0" width="190" height="190" fill="var(--background)" />

        <path
          d="M42 96 H146 V154 H42 Z"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="var(--line-w)"
          transform="translate(4 4)"
        />

        <g className="folder-bounce">
          <path
            d="M38 92 H72 L78 84 H140 V150 H38 Z"
            fill="var(--background)"
            stroke="var(--ink)"
            strokeWidth="var(--line-w)"
          />
          <path className="ink-stroke" d="M38 100 H140" />
        </g>

        <g className="paper-1">
          <rect x="62" y="30" width="44" height="56" fill="var(--accent)" stroke="var(--ink)" strokeWidth="var(--line-w)" />
          <path className="ink-stroke" d="M68 42 H100 M68 50 H98 M68 58 H96" />
        </g>

        <g className="paper-2">
          <rect x="78" y="20" width="44" height="56" fill="var(--accent)" stroke="var(--ink)" strokeWidth="var(--line-w)" />
          <path className="ink-stroke" d="M84 32 H116 M84 40 H114 M84 48 H112" />
        </g>

        <g className="paper-3">
          <rect x="94" y="10" width="44" height="56" fill="var(--accent)" stroke="var(--ink)" strokeWidth="var(--line-w)" />
          <path className="ink-stroke" d="M100 22 H132 M100 30 H130 M100 38 H128" />
        </g>
      </svg>
    </div>
  )
}
