import { API_URL, BONUS_API_URL } from './config';
import type { SheetRow } from '../types/sheet';

export async function fetchSheetData(): Promise<SheetRow[]> {
  const res = await fetch(API_URL + '?action=getSheetData');

  if (!res.ok) {
    throw new Error('Помилка завантаження таблиці Акції вітрини');
  }

  const json = await res.json();

  return json.data;
}

export async function fetchBonusSheetData(): Promise<SheetRow[]> {
  const res = await fetch(BONUS_API_URL + '?action=getSheetData');

  if (!res.ok) {
    throw new Error('Помилка завантаження таблиці Фотозвіти ТП');
  }

  const json = await res.json();

  return json.data;
}
