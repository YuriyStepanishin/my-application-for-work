import { API_URL, BONUS_API_URL } from './config';
import type { SheetRow } from '../types/sheet';
import {
  canViewRecordByEmail,
  getCurrentAuthorizedEmail,
} from '../config/userRoles';

function filterSheetRowsByAccess(rows: SheetRow[]): SheetRow[] {
  const authEmail = getCurrentAuthorizedEmail();
  if (!authEmail) return [];

  return rows.filter(row =>
    canViewRecordByEmail(authEmail, row.department, row.representative)
  );
}

export async function fetchSheetData(): Promise<SheetRow[]> {
  const res = await fetch(API_URL + '?action=getSheetData');

  if (!res.ok) {
    throw new Error('Помилка завантаження таблиці Акції вітрини');
  }

  const json = await res.json();

  const rows = Array.isArray(json.data) ? (json.data as SheetRow[]) : [];
  return filterSheetRowsByAccess(rows);
}

export async function fetchBonusSheetData(): Promise<SheetRow[]> {
  const res = await fetch(BONUS_API_URL + '?action=getSheetData');

  if (!res.ok) {
    throw new Error('Помилка завантаження таблиці Фотозвіти ТП');
  }

  const json = await res.json();

  const rows = Array.isArray(json.data) ? (json.data as SheetRow[]) : [];
  return filterSheetRowsByAccess(rows);
}
