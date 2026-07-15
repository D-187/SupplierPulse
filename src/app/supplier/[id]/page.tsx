"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useSupplierData } from "@/context/SupplierDataContext";
import { TierBadge } from "@/components/TierBadge";
import {
  CATEGORY_LABELS,
  DEFAULT_WEIGHTS,
  METRIC_LABELS,
  ROUTING_LABELS,
  scoreSupplier,
  type CategoryKey,
} from "@/lib/scoring";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { suppliers, loading, error } = useSupplierData();

  const supplier = useMemo(() => suppliers.find((s) => s.id === id), [suppliers, id]);
  const score = useMemo(
    () => (supplier?.snapshot ? scoreSupplier(supplier.snapshot, DEFAULT_WEIGHTS) : null),
    [supplier]
  );

  if (loading) {
    return <div className="px-6 py-16 text-center text-slate-500">Loading…</div>;
  }

  if (error) {
    return <div className="px-6 py-16 text-center text-rose-700">{error}</div>;
  }

  if (!supplier || !score) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-slate-600">Supplier not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const chartData = (Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => ({
    category: CATEGORY_LABELS[key],
    score: Number(score.categoryScores[key].toFixed(1)),
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{supplier.name}</h1>
        <TierBadge tier={score.tier} />
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-semibold text-slate-900">{score.overallScore.toFixed(1)}</span>
        <span className="text-sm text-slate-500">overall score / 100</span>
      </div>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">Category breakdown</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="category" width={140} tick={{ fontSize: 12 }} />
              <Bar dataKey="score" fill="#0f172a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-medium text-slate-500">Weakest metric</h2>
          <p className="mt-2 text-lg font-semibold text-slate-900">{score.weakestMetric.label}</p>
          <p className="text-sm text-slate-500">
            {CATEGORY_LABELS[score.weakestMetric.category]} · scored {score.weakestMetric.score.toFixed(1)} / 100
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-medium text-slate-500">Routing outcome</h2>
          <p className="mt-2 text-lg font-semibold text-slate-900">{ROUTING_LABELS[score.routing]}</p>
        </div>
      </section>

      {score.coachingMessage && (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-sm font-medium text-amber-800">Coaching message</h2>
          <p className="mt-2 text-amber-900">{score.coachingMessage}</p>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">All metrics</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {Object.entries(score.metricScores).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-slate-500">{METRIC_LABELS[key as keyof typeof METRIC_LABELS]}</dt>
              <dd className="text-sm font-medium text-slate-900">{value.toFixed(1)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
