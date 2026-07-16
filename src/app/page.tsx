"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DriveStep } from "driver.js";
import { useSupplierData } from "@/context/SupplierDataContext";
import { UploadScreen } from "@/components/UploadScreen";
import { TierBadge } from "@/components/TierBadge";
import { TourButton } from "@/components/TourButton";
import { DEFAULT_WEIGHTS, ROUTING_LABELS, scoreSupplier, type Tier } from "@/lib/scoring";

type SortKey = "name" | "overallScore" | "tier";

const TIER_SORT_ORDER: Record<Tier, number> = { "At-risk": 0, Watch: 1, Healthy: 2 };

const DASHBOARD_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="stats"]',
    popover: {
      title: "The pulse at a glance",
      description: "Total suppliers scored, how the tier mix breaks down, and how many are queued for coaching.",
    },
  },
  {
    element: '[data-tour="filters"]',
    popover: {
      title: "Search & filter",
      description: "Search by name, or filter the table down to just one tier.",
    },
  },
  {
    element: '[data-tour="table"]',
    popover: {
      title: "Sortable supplier table",
      description: "Click any column header to sort. Click a supplier's name to see their full score breakdown.",
    },
  },
  {
    element: '[data-tour="rail"]',
    popover: {
      title: "Needs attention",
      description: "Every Watch or At-risk supplier, most urgent first, with their single weakest metric called out.",
    },
  },
  {
    element: '[data-tour="upload-btn"]',
    popover: {
      title: "Upload new data",
      description: "Upload a new .xlsx file any time — it replaces the current dataset.",
    },
  },
  {
    element: '[data-tour="nav-admin"]',
    popover: {
      title: "Try the weight admin panel",
      description: "Head here next — drag the category weight sliders and watch every tier recompute instantly.",
    },
  },
];

