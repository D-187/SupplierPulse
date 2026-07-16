"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { DriveStep } from "driver.js";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useSupplierData } from "@/context/SupplierDataContext";
import { TierBadge } from "@/components/TierBadge";
import { TourButton } from "@/components/TourButton";
import {
  CATEGORY_LABELS,
  DEFAULT_WEIGHTS,
  METRIC_LABELS,
  ROUTING_LABELS,
  scoreSupplier,
  type CategoryKey,
  type SupplierScore,
} from "@/lib/scoring";

function buildDetailTourSteps(score: SupplierScore): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: '[data-tour="score"]',
      popover: {
        title: "Overall score & tier",
        description: "The single number and tier this supplier lands on today.",
      },
    },
    {
      element: '[data-tour="chart"]',
      popover: {
        title: "Category breakdown",
        description: "How they scored across financial reliability, operations, quality, and compliance.",
      },
    },
    {
      element: '[data-tour="weakest"]',
      popover: {
        title: "Weakest metric",
        description: "The one metric dragging their overall score down the most.",
      },
    },
  ];
  if (score.coachingMessage) {
    steps.push({
      element: '[data-tour="coaching"]',
      popover: {
        title: "Coaching message",
        description: "A scripted message tied directly to the weakest metric — this is what a Watch/At-risk supplier sees.",
      },
    });
  }
  return steps;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { suppliers, loading, error } = useSupplierData();

  const supplier = useMemo(() => suppliers.find((s) => s.id === id), [suppliers, id]);
  const score = useMemo(
    () => (supplier?.snapshot ? scoreSupplier(supplier.snapshot, DEFAULT_WEIGHTS) : null),
    [supplier]
  );

  if (loading) {
    return <div className="px-6 py-16 text-center text-ink-faint">Loading…</div>;
  }

  if (error) {
    return <div className="px-6 py-16 text-center text-risk-fg">{error}</div>;
  }

  if (!supplier || !score) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-ink-soft">Supplier not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-ink-soft underline">
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
      <Link href="/" className="text-sm text-ink-faint hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">{supplier.name}</h1>
          <TierBadge tier={score.tier} />
        </div>
        <TourButton steps={buildDetailTourSteps(score)} label="Tour this page" />
      </div>

      <div data-tour="score" className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-ink">{score.overallScore.toFixed(1)}</span>
        <span className="text-sm text-ink-faint">overall score / 100</span>
      </div>

      <section data-tour="chart" className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Category breakdown</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} stroke="var(--ink-faint)" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="category"
                width={140}
                stroke="var(--ink-faint)"
                tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
              />
              <Bar dataKey="score" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div data-tour="weakest" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Weakest metric</h2>
          <p className="mt-2 font-display text-lg font-semibold text-ink">{score.weakestMetric.label}</p>
          <p className="text-sm text-ink-faint">
            {CATEGORY_LABELS[score.weakestMetric.category]} · scored {score.weakestMetric.score.toFixed(1)} / 100
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Routing outcome</h2>
          <p className="mt-2 font-display text-lg font-semibold text-ink">{ROUTING_LABELS[score.routing]}</p>
        </div>
      </section>

      {score.coachingMessage && (
        <section data-tour="coaching" className="mt-6 rounded-2xl border border-watch-fg/30 bg-watch-bg p-6">
          <h2 className="text-xs font-semibold tracking-wide text-watch-fg uppercase">Coaching message</h2>
          <p className="mt-2 text-watch-fg">{score.coachingMessage}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">All metrics</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {Object.entries(score.metricScores).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-ink-faint">{METRIC_LABELS[key as keyof typeof METRIC_LABELS]}</dt>
              <dd className="font-mono text-sm font-medium text-ink tabular-nums">{value.toFixed(1)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
