import type { Tier } from "@/lib/scoring";

const TIER_STYLES: Record<Tier, string> = {
  Healthy: "bg-emerald-100 text-emerald-800",
  Watch: "bg-amber-100 text-amber-800",
  "At-risk": "bg-rose-100 text-rose-800",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_STYLES[tier]}`}
    >
      {tier}
    </span>
  );
}
