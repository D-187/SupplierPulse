import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { validateRows } from "@/lib/uploadValidation";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ errors: ["No file was uploaded."] }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { errors: ["Only .xlsx files are supported."] },
      { status: 400 }
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json(
      { errors: ["Could not read the file. Make sure it's a valid .xlsx file."] },
      { status: 400 }
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ errors: ["The workbook has no sheets."] }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  const { suppliers, errors } = validateRows(rows);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.metricSnapshot.deleteMany(),
    prisma.supplier.deleteMany(),
    ...suppliers.map((s) =>
      prisma.supplier.create({
        data: {
          name: s.name,
          snapshot: { create: s.metrics },
        },
      })
    ),
  ]);

  return NextResponse.json({ count: suppliers.length });
}
