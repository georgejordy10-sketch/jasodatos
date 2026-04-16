import Papa from "papaparse";

export interface ReadCsvResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function readCsv(file: File): Promise<ReadCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        const rows = Array.isArray(results.data) ? results.data : [];
        const firstRow = rows[0] ?? {};
        const columns = Object.keys(firstRow);

        resolve({
          columns,
          rows,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}