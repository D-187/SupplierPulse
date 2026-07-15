import type { MetricSnapshot, Supplier } from "@prisma/client";

export type SupplierWithSnapshot = Supplier & {
  snapshot: MetricSnapshot | null;
};
