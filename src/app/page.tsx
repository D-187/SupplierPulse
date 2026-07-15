"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSupplierData } from "@/context/SupplierDataContext";
import { UploadScreen } from "@/components/UploadScreen";
import { TierBadge } from "@/components/TierBadge";
import { DEFAULT_WEIGHTS, ROUTING_LABELS, scoreSupplier, type Tier } from "@/lib/scoring";

type SortKey = "name" | "overallScore" | "tier";

const TIER_SORT_ORDER: Record<Tier, number> = { "At-risk": 0, Watch: 1, Healthy: 2 };

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
    return <div className="px-6 py-16 text-center text-slate-500">Loading suppliers…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-rose-700">{error}</p>
        <button onClick={() => refetch()} className="mt-4 text-sm underline">
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
          <button onClick={() => setShowUpload(false)} className="text-sm text-slate-500 underline">
            ← Back to dashboard
          </button>
        </div>
        <UploadScreen title="Replace the current dataset" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Supplier dashboard</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Upload new file
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search supplier name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <div className="flex gap-1">
          {(["All", "Healthy", "Watch", "At-risk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tierFilter === t
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">
          {filteredSortedRows.length} of {rows.length} suppliers
        </span>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
            {filteredSortedRows.map(({ supplier, score }) => (
              <tr key={supplier.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/supplier/${supplier.id}`} className="font-medium text-slate-900 hover:underline">
                    {supplier.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{score.overallScore.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <TierBadge tier={score.tier} />
                </td>
                <td className="px-4 py-3 text-slate-600">{ROUTING_LABELS[score.routing]}</td>
              </tr>
            ))}
            {filteredSortedRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No suppliers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
      <button onClick={() => onClick(sortKey)} className="flex items-center gap-1 hover:text-slate-900">
        {label}
        {active && <span>{asc ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
