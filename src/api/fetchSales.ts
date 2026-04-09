import { SALES_URL } from './config';

export type Sale = {
  місяць: string;
  дата: string;
  бренд: string;
  товар: string;
  вага: number;
  кількість: number;
  сума: number;
  точка: string;
  адреса: string;
  агент: string;
  відділ: string;
  торгова_точка: string;
  джерело: string;
};

type MaybeObject = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null) return 0;

  const cleaned = String(value)
    .replace(/\u00A0/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown): string {
  if (value == null) return '';

  return String(value)
    .replace(/\u00A0/g, ' ')
    .trim();
}

function getFirstPresent(source: MaybeObject, keys: string[]): unknown {
  for (const key of keys) {
    if (key in source) return source[key];
  }

  return undefined;
}

function resolveStore(raw: MaybeObject): string {
  const explicitStore = cleanText(getFirstPresent(raw, ['торгова_точка']));
  if (explicitStore) return explicitStore;

  const point = cleanText(getFirstPresent(raw, ['точка', 'Точка']));
  const address = cleanText(
    getFirstPresent(raw, ['адреса', 'Факт. адрес', 'факт. адрес'])
  );

  if (!point) return '';
  return address ? `${point} (${address})` : point;
}

function normalizeSale(raw: MaybeObject): Sale {
  const point = cleanText(getFirstPresent(raw, ['точка', 'Точка']));
  const address = cleanText(
    getFirstPresent(raw, ['адреса', 'Факт. адрес', 'факт. адрес'])
  );

  return {
    місяць: cleanText(getFirstPresent(raw, ['місяць', 'Месяц'])),
    дата: cleanText(getFirstPresent(raw, ['дата', 'Дата'])),
    бренд: cleanText(getFirstPresent(raw, ['бренд', 'ТМ'])),
    товар: cleanText(getFirstPresent(raw, ['товар', 'Товар'])),
    вага: toNumber(getFirstPresent(raw, ['вага', 'Вес'])),
    кількість: toNumber(getFirstPresent(raw, ['кількість', 'Кво'])),
    сума: toNumber(getFirstPresent(raw, ['сума', 'Сумма'])),
    точка: point,
    адреса: address,
    агент: cleanText(getFirstPresent(raw, ['агент', 'Агент'])),
    відділ: cleanText(getFirstPresent(raw, ['відділ', 'Отдел'])),
    торгова_точка: resolveStore(raw),
    джерело: cleanText(getFirstPresent(raw, ['джерело', 'source'])) || 'main',
  };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const objectPayload = payload as Record<string, unknown>;

  for (const key of ['data', 'result', 'rows', 'items']) {
    const candidate = objectPayload[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

export async function fetchSales(): Promise<Sale[]> {
  const response = await fetch(SALES_URL);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити продажі (${response.status})`);
  }

  const payload: unknown = await response.json();
  const rows = extractRows(payload);

  return rows
    .filter(
      (row): row is MaybeObject => typeof row === 'object' && row !== null
    )
    .map(normalizeSale)
    .filter(sale => sale.дата);
}
