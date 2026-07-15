"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSupplierData } from "@/context/SupplierDataContext";
import { TierBadge } from "@/components/TierBadge";
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
    return <div className="px-6 py-16 text-center text-slate-500">Loading…</div>;
  }

  if (error) {
    return <div className="px-6 py-16 text-center text-rose-700">{error}</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-slate-600">Upload supplier data first.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Live weight admin panel</h1>
      <p className="mt-2 text-sm text-slate-600">
        Adjust each category&apos;s weight and watch tiers recompute instantly, against the data
        already loaded — no re-fetch.
      </p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
          {CATEGORY_KEYS.map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor={key} className="font-medium text-slate-700">
                  {CATEGORY_LABELS[key]}
                </label>
                <span className="text-slate-500">{weights[key]}</span>
              </div>
              <input
                id={key}
                type="range"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="mt-2 w-full accent-slate-900"
              />
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">Total weight (normalized automatically)</span>
            <span className="font-medium text-slate-900">{totalWeight}</span>
          </div>

          <button
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Reset to defaults
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-medium text-slate-500">Tier counts</h2>
          <div className="mt-4 space-y-3">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="flex items-center justify-between">
                <TierBadge tier={tier} />
                <span className="text-2xl font-semibold text-slate-900">{tierCounts[tier]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Overall score</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Routing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scored.map(({ supplier, score }) => (
              <tr key={supplier.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{supplier.name}</td>
                <td className="px-4 py-3 text-slate-700">{score.overallScore.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <TierBadge tier={score.tier} />
                </td>
                <td className="px-4 py-3 text-slate-600">{ROUTING_LABELS[score.routing]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
