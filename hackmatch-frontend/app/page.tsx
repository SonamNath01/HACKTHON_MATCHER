import Link from "next/link"

const ALGORITHM_BREAKDOWN = [
  { label: "Skill overlap", points: 40 },
  { label: "Reliability", points: 30 },
  { label: "Timezone proximity", points: 20 },
  { label: "Commitment level", points: 10 },
]

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(45,212,191,0.18),transparent)]"
      />

      <header className="relative z-10 border-b border-border/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <span className="font-heading font-bold text-lg tracking-tight">
          HackMatch
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:opacity-90 hover:shadow-md hover:shadow-accent/30 transition-all rounded-md px-4 py-1.5"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <span className="text-xs font-medium tracking-wide uppercase text-accent border border-accent/30 bg-accent/10 rounded-full px-3 py-1 mb-6">
          Algorithm-powered team matching
        </span>

        <h1 className="font-heading font-bold text-4xl sm:text-6xl tracking-tight max-w-3xl leading-[1.08]">
          Find your perfect hackathon team.
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-md mt-6 leading-relaxed">
          Stop guessing on Discord. HackMatch scores compatibility between you
          and every team — skills, reliability, timezone, and commitment.
        </p>

        <div className="flex items-center gap-3 mt-10">
          <Link
            href="/register"
            className="font-medium bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:opacity-90 hover:shadow-md hover:shadow-accent/30 hover:-translate-y-0.5 transition-all rounded-md px-6 py-2.5 text-sm"
          >
            Create your profile
          </Link>
          <Link
            href="/login"
            className="font-medium border border-border text-foreground hover:bg-card hover:border-foreground/20 transition-colors rounded-md px-6 py-2.5 text-sm"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-24 w-full max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4 font-medium">
            How matching works
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border shadow-sm">
            {ALGORITHM_BREAKDOWN.map(({ label, points }) => (
              <div
                key={label}
                className="bg-card px-5 py-6 text-left transition-colors hover:bg-muted/40"
              >
                <div className="font-heading text-2xl font-bold text-accent">
                  {points}
                  <span className="text-sm text-muted-foreground font-sans font-normal">
                    {" "}pts
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        Built for hackathons, by hackathon teams.
      </footer>
    </div>
  )
}