// Shared score-explanation UI — used on both the "rank candidates for my
// team" page (teams/[id]) and the "rank teams for me" page (teams). Pulled
// out once a second page needed the exact same breakdown bars and
// "why this match" logic, mirroring the same dedup already done for the
// scoring formula itself on the backend (see src/algorithm/matching.ts).
import { ScoreBreakdown } from "@/types"

export function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-accent/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
      <BreakdownBar label="Skills" value={breakdown.skillScore} max={40} />
      <BreakdownBar label="Reliability" value={breakdown.reliabilityScore} max={30} />
      <BreakdownBar label="Timezone" value={breakdown.timezoneScore} max={20} />
      <BreakdownBar label="Commitment" value={breakdown.commitmentScore} max={10} />
    </div>
  )
}

// Turns the same breakdown numbers already shown in the bars above into a
// plain-English explanation — no new data, no invented reasons, just fixed,
// documented thresholds against the real formula's own sub-scores.
export function buildWhyThisMatch(
  requiredCount: number,
  missingCount: number,
  breakdown: ScoreBreakdown
) {
  const matchedCount = requiredCount - missingCount
  const reasons: { positive: boolean; text: string }[] = []

  if (requiredCount > 0) {
    reasons.push({ positive: missingCount === 0, text: `${matchedCount}/${requiredCount} required skills` })
  }

  // reliabilityScore is 0-30 (30 = a raw reliabilityScore of 100); thresholds
  // mirror the same 70/50 cutoffs used elsewhere in the app, just scaled.
  reasons.push({
    positive: breakdown.reliabilityScore >= 21,
    text:
      breakdown.reliabilityScore >= 21
        ? "High reliability"
        : breakdown.reliabilityScore >= 15
        ? "Average reliability"
        : "Still building reliability",
  })

  reasons.push({
    positive: breakdown.timezoneScore >= 16,
    text:
      breakdown.timezoneScore >= 16
        ? "Similar timezone"
        : breakdown.timezoneScore >= 10
        ? "Workable timezone overlap"
        : "Different timezone",
  })

  reasons.push({
    positive: breakdown.commitmentScore === 10,
    text:
      breakdown.commitmentScore === 10
        ? "Same availability"
        : breakdown.commitmentScore >= 5
        ? "Compatible availability"
        : "Different availability",
  })

  return reasons
}
