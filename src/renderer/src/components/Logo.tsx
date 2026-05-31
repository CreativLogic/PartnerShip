// PartnerShip mark: an amber git folder with a "worktree" tag, cables fanning
// down into branch terminals (main / feature / bugfix). At small sizes the
// terminals collapse to colored branch nodes so it stays legible.

function GitFolder(): JSX.Element {
  return (
    <>
      {/* open folder (amber) */}
      <path d="M70 70 a10 10 0 0 1 10-10 h26 l12 13 h50 a10 10 0 0 1 10 10 v6 H70 Z" fill="#e08e1b" />
      <path
        d="M66 84 h120 a10 10 0 0 1 10 10 v26 a12 12 0 0 1 -12 12 H68 a12 12 0 0 1 -12-12 V94 a10 10 0 0 1 10-10 Z"
        fill="#f4a623"
        stroke="#c97f14"
        strokeWidth="3"
      />
      {/* git node badge */}
      <rect x="108" y="74" width="40" height="40" rx="9" transform="rotate(45 128 94)" fill="#e5523b" />
      <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="#ffffff">
        <line x1="119" y1="103" x2="135" y2="87" />
        <line x1="127" y1="95" x2="133" y2="101" />
        <circle cx="119" cy="103" r="4.5" />
        <circle cx="135" cy="87" r="4.5" />
        <circle cx="135" cy="101" r="4.5" />
      </g>
    </>
  )
}

export function Logo({ size = 28 }: { size?: number }): JSX.Element {
  const full = size >= 44
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PartnerShip">
      {/* cables */}
      <g fill="none" strokeWidth="6" strokeLinecap="round">
        <path d="M116 126 C 74 140 60 150 52 164" stroke="#36c5f0" />
        <path d="M128 128 C 128 148 128 150 128 164" stroke="#22c55e" />
        <path d="M140 126 C 182 140 196 150 204 164" stroke="#a855f7" />
      </g>

      <GitFolder />

      {full ? (
        <>
          {/* worktree sticky tag */}
          <g transform="rotate(-7 178 70)">
            <rect x="150" y="56" width="58" height="26" rx="3" fill="#f4d03f" />
            <text x="179" y="73" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#7a5c00">
              worktree
            </text>
          </g>
          {/* three branch terminals */}
          <BranchTerminal x={18} color="#36c5f0" label="main" bars={['#f59e0b', '#22c55e', '#ef4444']} labelInk="#04222e" />
          <BranchTerminal x={94} color="#22c55e" label="feature" bars={['#36c5f0', '#f59e0b', '#a855f7']} labelInk="#062b14" />
          <BranchTerminal x={170} color="#a855f7" label="bugfix" bars={['#22c55e', '#ef4444', '#36c5f0']} labelInk="#2a0a45" />
        </>
      ) : (
        // compact: cables end in colored branch nodes
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
      <text x="8" y="11" fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="600" fill={labelInk}>
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