export default function DashboardPage() {
  const { suppliers, loading, error, refetch } = useSupplierData();
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("overallScore");
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    return suppliers
      .filter((s) => s.snapshot)
      .map((s) => ({ supplier: s, score: scoreSupplier(s.snapshot!, DEFAULT_WEIGHTS) }));
  }, [suppliers]);

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { Healthy: 0, Watch: 0, "At-risk": 0 };
    for (const { score } of rows) counts[score.tier] += 1;
    return counts;
  }, [rows]);

  const needsAttention = useMemo(() => {
    return rows
      .filter((r) => r.score.routing === "coaching")
      .sort((a, b) => a.score.overallScore - b.score.overallScore);
  }, [rows]);

  const filteredSortedRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.supplier.name.toLowerCase().includes(q));
    }
    if (tierFilter !== "All") {
      result = result.filter((r) => r.score.tier === tierFilter);
    }
    const sorted = [...result].sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.supplier.name.localeCompare(b.supplier.name);
      if (sortKey === "overallScore") diff = a.score.overallScore - b.score.overallScore;
      if (sortKey === "tier") diff = TIER_SORT_ORDER[a.score.tier] - TIER_SORT_ORDER[b.score.tier];
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [rows, search, tierFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  if (loading) {
    return <div className="px-6 py-16 text-center text-ink-faint">Loading suppliers…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-risk-fg">{error}</p>
        <button onClick={() => refetch()} className="mt-4 text-sm text-ink-soft underline">
          Try again
        </button>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return <UploadScreen title="Upload the supplier data template to get started" />;
  }

  if (showUpload) {
    return (
      <div>
        <div className="mx-auto max-w-xl px-6 pt-6">
          <button onClick={() => setShowUpload(false)} className="text-sm text-ink-soft underline">
            ← Back to dashboard
          </button>
        </div>
        <UploadScreen title="Replace the current dataset" />
      </div>
    );
  }

  const total = rows.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Supplier dashboard</h1>
        <div className="flex items-center gap-2">
          <TourButton steps={DASHBOARD_TOUR_STEPS} autoStartKey="dashboard" />
          <button
            data-tour="upload-btn"
            onClick={() => setShowUpload(true)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-2"
          >
            Upload new file
          </button>
        </div>
      </div>

      <div data-tour="stats" className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Suppliers scored</div>
          <div className="mt-2 font-display text-3xl font-semibold text-ink">{total}</div>
          <div className="mt-1 text-xs text-ink-faint">from the current upload</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Tier mix</div>
          {total > 0 && (
            <div className="mt-3 flex h-2 overflow-hidden rounded-full">
              <div className="bg-healthy-fg" style={{ width: `${(tierCounts.Healthy / total) * 100}%` }} />
              <div className="bg-watch-fg" style={{ width: `${(tierCounts.Watch / total) * 100}%` }} />
              <div className="bg-risk-fg" style={{ width: `${(tierCounts["At-risk"] / total) * 100}%` }} />
            </div>
          )}
          <div className="mt-3 flex gap-4 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-healthy-fg" />
              {tierCounts.Healthy} Healthy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-watch-fg" />
              {tierCounts.Watch} Watch
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-risk-fg" />
              {tierCounts["At-risk"]} At-risk
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Coaching queue</div>
          <div className="mt-2 font-display text-3xl font-semibold text-ink">{needsAttention.length}</div>
          <div className="mt-1 text-xs text-ink-faint">flagged for a weakest-metric message</div>
        </div>
      </div>

      <div data-tour="filters" className="mt-8 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search supplier name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint"
        />
        <div className="flex gap-1">
          {(["All", "Healthy", "Watch", "At-risk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tierFilter === t
                  ? "bg-accent text-accent-ink"
                  : "border border-border bg-surface text-ink-soft hover:bg-surface-2"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-faint">
          {filteredSortedRows.length} of {rows.length} suppliers
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[2.1fr_1fr] lg:items-start">
        <div data-tour="table" className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-ink-faint">
                <SortableHeader label="Supplier" sortKey="name" activeKey={sortKey} asc={sortAsc} onClick={toggleSort} />
                <SortableHeader
                  label="Overall score"
                  sortKey="overallScore"
                  activeKey={sortKey}
                  asc={sortAsc}
                  onClick={toggleSort}
                />
                <SortableHeader label="Tier" sortKey="tier" activeKey={sortKey} asc={sortAsc} onClick={toggleSort} />
                <th className="px-4 py-3 font-medium">Routing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSortedRows.map(({ supplier, score }) => (
                <tr key={supplier.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/supplier/${supplier.id}`} className="font-medium text-ink hover:underline">
                      {supplier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-soft tabular-nums">{score.overallScore.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <TierBadge tier={score.tier} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{ROUTING_LABELS[score.routing]}</td>
                </tr>
              ))}
              {filteredSortedRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-faint">
                    No suppliers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div data-tour="rail" className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <span className="font-display text-base font-semibold text-ink">Needs attention</span>
          </div>
          {needsAttention.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-faint">
              No suppliers currently need coaching.
            </div>
          ) : (
            needsAttention.map(({ supplier, score }) => (
              <Link
                key={supplier.id}
                href={`/supplier/${supplier.id}`}
                className="flex gap-3 border-b border-border px-5 py-3.5 last:border-b-0 hover:bg-surface-2"
              >
                <span
                  className={`w-0.5 flex-none rounded-full ${
                    score.tier === "At-risk" ? "bg-risk-fg" : "bg-watch-fg"
                  }`}
                />
                <div>
                  <div className="text-sm font-medium text-ink">{supplier.name}</div>
                  <div className="mt-0.5 text-xs text-ink-soft">Weakest: {score.weakestMetric.label.toLowerCase()}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  asc,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  asc: boolean;
  onClick: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th className="px-4 py-3 font-medium">
      <button onClick={() => onClick(sortKey)} className="flex items-center gap-1 hover:text-ink">
        {label}
        {active && <span>{asc ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
