import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  type RawMetrics,
  computeCategoryScores,
  computeMetricScores,
  computeOverallScore,
  getRoutingOutcome,
  getTier,
  getWeakestMetric,
  scoreSupplier,
} from "./scoring";

const perfectMetrics: RawMetrics = {
  revenueGrowthRate: 30,
  paymentDelinquencyRate: 0,
  cashFlowStabilityScore: 100,
  onTimeDeliveryRate: 100,
  orderFulfillmentRate: 100,
  avgLeadTimeDays: 1,
  defectRate: 0,
  customerReturnRate: 0,
  customerRatingAvg: 5,
  documentationComplianceRate: 100,
  regulatoryViolationsCount: 0,
  certificationValidity: 100,
};

const worstMetrics: RawMetrics = {
  revenueGrowthRate: -20,
  paymentDelinquencyRate: 30,
  cashFlowStabilityScore: 0,
  onTimeDeliveryRate: 0,
  orderFulfillmentRate: 0,
  avgLeadTimeDays: 30,
  defectRate: 15,
  customerReturnRate: 20,
  customerRatingAvg: 1,
  documentationComplianceRate: 0,
  regulatoryViolationsCount: 10,
  certificationValidity: 0,
};

describe("computeMetricScores", () => {
  it("scores a perfect supplier at 100 on every metric", () => {
    const scores = computeMetricScores(perfectMetrics);
    for (const value of Object.values(scores)) {
      expect(value).toBeCloseTo(100);
    }
  });

  it("scores the worst-case supplier at 0 on every metric", () => {
    const scores = computeMetricScores(worstMetrics);
    for (const value of Object.values(scores)) {
      expect(value).toBeCloseTo(0);
    }
  });

  it("clamps out-of-range raw values instead of exceeding 0-100", () => {
    const scores = computeMetricScores({ ...perfectMetrics, revenueGrowthRate: 1000 });
    expect(scores.revenueGrowthRate).toBe(100);
    const lowScores = computeMetricScores({ ...worstMetrics, defectRate: 1000 });
    expect(lowScores.defectRate).toBe(0);
  });
});

describe("computeCategoryScores + computeOverallScore", () => {
  it("averages a perfect supplier's categories to 100 and overall to 100", () => {
    const metricScores = computeMetricScores(perfectMetrics);
    const categoryScores = computeCategoryScores(metricScores);
    for (const value of Object.values(categoryScores)) {
      expect(value).toBeCloseTo(100);
    }
    expect(computeOverallScore(categoryScores, DEFAULT_WEIGHTS)).toBeCloseTo(100);
  });

  it("normalizes by total weight even when sliders don't sum to 100", () => {
    const metricScores = computeMetricScores(perfectMetrics);
    const categoryScores = computeCategoryScores(metricScores);
    const skewedWeights = { financial: 10, operations: 10, quality: 10, compliance: 10 };
    expect(computeOverallScore(categoryScores, skewedWeights)).toBeCloseTo(100);
  });

  it("weights categories proportionally", () => {
    // Only financial is perfect; everything else is worst-case.
    const mixed: RawMetrics = {
      ...worstMetrics,
      revenueGrowthRate: perfectMetrics.revenueGrowthRate,
      paymentDelinquencyRate: perfectMetrics.paymentDelinquencyRate,
      cashFlowStabilityScore: perfectMetrics.cashFlowStabilityScore,
    };
    const categoryScores = computeCategoryScores(computeMetricScores(mixed));
    const allWeightOnFinancial = { financial: 100, operations: 0, quality: 0, compliance: 0 };
    expect(computeOverallScore(categoryScores, allWeightOnFinancial)).toBeCloseTo(100);

    const noWeightOnFinancial = { financial: 0, operations: 33, quality: 33, compliance: 34 };
    expect(computeOverallScore(categoryScores, noWeightOnFinancial)).toBeCloseTo(0);
  });
});

describe("getTier", () => {
  it("classifies scores into Healthy / Watch / At-risk", () => {
    expect(getTier(100)).toBe("Healthy");
    expect(getTier(75)).toBe("Healthy");
    expect(getTier(74.9)).toBe("Watch");
    expect(getTier(50)).toBe("Watch");
    expect(getTier(49.9)).toBe("At-risk");
    expect(getTier(0)).toBe("At-risk");
  });
});

describe("getRoutingOutcome", () => {
  it("routes Healthy to eligible and everything else to coaching", () => {
    expect(getRoutingOutcome("Healthy")).toBe("eligible");
    expect(getRoutingOutcome("Watch")).toBe("coaching");
    expect(getRoutingOutcome("At-risk")).toBe("coaching");
  });
});

describe("getWeakestMetric", () => {
  it("identifies the single lowest-scoring metric", () => {
    const metrics = { ...perfectMetrics, defectRate: 15 }; // worst possible defect rate
    const weakest = getWeakestMetric(computeMetricScores(metrics));
    expect(weakest.key).toBe("defectRate");
    expect(weakest.score).toBeCloseTo(0);
  });
});

describe("scoreSupplier", () => {
  it("returns a coaching message tied to the weakest metric for Watch/At-risk suppliers", () => {
    const result = scoreSupplier(worstMetrics);
    expect(result.tier).toBe("At-risk");
    expect(result.routing).toBe("coaching");
    expect(result.coachingMessage).toBeTruthy();
  });

  it("returns no coaching message for Healthy/eligible suppliers", () => {
    const result = scoreSupplier(perfectMetrics);
    expect(result.tier).toBe("Healthy");
    expect(result.routing).toBe("eligible");
    expect(result.coachingMessage).toBeNull();
  });
});
