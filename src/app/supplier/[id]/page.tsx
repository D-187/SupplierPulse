"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { DriveStep } from "driver.js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useSupplierData } from "@/context/SupplierDataContext";
import { TierBadge } from "@/components/TierBadge";
import { TourButton } from "@/components/TourButton";
import {
  CATEGORY_LABELS,
  DEFAULT_WEIGHTS,
  METRIC_CATEGORY,
  METRIC_KEYS,
  METRIC_LABELS,
  ROUTING_LABELS,
  TIER_THRESHOLDS,
  computeCategoryScores,
  computeMetricScores,
  getTier,
  scoreSupplier,
  type CategoryKey,
  type MetricKey,
  type SupplierScore,
  type Tier,
} from "@/lib/scoring";

const METRIC_UNITS: Record<MetricKey, (v: number) => string> = {
  revenueGrowthRate: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  paymentDelinquencyRate: (v) => `${v.toFixed(1)}%`,
  cashFlowStabilityScore: (v) => `${v.toFixed(0)} / 100`,
  onTimeDeliveryRate: (v) => `${v.toFixed(1)}%`,
  orderFulfillmentRate: (v) => `${v.toFixed(1)}%`,
  avgLeadTimeDays: (v) => `${v.toFixed(1)} days`,
  defectRate: (v) => `${v.toFixed(1)}%`,
  customerReturnRate: (v) => `${v.toFixed(1)}%`,
  customerRatingAvg: (v) => `${v.toFixed(1)} / 5`,
  documentationComplianceRate: (v) => `${v.toFixed(1)}%`,
  regulatoryViolationsCount: (v) => `${v} violation${v === 1 ? "" : "s"}`,
  certificationValidity: (v) => `${v.toFixed(1)}%`,
};

const TIER_DOT: Record<Tier, string> = {
  Healthy: "bg-healthy-fg",
  Watch: "bg-watch-fg",
  "At-risk": "bg-risk-fg",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CategoryKey[];

const METRICS_BY_CATEGORY: Record<CategoryKey, MetricKey[]> = CATEGORY_KEYS.reduce(
  (acc, category) => {
    acc[category] = METRIC_KEYS.filter((key) => METRIC_CATEGORY[key] === category);
    return acc;
  },
  {} as Record<CategoryKey, MetricKey[]>
);

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
        description:
          "How they scored across financial reliability, operations, quality, and compliance, against the Watch and Healthy thresholds.",
      },
    },
    {
      element: '[data-tour="peer-chart"]',
      popover: {
        title: "Compared to peers",
        description: "The same four categories, next to the average across every supplier in the current upload.",
      },
    },
    {
      element: '[data-tour="weakest"]',
      popover: {
        title: "Weakest metrics",
        description: "The three metrics dragging their overall score down the most, weakest first.",
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
  steps.push({
    element: '[data-tour="metric-breakdown"]',
    popover: {
      title: "Every metric, by category",
      description: "Raw values alongside each metric's normalized score, grouped the same way the scoring engine groups them.",
    },
  });
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

  const peerAverage = useMemo(() => {
    const withSnapshot = suppliers.filter((s) => s.snapshot);
    if (withSnapshot.length === 0) return null;
    const totals: Record<CategoryKey, number> = { financial: 0, operations: 0, quality: 0, compliance: 0 };
    for (const s of withSnapshot) {
      const categoryScores = computeCategoryScores(computeMetricScores(s.snapshot!));
      for (const key of CATEGORY_KEYS) totals[key] += categoryScores[key];
    }
    const averages = {} as Record<CategoryKey, number>;
    for (const key of CATEGORY_KEYS) averages[key] = totals[key] / withSnapshot.length;
    return averages;
  }, [suppliers]);

  const topWeakest = useMemo(() => {
    if (!score) return [];
    return (Object.entries(score.metricScores) as [MetricKey, number][])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([key, value]) => ({ key, value, label: METRIC_LABELS[key], category: METRIC_CATEGORY[key] }));
  }, [score]);

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

  const chartData = CATEGORY_KEYS.map((key) => ({
    category: CATEGORY_LABELS[key],
    score: Number(score.categoryScores[key].toFixed(1)),
  }));

  const peerChartData = peerAverage
    ? CATEGORY_KEYS.map((key) => ({
        category: CATEGORY_LABELS[key],
        supplier: Number(score.categoryScores[key].toFixed(1)),
        peers: Number(peerAverage[key].toFixed(1)),
      }))
    : [];

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
              <ReferenceLine x={TIER_THRESHOLDS.watch} stroke="var(--watch-fg)" strokeDasharray="4 4" />
              <ReferenceLine x={TIER_THRESHOLDS.healthy} stroke="var(--healthy-fg)" strokeDasharray="4 4" />
              <Bar dataKey="score" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-ink-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-watch-fg" /> Watch threshold ({TIER_THRESHOLDS.watch})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-healthy-fg" /> Healthy threshold ({TIER_THRESHOLDS.healthy})
          </span>
        </div>
      </section>

      {peerAverage && (
        <section data-tour="peer-chart" className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Compared to peers</h2>
          <p className="mt-1 text-xs text-ink-faint">
            This supplier against the average across all {suppliers.length} suppliers in the current upload.
          </p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peerChartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} stroke="var(--ink-faint)" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={140}
                  stroke="var(--ink-faint)"
                  tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
                />
                <Bar dataKey="supplier" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="peers" fill="var(--structure)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {supplier.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-structure" /> Dataset average
            </span>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div data-tour="weakest" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Weakest metrics</h2>
          <div className="mt-3 space-y-3">
            {topWeakest.map((metric, i) => (
              <div key={metric.key} className="flex items-center justify-between gap-3">
                <div>
                  <p className={i === 0 ? "font-display text-base font-semibold text-ink" : "text-sm text-ink"}>
                    {metric.label}
                  </p>
                  <p className="text-xs text-ink-faint">{CATEGORY_LABELS[metric.category]}</p>
                </div>
                <span className="font-mono text-sm text-ink-soft tabular-nums">{metric.value.toFixed(1)}</span>
              </div>
            ))}
          </div>
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

      <section data-tour="metric-breakdown" className="mt-6 grid gap-5 sm:grid-cols-2">
        {CATEGORY_KEYS.map((category) => (
          <div key={category} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                {CATEGORY_LABELS[category]}
              </h2>
              <span className="font-mono text-sm text-ink-soft tabular-nums">
                {score.categoryScores[category].toFixed(1)}
              </span>
            </div>
            <div className="mt-3 divide-y divide-border">
              {METRICS_BY_CATEGORY[category].map((key) => {
                const normalized = score.metricScores[key];
                const tier = getTier(normalized);
                return (
                  <div key={key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm text-ink">{METRIC_LABELS[key]}</div>
                      <div className="text-xs text-ink-faint">{METRIC_UNITS[key](supplier.snapshot![key])}</div>
                    </div>
                    <div className="flex w-28 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className={`h-full rounded-full ${TIER_DOT[tier]}`} style={{ width: `${normalized}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-ink-soft tabular-nums">
                        {normalized.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
