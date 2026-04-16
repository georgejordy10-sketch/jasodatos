import * as XLSX from "xlsx";

export interface ReadExcelResult {
  columns: string[];
  rows: Record<string, unknown>[];
  sheetName: string;
}

export async function readExcel(file: File): Promise<ReadExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo Excel no contiene hojas.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const firstRow = rows[0] ?? {};
  const columns = Object.keys(firstRow);

  return {
    columns,
    rows,
    sheetName,
  };
}