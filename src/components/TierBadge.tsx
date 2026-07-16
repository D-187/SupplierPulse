import type { Tier } from "@/lib/scoring";

const TIER_STYLES: Record<Tier, string> = {
  Healthy: "bg-healthy-bg text-healthy-fg",
  Watch: "bg-watch-bg text-watch-fg",
  "At-risk": "bg-risk-bg text-risk-fg",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}
    >
      {tier}
    </span>
  );
}
