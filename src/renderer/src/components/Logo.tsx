// PartnerShip mark: user + agent shoulder to shoulder, a shared spark between
// them, shipping a doc into a folder. Mono line-art, tuned for dark.
export function Logo({ size = 28 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="PartnerShip">
      {/* user figure (cyan) */}
      <circle cx="14" cy="15" r="5" stroke="#36c5f0" strokeWidth="2.5" />
      <path d="M5 38c0-6 4-10 9-10s9 4 9 10" stroke="#36c5f0" strokeWidth="2.5" strokeLinecap="round" />
      {/* agent figure (violet) */}
      <circle cx="34" cy="15" r="5" stroke="#a855f7" strokeWidth="2.5" />
      <path d="M25 38c0-6 4-10 9-10s9 4 9 10" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
      {/* shared spark */}
      <path d="M24 19l2.2 4.5L31 24l-3.5 3 1 5-4.5-2.6L19.5 32l1-5L17 24l4.8-.5L24 19z" fill="#22c55e" />
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
