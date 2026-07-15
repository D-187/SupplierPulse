import type { MetricSnapshotModel, SupplierModel } from "@/generated/prisma/models";

export type SupplierWithSnapshot = SupplierModel & {
  snapshot: MetricSnapshotModel | null;
};
