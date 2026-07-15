// Pure scoring engine — no DB or React dependency, so both the server
// (initial render) and the client (live admin-panel recompute) can call
// the exact same functions against already-fetched data.

export type RawMetrics = {
  revenueGrowthRate: number;
  paymentDelinquencyRate: number;
  cashFlowStabilityScore: number;
  onTimeDeliveryRate: number;
  orderFulfillmentRate: number;
  avgLeadTimeDays: number;
  defectRate: number;
  customerReturnRate: number;
  customerRatingAvg: number;
  documentationComplianceRate: number;
  regulatoryViolationsCount: number;
  certificationValidity: number;
};

export type MetricKey = keyof RawMetrics;

export type CategoryKey = "financial" | "operations" | "quality" | "compliance";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  financial: "Financial reliability",
  operations: "Operations",
  quality: "Quality",
  compliance: "Compliance",
};

export type CategoryWeights = Record<CategoryKey, number>;

// Percentages; sliders in the admin panel don't have to sum to exactly
// 100 while being dragged, so computeOverallScore normalizes by the
// actual total rather than assuming it.
export const DEFAULT_WEIGHTS: CategoryWeights = {
  financial: 25,
  operations: 25,
  quality: 25,
  compliance: 25,
};

export type Tier = "Healthy" | "Watch" | "At-risk";

interface MetricConfig {
  key: MetricKey;
  category: CategoryKey;
  label: string;
  direction: "higher-better" | "lower-better";
  min: number;
  max: number;
}

const METRICS: MetricConfig[] = [
  // Financial reliability
  {
    key: "revenueGrowthRate",
    category: "financial",
    label: "Revenue growth rate",
    direction: "higher-better",
    min: -20,
    max: 30,
  },
  {
    key: "paymentDelinquencyRate",
    category: "financial",
    label: "Payment delinquency rate",
    direction: "lower-better",
    min: 0,
    max: 30,
  },
  {
    key: "cashFlowStabilityScore",
    category: "financial",
    label: "Cash flow stability",
    direction: "higher-better",
    min: 0,
    max: 100,
  },
  // Operations
  {
    key: "onTimeDeliveryRate",
    category: "operations",
    label: "On-time delivery rate",
    direction: "higher-better",
    min: 0,
    max: 100,
  },
  {
    key: "orderFulfillmentRate",
    category: "operations",
    label: "Order fulfillment rate",
    direction: "higher-better",
    min: 0,
    max: 100,
  },
  {
    key: "avgLeadTimeDays",
    category: "operations",
    label: "Average lead time",
    direction: "lower-better",
    min: 1,
    max: 30,
  },
  // Quality
  {
    key: "defectRate",
    category: "quality",
    label: "Defect rate",
    direction: "lower-better",
    min: 0,
    max: 15,
  },
  {
    key: "customerReturnRate",
    category: "quality",
    label: "Customer return rate",
    direction: "lower-better",
    min: 0,
    max: 20,
  },
  {
    key: "customerRatingAvg",
    category: "quality",
    label: "Average customer rating",
    direction: "higher-better",
    min: 1,
    max: 5,
  },
  // Compliance
  {
    key: "documentationComplianceRate",
    category: "compliance",
    label: "Documentation compliance rate",
    direction: "higher-better",
    min: 0,
    max: 100,
  },
  {
    key: "regulatoryViolationsCount",
    category: "compliance",
    label: "Regulatory violations",
    direction: "lower-better",
    min: 0,
    max: 10,
  },
  {
    key: "certificationValidity",
    category: "compliance",
    label: "Certification validity",
    direction: "higher-better",
    min: 0,
    max: 100,
  },
];

export const METRIC_KEYS: MetricKey[] = METRICS.map((m) => m.key);

export interface MetricDefinition {
  key: MetricKey;
  category: CategoryKey;
  label: string;
  direction: "higher-better" | "lower-better";
  min: number;
  max: number;
}

// Exposed read-only so the upload template/validator and any docs can stay
// in sync with the scoring engine's own metric definitions.
export const METRIC_DEFINITIONS: readonly MetricDefinition[] = METRICS;

export const METRIC_LABELS: Record<MetricKey, string> = Object.fromEntries(
  METRICS.map((m) => [m.key, m.label])
) as Record<MetricKey, string>;

export const METRIC_CATEGORY: Record<MetricKey, CategoryKey> = Object.fromEntries(
  METRICS.map((m) => [m.key, m.category])
) as Record<MetricKey, CategoryKey>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeMetric(value: number, config: MetricConfig): number {
  const { min, max, direction } = config;
  const ratio = (value - min) / (max - min);
  const score = direction === "higher-better" ? ratio * 100 : (1 - ratio) * 100;
  return clamp(score, 0, 100);
}

export function computeMetricScores(metrics: RawMetrics): Record<MetricKey, number> {
  const result = {} as Record<MetricKey, number>;
  for (const config of METRICS) {
    result[config.key] = normalizeMetric(metrics[config.key], config);
  }
  return result;
}

