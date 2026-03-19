import Papa from 'papaparse';

export function loadCsv<T = unknown>(url: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(url, {
      download: true,
      header: true,
      skipEmptyLines: true,

      complete: res => {
        resolve(res.data);
      },

      error: err => reject(err),
    });
  });
}
