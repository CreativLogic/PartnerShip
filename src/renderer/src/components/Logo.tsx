// PartnerShip mark: an open folder with a `.partner` command bubble and a
// git-worktree branching off the folder's edge. Tuned for dark.
export function Logo({ size = 28 }: { size?: number }): JSX.Element {
  const showText = size >= 44
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PartnerShip"
    >
      {/* worktree branching off the folder's right edge */}
      <g stroke="#22c55e" strokeWidth="10" fill="none" strokeLinecap="round">
        <path d="M176 150 H198" />
        <path d="M198 150 C 214 150 214 122 230 122" />
        <path d="M198 150 C 214 150 214 178 230 178" />
      </g>
      <circle cx="198" cy="150" r="9" fill="#22c55e" />
      <circle cx="230" cy="122" r="9" fill="#0e1116" stroke="#22c55e" strokeWidth="9" />
      <circle cx="230" cy="178" r="9" fill="#0e1116" stroke="#22c55e" strokeWidth="9" />

      {/* open folder */}
      <path
        d="M40 120 a12 12 0 0 1 12-12 h34 l16 16 h54 a12 12 0 0 1 12 12 v8 H40 Z"
        fill="#1a1f29"
        stroke="#36c5f0"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      <path
        d="M44 136 H184 a10 10 0 0 1 9.7 12.4 l-9 40 a10 10 0 0 1 -9.7 7.6 H52 a10 10 0 0 1 -10-10 V146 a10 10 0 0 1 10-10 Z"
        fill="#141821"
        stroke="#36c5f0"
        strokeWidth="9"
        strokeLinejoin="round"
      />

      {/* .partner command bubble with a tail into the folder */}
      <rect x="52" y="40" width="132" height="50" rx="12" fill="#0a0c10" stroke="#323a4b" strokeWidth="5" />
      <path d="M104 88 l14 0 l-7 14 z" fill="#0a0c10" stroke="#323a4b" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="70" cy="65" r="6" fill="#22c55e" />
      {showText ? (
        <text
          x="84"
          y="74"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="27"
          fontWeight="600"
          fill="#e6e9ef"
        >
          .partner
        </text>
      ) : (
        <g fill="#9aa3b2">
          <rect x="88" y="60" width="58" height="6" rx="3" />
          <rect x="88" y="72" width="38" height="6" rx="3" />
        </g>
      )}
    </svg>
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