export function computeCategoryScores(
  metricScores: Record<MetricKey, number>
): Record<CategoryKey, number> {
  const totals: Record<CategoryKey, { sum: number; count: number }> = {
    financial: { sum: 0, count: 0 },
    operations: { sum: 0, count: 0 },
    quality: { sum: 0, count: 0 },
    compliance: { sum: 0, count: 0 },
  };
  for (const config of METRICS) {
    const bucket = totals[config.category];
    bucket.sum += metricScores[config.key];
    bucket.count += 1;
  }
  return {
    financial: totals.financial.sum / totals.financial.count,
    operations: totals.operations.sum / totals.operations.count,
    quality: totals.quality.sum / totals.quality.count,
    compliance: totals.compliance.sum / totals.compliance.count,
  };
}

export function computeOverallScore(
  categoryScores: Record<CategoryKey, number>,
  weights: CategoryWeights
): number {
  const totalWeight =
    weights.financial + weights.operations + weights.quality + weights.compliance;
  if (totalWeight <= 0) return 0;
  const weighted =
    categoryScores.financial * weights.financial +
    categoryScores.operations * weights.operations +
    categoryScores.quality * weights.quality +
    categoryScores.compliance * weights.compliance;
  return weighted / totalWeight;
}

export const TIER_THRESHOLDS = {
  healthy: 75,
  watch: 50,
} as const;

export function getTier(overallScore: number): Tier {
  if (overallScore >= TIER_THRESHOLDS.healthy) return "Healthy";
  if (overallScore >= TIER_THRESHOLDS.watch) return "Watch";
  return "At-risk";
}

export type RoutingOutcome = "eligible" | "coaching";

export const ROUTING_LABELS: Record<RoutingOutcome, string> = {
  eligible: "Eligible for a financial product",
  coaching: "Needs coaching support",
};

export function getRoutingOutcome(tier: Tier): RoutingOutcome {
  return tier === "Healthy" ? "eligible" : "coaching";
}

export interface WeakestMetric {
  key: MetricKey;
  label: string;
  category: CategoryKey;
  score: number;
}

export function getWeakestMetric(metricScores: Record<MetricKey, number>): WeakestMetric {
  let weakest: MetricConfig = METRICS[0];
  for (const config of METRICS) {
    if (metricScores[config.key] < metricScores[weakest.key]) {
      weakest = config;
    }
  }
  return {
    key: weakest.key,
    label: weakest.label,
    category: weakest.category,
    score: metricScores[weakest.key],
  };
}

const COACHING_MESSAGES: Record<MetricKey, string> = {
  revenueGrowthRate:
    "Revenue growth has been flat or declining. Focus on stabilizing order volume before taking on new commitments.",
  paymentDelinquencyRate:
    "Payments to upstream obligations have been delayed. Prioritize clearing outstanding dues to rebuild reliability.",
  cashFlowStabilityScore:
    "Cash flow has been inconsistent period to period. Build a buffer to smooth out volatility.",
  onTimeDeliveryRate:
    "On-time delivery is below target. Review logistics partners and add buffer to lead times.",
  orderFulfillmentRate:
    "A meaningful share of orders are going unfulfilled. Audit inventory planning to close the gap.",
  avgLeadTimeDays:
    "Average lead time is longer than target. Look for bottlenecks in production or dispatch.",
  defectRate: "Defect rate is above acceptable levels. Tighten quality checks before dispatch.",
  customerReturnRate:
    "Returns are higher than expected. Investigate the top return reasons from this period.",
  customerRatingAvg:
    "Customer ratings are trending low. Review recent feedback for recurring complaints.",
  documentationComplianceRate:
    "Required documentation is incomplete. Submit outstanding compliance paperwork.",
  regulatoryViolationsCount:
    "There are open regulatory violations on file. Resolve these before they affect standing.",
  certificationValidity:
    "One or more required certifications have lapsed. Renew them to stay compliant.",
};

export function getCoachingMessage(weakestMetric: WeakestMetric): string {
  return COACHING_MESSAGES[weakestMetric.key];
}

export interface SupplierScore {
  metricScores: Record<MetricKey, number>;
  categoryScores: Record<CategoryKey, number>;
  overallScore: number;
  tier: Tier;
  routing: RoutingOutcome;
  weakestMetric: WeakestMetric;
  coachingMessage: string | null;
}

export function scoreSupplier(
  metrics: RawMetrics,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): SupplierScore {
  const metricScores = computeMetricScores(metrics);
  const categoryScores = computeCategoryScores(metricScores);
  const overallScore = computeOverallScore(categoryScores, weights);
  const tier = getTier(overallScore);
  const routing = getRoutingOutcome(tier);
  const weakestMetric = getWeakestMetric(metricScores);
  const coachingMessage = routing === "coaching" ? getCoachingMessage(weakestMetric) : null;

  return {
    metricScores,
    categoryScores,
    overallScore,
    tier,
    routing,
    weakestMetric,
    coachingMessage,
  };
}
