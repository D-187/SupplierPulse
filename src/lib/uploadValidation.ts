import { METRIC_KEYS, type MetricKey, type RawMetrics } from "./scoring";

export interface ParsedSupplierRow {
  name: string;
  metrics: RawMetrics;
}

export interface ValidationResult {
  suppliers: ParsedSupplierRow[];
  errors: string[];
}

const NAME_COLUMN = "supplierName";
const ALL_COLUMNS: string[] = [NAME_COLUMN, ...METRIC_KEYS];

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim();
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
}

/**
 * Validates the raw rows (as produced by `xlsx`'s `sheet_to_json(sheet, { header: 1 })`,
 * i.e. an array of arrays with the header row first) against the supplier upload
 * template. Returns either a full list of parsed suppliers, or a specific,
 * readable list of errors -- never both, and never a partial/best-effort result.
 */
export function validateRows(rows: unknown[][]): ValidationResult {
  if (rows.length === 0) {
    return { suppliers: [], errors: ["The file is empty."] };
  }

  const headerRow = rows[0].map(normalizeHeader);
  const headerIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (header) headerIndex.set(header.toLowerCase(), index);
  });

  const missingColumns = ALL_COLUMNS.filter((col) => !headerIndex.has(col.toLowerCase()));
  if (missingColumns.length > 0) {
    return {
      suppliers: [],
      errors: [`Missing required column(s): ${missingColumns.join(", ")}`],
    };
  }

  const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));
  if (dataRows.length === 0) {
    return { suppliers: [], errors: ["The file has no data rows below the header."] };
  }

  const errors: string[] = [];
  const suppliers: ParsedSupplierRow[] = [];
  const seenNames = new Set<string>();
  const nameIdx = headerIndex.get(NAME_COLUMN.toLowerCase())!;

  dataRows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const rawName = row[nameIdx];
    const name = String(rawName ?? "").trim();

    if (!name) {
      errors.push(`Row ${rowNumber}: "${NAME_COLUMN}" is required.`);
    } else if (seenNames.has(name.toLowerCase())) {
      errors.push(`Row ${rowNumber}: duplicate supplier name "${name}".`);
    } else {
      seenNames.add(name.toLowerCase());
    }

    const metrics = {} as RawMetrics;
    let rowHasErrors = !name;

    for (const key of METRIC_KEYS as MetricKey[]) {
      const idx = headerIndex.get(key.toLowerCase())!;
      const raw = row[idx];
      const asString = String(raw ?? "").trim();
      const num = typeof raw === "number" ? raw : parseFloat(asString);

      if (asString === "" || Number.isNaN(num)) {
        errors.push(`Row ${rowNumber}: "${key}" must be a number (got ${JSON.stringify(raw ?? "")}).`);
        rowHasErrors = true;
      } else {
        metrics[key] = num;
      }
    }

    if (!rowHasErrors) {
      suppliers.push({ name, metrics });
    }
  });

  if (errors.length > 0) {
    return { suppliers: [], errors };
  }

  return { suppliers, errors: [] };
}
