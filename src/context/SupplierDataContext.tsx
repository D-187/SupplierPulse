"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { SupplierWithSnapshot } from "@/lib/types";

interface SupplierDataValue {
  suppliers: SupplierWithSnapshot[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SupplierDataContext = createContext<SupplierDataValue | null>(null);

export function SupplierDataProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = useState<SupplierWithSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load suppliers (${res.status}).`);
      const data = await res.json();
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load on mount; refetch() sets state asynchronously after the
    // network response, not synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return (
    <SupplierDataContext.Provider value={{ suppliers, loading, error, refetch }}>
      {children}
    </SupplierDataContext.Provider>
  );
}

export function useSupplierData(): SupplierDataValue {
  const ctx = useContext(SupplierDataContext);
  if (!ctx) throw new Error("useSupplierData must be used within a SupplierDataProvider");
  return ctx;
}
