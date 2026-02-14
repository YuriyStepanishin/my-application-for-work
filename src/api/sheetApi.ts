import { API_URL } from './config';
import type { SheetRow } from '../types/sheet';

export async function fetchSheetData(): Promise<SheetRow[]> {
  const res = await fetch(API_URL);

  if (!res.ok) {
    throw new Error('Помилка завантаження таблиці');
  }

  return await res.json();
}
