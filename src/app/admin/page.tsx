"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DriveStep } from "driver.js";
import { useSupplierData } from "@/context/SupplierDataContext";
import { TierBadge } from "@/components/TierBadge";
import { TourButton } from "@/components/TourButton";
import {
  CATEGORY_LABELS,
  DEFAULT_WEIGHTS,
  ROUTING_LABELS,
  scoreSupplier,
  type CategoryKey,
  type CategoryWeights,
  type Tier,
} from "@/lib/scoring";

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CategoryKey[];
const TIER_ORDER: Tier[] = ["Healthy", "Watch", "At-risk"];

const ADMIN_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="sliders"]',
    popover: {
      title: "Adjust category weights",
      description: "Drag any slider to change how much that category counts toward the overall score.",
    },
  },
  {
    element: '[data-tour="tier-counts"]',
    popover: {
      title: "Live tier counts",
      description: "Watch these numbers shift instantly as you move a slider — no page reload, no re-fetch.",
    },
  },
  {
    element: '[data-tour="admin-table"]',
    popover: {
      title: "Full recompute",
      description: "Every supplier's score, tier, and routing, recalculated live against your current weights.",
    },
  },
];

export default function AdminPage() {
  const { suppliers, loading, error } = useSupplierData();
  const [weights, setWeights] = useState<CategoryWeights>(DEFAULT_WEIGHTS);

  const totalWeight = CATEGORY_KEYS.reduce((sum, key) => sum + weights[key], 0);

  const scored = useMemo(() => {
    return suppliers
      .filter((s) => s.snapshot)
      .map((s) => ({ supplier: s, score: scoreSupplier(s.snapshot!, weights) }));
  }, [suppliers, weights]);

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { Healthy: 0, Watch: 0, "At-risk": 0 };
    for (const { score } of scored) counts[score.tier] += 1;
    return counts;
  }, [scored]);

  function updateWeight(key: CategoryKey, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="px-6 py-16 text-center text-ink-faint">Loading…</div>;
  }

  if (error) {
    return <div className="px-6 py-16 text-center text-risk-fg">{error}</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-ink-soft">Upload supplier data first.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-ink-soft underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Live weight admin panel</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Adjust each category&apos;s weight and watch tiers recompute instantly, against the data
            already loaded — no re-fetch.
          </p>
        </div>
        <TourButton steps={ADMIN_TOUR_STEPS} autoStartKey="admin" />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div data-tour="sliders" className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {CATEGORY_KEYS.map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor={key} className="font-medium text-ink">
                  {CATEGORY_LABELS[key]}
                </label>
                <span className="font-mono text-ink-soft tabular-nums">{weights[key]}</span>
              </div>
              <input
                id={key}
                type="range"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="mt-2 w-full accent-accent"
              />
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-ink-faint">Total weight (normalized automatically)</span>
            <span className="font-mono font-medium text-ink tabular-nums">{totalWeight}</span>
          </div>

          <button
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-2"
          >
            Reset to defaults
          </button>
        </div>

        <div data-tour="tier-counts" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Tier counts</h2>
          <div className="mt-4 space-y-3">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="flex items-center justify-between">
                <TierBadge tier={tier} />
                <span className="font-display text-2xl font-semibold text-ink">{tierCounts[tier]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div data-tour="admin-table" className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left text-ink-faint">
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Overall score</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Routing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scored.map(({ supplier, score }) => (
              <tr key={supplier.id}>
                <td className="px-4 py-3 font-medium text-ink">{supplier.name}</td>
                <td className="px-4 py-3 font-mono text-ink-soft tabular-nums">{score.overallScore.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <TierBadge tier={score.tier} />
                </td>
                <td className="px-4 py-3 text-ink-soft">{ROUTING_LABELS[score.routing]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
