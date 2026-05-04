import { fetchSales } from './fetchSales';
import { fetchBonusSheetData } from './sheetApi';

export type StoreSelectorSource = 'sales' | 'bonus';

export type StoreSelectorRow = {
  department: string;
  representative: string;
  store: string;
};

export async function fetchStoreSelectorData(
  source: StoreSelectorSource
): Promise<StoreSelectorRow[]> {
  if (source === 'bonus') {
    const rows = await fetchBonusSheetData();

    return rows.map(row => ({
      department: row.department,
      representative: row.representative,
      store: row.store,
    }));
  }

  const sales = await fetchSales();

  return sales.map(item => ({
    department: item.відділ,
    representative: item.агент,
    store: item.торгова_точка,
  }));
}
