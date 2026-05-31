// PartnerShip mark: an amber folder labeled ".partner", cables fanning down
// into branch terminals (main / feature / bugfix). Card labels are blurred so
// they read as a symbol, not copy. At small sizes the terminals collapse to
// colored branch nodes for legibility.

function GitFolder(): JSX.Element {
  return (
    <>
      {/* open folder (amber) */}
      <path d="M70 66 a10 10 0 0 1 10-10 h26 l12 13 h50 a10 10 0 0 1 10 10 v6 H70 Z" fill="#e08e1b" />
      <path
        d="M66 80 h120 a10 10 0 0 1 10 10 v30 a12 12 0 0 1 -12 12 H68 a12 12 0 0 1 -12-12 V90 a10 10 0 0 1 10-10 Z"
        fill="#f4a623"
        stroke="#c97f14"
        strokeWidth="3"
      />
      <text
        x="126"
        y="120"
        textAnchor="middle"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize="20"
        fontWeight="700"
        fill="#6b4a0c"
      >
        .partner
      </text>
    </>
  )
}

export function Logo({ size = 28 }: { size?: number }): JSX.Element {
  const full = size >= 44
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PartnerShip">
      <defs>
        <filter id="ps-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* cables */}
      <g fill="none" strokeWidth="6" strokeLinecap="round">
        <path d="M116 132 C 74 144 60 152 52 164" stroke="#36c5f0" />
        <path d="M128 134 C 128 150 128 152 128 164" stroke="#22c55e" />
        <path d="M140 132 C 182 144 196 152 204 164" stroke="#a855f7" />
      </g>

      <GitFolder />

      {full ? (
        <>
          <BranchTerminal x={18} color="#36c5f0" label="main" bars={['#f59e0b', '#22c55e', '#ef4444']} labelInk="#04222e" />
          <BranchTerminal x={94} color="#22c55e" label="feature" bars={['#36c5f0', '#f59e0b', '#a855f7']} labelInk="#062b14" />
          <BranchTerminal x={170} color="#a855f7" label="bugfix" bars={['#22c55e', '#ef4444', '#36c5f0']} labelInk="#2a0a45" />
        </>
      ) : (
        <g>
          <circle cx="52" cy="170" r="13" fill="#141821" stroke="#36c5f0" strokeWidth="7" />
          <circle cx="128" cy="170" r="13" fill="#141821" stroke="#22c55e" strokeWidth="7" />
          <circle cx="204" cy="170" r="13" fill="#141821" stroke="#a855f7" strokeWidth="7" />
        </g>
      )}
    </svg>
  )
}

function BranchTerminal({
  x,
  color,
  label,
  bars,
  labelInk
}: {
  x: number
  color: string
  label: string
  bars: [string, string, string]
  labelInk: string
}): JSX.Element {
  return (
    <g transform={`translate(${x},164)`}>
      <rect width="68" height="64" rx="8" fill="#141821" stroke="#252b38" strokeWidth="2" />
      <path d="M0 8 a8 8 0 0 1 8-8 h52 a8 8 0 0 1 8 8 v6 H0 Z" fill={color} />
      <text
        x="8"
        y="11"
        fontFamily="JetBrains Mono, monospace"
        fontSize="8"
        fontWeight="600"
        fill={labelInk}
        filter="url(#ps-soft)"
      >
        {label}
      </text>
      <g fill="#9aa3b2">
        <rect x="9" y="24" width="6" height="4" rx="1" />
        <rect x="9" y="34" width="6" height="4" rx="1" />
        <rect x="9" y="44" width="6" height="4" rx="1" />
      </g>
      <rect x="20" y="24" width="34" height="4" rx="2" fill={bars[0]} />
      <rect x="20" y="34" width="40" height="4" rx="2" fill={bars[1]} />
      <rect x="20" y="44" width="24" height="4" rx="2" fill={bars[2]} />
    </g>
  )
}

export function LogoWordmark(): JSX.Element {
  return (
    <div className="flex items-center gap-2 select-none">
      <Logo size={26} />
      <span className="text-[15px] font-semibold tracking-tight">
        Partner<span className="text-ship">Ship</span>
      </span>
    </div>
  )
}
