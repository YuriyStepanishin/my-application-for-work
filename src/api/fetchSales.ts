import { SALES_URL } from './config';
import {
  canViewRecordByEmail,
  getCurrentAuthorizedEmail,
} from '../config/userRoles';

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

const AGENT_DEPARTMENT: Record<string, string> = {
  'Сотрудник ОРІМІ': 'Офіс',
  'Дюг Тетяна': "Кам'янець-Подільський відділ",
  'Івасишин Денис': "Кам'янець-Подільський відділ",
  'Олійник Влад': "Кам'янець-Подільський відділ",
  'Гриник Ольга': 'Область (центр)',
  'Довга Діана': 'Місто',
  'Лаптєва Руслана': 'Місто',
  'Могильна Оксана': 'Область (центр)',
  'Сторожук Аліна': 'Область (центр)',
  'Ящишина Наталія': 'Місто',
  'Кучер Аня': 'Шепетівський відділ',
  'Мартинчик Альона': 'Шепетівський відділ',
  'Нагорняк Світлана': 'Шепетівський відділ',
  'Швець Ірина': 'Шепетівський відділ',
};

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

function resolveDepartment(raw: MaybeObject, agent: string): string {
  const explicitDepartment = cleanText(
    getFirstPresent(raw, ['відділ', 'Отдел'])
  );
  if (explicitDepartment) return explicitDepartment;
  return AGENT_DEPARTMENT[agent] || 'Інше';
}

function normalizeSale(raw: MaybeObject): Sale {
  const point = cleanText(getFirstPresent(raw, ['точка', 'Точка']));
  const address = cleanText(
    getFirstPresent(raw, ['адреса', 'Факт. адрес', 'факт. адрес'])
  );
  const agent = cleanText(getFirstPresent(raw, ['агент', 'Агент']));

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
    агент: agent,
    відділ: resolveDepartment(raw, agent),
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
    const errorBody = await response.text().catch(() => '');
    if (response.status === 403) {
      throw new Error(
        'Доступ до sales API заборонено (403). Перевірте деплой Google Apps Script: доступ має бути "Anyone" і використовуйте актуальний URL /exec.'
      );
    }

    throw new Error(
      `Не вдалося завантажити продажі (${response.status})${errorBody ? `: ${errorBody.slice(0, 120)}` : ''}`
    );
  }

  const payload: unknown = await response.json();
  const rows = extractRows(payload);

  const normalized = rows
    .filter(
      (row): row is MaybeObject => typeof row === 'object' && row !== null
    )
    .map(normalizeSale)
    .filter(sale => sale.дата);

  const authEmail = getCurrentAuthorizedEmail();
  if (!authEmail) return [];

  return normalized.filter(sale =>
    canViewRecordByEmail(authEmail, sale.відділ, sale.агент)
  );
}
