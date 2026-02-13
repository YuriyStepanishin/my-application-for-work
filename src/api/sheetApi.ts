import type { SheetRow } from '../types/sheet';

const SHEET_API_URL =
  'https://script.google.com/macros/s/AKfycbzT-uh2UolI-DkWNaN6koptrFtKOP-9N8VmhdquPQPPThZRCKF3CrtAVAg0chPtLjZM/exec';

export async function fetchSheetData(): Promise<SheetRow[]> {
  const response = await fetch(SHEET_API_URL, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error('Помилка завантаження Google Sheet');
  }

  return await response.json();
}
