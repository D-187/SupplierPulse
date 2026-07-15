import { describe, expect, it } from "vitest";
import { METRIC_KEYS } from "./scoring";
import { validateRows } from "./uploadValidation";

const HEADER = ["supplierName", ...METRIC_KEYS];

const GOOD_ROW = [
  "Acme Textiles",
  10, // revenueGrowthRate
  2, // paymentDelinquencyRate
  80, // cashFlowStabilityScore
  95, // onTimeDeliveryRate
  90, // orderFulfillmentRate
  5, // avgLeadTimeDays
  1, // defectRate
  3, // customerReturnRate
  4.2, // customerRatingAvg
  100, // documentationComplianceRate
  0, // regulatoryViolationsCount
  100, // certificationValidity
];

describe("validateRows", () => {
  it("parses a well-formed file with no errors", () => {
    const { suppliers, errors } = validateRows([HEADER, GOOD_ROW]);
    expect(errors).toEqual([]);
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toBe("Acme Textiles");
    expect(suppliers[0].metrics.defectRate).toBe(1);
  });

  it("rejects an empty file", () => {
    const { errors, suppliers } = validateRows([]);
    expect(suppliers).toEqual([]);
    expect(errors[0]).toMatch(/empty/i);
  });

  it("reports missing required columns instead of crashing", () => {
    const badHeader = ["supplierName", "revenueGrowthRate"];
    const { errors, suppliers } = validateRows([badHeader, ["Acme", 10]]);
    expect(suppliers).toEqual([]);
    expect(errors[0]).toMatch(/Missing required column/);
    expect(errors[0]).toContain("paymentDelinquencyRate");
  });

  it("reports a specific error for a non-numeric metric cell", () => {
    const badRow = [...GOOD_ROW];
    badRow[6] = "N/A"; // avgLeadTimeDays
    const { errors, suppliers } = validateRows([HEADER, badRow]);
    expect(suppliers).toEqual([]);
    expect(errors).toEqual([`Row 2: "avgLeadTimeDays" must be a number (got "N/A").`]);
  });

  it("reports a missing supplier name", () => {
    const badRow = [...GOOD_ROW];
    badRow[0] = "";
    const { errors, suppliers } = validateRows([HEADER, badRow]);
    expect(suppliers).toEqual([]);
    expect(errors).toContain('Row 2: "supplierName" is required.');
  });

  it("reports duplicate supplier names", () => {
    const { errors, suppliers } = validateRows([HEADER, GOOD_ROW, GOOD_ROW]);
    expect(suppliers).toEqual([]);
    expect(errors).toContain('Row 3: duplicate supplier name "Acme Textiles".');
  });

  it("skips blank trailing rows without treating them as missing data", () => {
    const { errors, suppliers } = validateRows([HEADER, GOOD_ROW, ["", "", "", "", "", "", "", "", "", "", "", "", ""]]);
    expect(errors).toEqual([]);
    expect(suppliers).toHaveLength(1);
  });

  it("writes nothing (empty suppliers array) whenever there is at least one error", () => {
    const badRow = [...GOOD_ROW];
    badRow[0] = ""; // bad name
    const { suppliers } = validateRows([HEADER, GOOD_ROW, badRow]);
    expect(suppliers).toEqual([]);
  });
});
