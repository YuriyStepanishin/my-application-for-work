import type { Sale } from '../../api/fetchSales';
import { type BrandFilter, matchesBrand } from './agentsConfig';

export type AssortmentMode = 'all' | 'specific';
export type MetricBase = 'sum' | 'tt' | 'sku';
export type MetricUnit = 'grn' | 'kg' | 'pcs' | 'sku';

export type MetricType =
  | 'grn' // Сума грн
  | 'kg' // Сума кг
  | 'pcs' // Сума шт
  | 'tt' // ТТ від 0
  | 'tt_from_x' // ТТ від грн (backward compat)
  | 'tt_from_kg' // ТТ від кг
  | 'tt_from_pcs' // ТТ від шт
  | 'tt_from_sku' // ТТ від SKU
  | 'checkin_sku' // Асортимент по ТМ (чекін)
  | 'total_sku' // Сумарне SKU
  | 'avg_sku'; // Середнє SKU

export interface PlanColumn {
  id: string;
  label: string;
  brand: BrandFilter;
  brands?: BrandFilter[];
  assortmentMode?: AssortmentMode;
  assortmentProduct?: string;
  assortmentProducts?: string[];
  metric: MetricType;
  /** Поріг для tt_from_* метрик */
  threshold: number;
  /** План на агента: { 'Гриник Ольга': 65, ... } */
  agentPlans: Record<string, number>;
  /** Режим плану по відділу: 'total' — один план на відділ, 'individual' — на кожного агента */
  deptMode?: Record<string, 'total' | 'individual'>;
  /** Загальний план по відділу (використовується коли deptMode[dept] === 'total') */
  deptPlans?: Record<string, number>;
}

export const BRAND_OPTIONS: { value: BrandFilter; label: string }[] = [
  { value: 'jockey', label: 'Жокей' },
  { value: 'greenfield', label: 'Greenfield' },
  { value: 'tess', label: 'TESS' },
  { value: 'jardin', label: 'JARDIN' },
  { value: 'piazza', label: 'PIAZZA' },
  { value: 'princessa_nuri', label: 'Принцеса Нурі' },
  { value: 'princessa_kandi', label: 'Принцеса Канді' },
  { value: 'princessa_yava', label: 'Принцеса Ява' },
  { value: 'princessa_gita', label: 'Принцеса Гіта' },
  { value: 'delicia', label: 'Деліція' },
];

export const ASSORTMENT_MODE_OPTIONS: {
  value: AssortmentMode;
  label: string;
}[] = [
  { value: 'all', label: 'Увесь асортимент' },
  { value: 'specific', label: 'Визначений асортимент' },
];

export const METRIC_BASE_OPTIONS: { value: MetricBase; label: string }[] = [
  { value: 'sum', label: 'Сума' },
  { value: 'tt', label: 'ТТ' },
  { value: 'sku', label: 'SKU' },
];

export const METRIC_UNIT_OPTIONS: { value: MetricUnit; label: string }[] = [
  { value: 'grn', label: 'грн' },
  { value: 'kg', label: 'кг' },
  { value: 'pcs', label: 'шт' },
  { value: 'sku', label: 'SKU' },
];

function normalizeText(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

function selectedBrands(column: PlanColumn): BrandFilter[] {
  if (Array.isArray(column.brands) && column.brands.length > 0) {
    return column.brands;
  }
  return [column.brand];
}

function selectedAssortmentProducts(column: PlanColumn): string[] {
  if (
    Array.isArray(column.assortmentProducts) &&
    column.assortmentProducts.length > 0
  ) {
    return column.assortmentProducts;
  }
  if (column.assortmentProduct) {
    return [column.assortmentProduct];
  }
  return [];
}

function matchesAnyBrand(rawBrand: string, column: PlanColumn): boolean {
  return selectedBrands(column).some(filter => matchesBrand(rawBrand, filter));
}

function matchesAssortment(rawProduct: string, column: PlanColumn): boolean {
  if ((column.assortmentMode ?? 'all') !== 'specific') return true;
  const selected = selectedAssortmentProducts(column).map(normalizeText);
  if (selected.length === 0) return true;
  return selected.includes(normalizeText(rawProduct));
}

export function inferMetricControls(metric: MetricType): {
  base: MetricBase;
  unit: MetricUnit;
  thresholdEnabled: boolean;
} {
  switch (metric) {
    case 'grn':
      return { base: 'sum', unit: 'grn', thresholdEnabled: false };
    case 'kg':
      return { base: 'sum', unit: 'kg', thresholdEnabled: false };
    case 'pcs':
      return { base: 'sum', unit: 'pcs', thresholdEnabled: false };
    case 'tt':
      return { base: 'tt', unit: 'grn', thresholdEnabled: false };
    case 'tt_from_x':
      return { base: 'tt', unit: 'grn', thresholdEnabled: true };
    case 'tt_from_kg':
      return { base: 'tt', unit: 'kg', thresholdEnabled: true };
    case 'tt_from_pcs':
      return { base: 'tt', unit: 'pcs', thresholdEnabled: true };
    case 'tt_from_sku':
      return { base: 'tt', unit: 'sku', thresholdEnabled: true };
    case 'avg_sku':
    case 'checkin_sku':
    case 'total_sku':
      return { base: 'sku', unit: 'sku', thresholdEnabled: false };
  }
}

export function buildMetricType(
  base: MetricBase,
  unit: MetricUnit,
  thresholdEnabled: boolean
): MetricType {
  if (base === 'sum') {
    if (unit === 'kg') return 'kg';
    if (unit === 'pcs') return 'pcs';
    return 'grn';
  }

  if (base === 'tt') {
    if (unit === 'kg') return 'tt_from_kg';
    if (unit === 'pcs') return 'tt_from_pcs';
    if (unit === 'sku') return 'tt_from_sku';
    return thresholdEnabled ? 'tt_from_x' : 'tt';
  }

  return 'total_sku';
}

export function metricLabel(metric: MetricType, threshold: number): string {
  switch (metric) {
    case 'grn':
      return 'Сума грн';
    case 'kg':
      return 'Сума кг';
    case 'pcs':
      return 'Сума шт';
    case 'tt':
      return 'ТТ';
    case 'tt_from_x':
      return `ТТ від ${threshold} грн`;
    case 'tt_from_kg':
      return `ТТ від ${threshold} кг`;
    case 'tt_from_pcs':
      return `ТТ від ${threshold} шт`;
    case 'tt_from_sku':
      return `ТТ від ${threshold} SKU`;
    case 'total_sku':
      return 'SKU';
    case 'avg_sku':
      return 'Середнє SKU';
    case 'checkin_sku':
      return 'SKU (чекін)';
  }
}

function normalizePlanColumn(column: PlanColumn): PlanColumn {
  const brands = selectedBrands(column);
  const assortmentProducts = selectedAssortmentProducts(column);
  return {
    ...column,
    brand: brands[0] ?? column.brand,
    brands,
    assortmentMode: column.assortmentMode ?? 'all',
    assortmentProduct: assortmentProducts[0] ?? '',
    assortmentProducts,
    deptMode: column.deptMode ?? {},
    deptPlans: column.deptPlans ?? {},
  };
}

/** Мітка порогу для tt_from_* метрик */
export function thresholdLabel(metric: MetricType): string {
  if (metric === 'tt_from_x') return 'Мінімальна грн у ТТ';
  if (metric === 'tt_from_kg') return 'Мінімальна кг у ТТ';
  if (metric === 'tt_from_pcs') return 'Мінімальна шт у ТТ';
  if (metric === 'tt_from_sku') return 'Мінімальна кількість SKU у ТТ';
  return 'Поріг';
}

export function isThresholdMetric(metric: MetricType): boolean {
  return (
    metric === 'tt_from_x' ||
    metric === 'tt_from_kg' ||
    metric === 'tt_from_pcs' ||
    metric === 'tt_from_sku'
  );
}

const STORAGE_KEY = 'implementation_plan_columns_v2';

const DEFAULT_COLUMNS: PlanColumn[] = [
  {
    id: 'default-akb',
    label: 'АКБ Orimi',
    brand: 'all_orimi',
    metric: 'tt_from_x',
    threshold: 500,
    agentPlans: {
      'Гриник Ольга': 65,
      'Довга Діана': 85,
      'Лаптєва Руслана': 90,
      'Могильна Оксана': 75,
      'Сторожук Аліна': 85,
      'Ящишина Наталія': 80,
      'Кучер Аня': 65,
      'Мартинчик Альона': 75,
      'Нагорняк Світлана': 80,
      'Дюг Тетяна': 60,
      'Івасишин Денис': 65,
      'Олійник Влад': 55,
      'Швець Ірина': 70,
    },
  },
  {
    id: 'default-vkb-jockey',
    label: 'ВКБ Жокей',
    brand: 'jockey',
    metric: 'tt',
    threshold: 0,
    agentPlans: {
      'Гриник Ольга': 50,
      'Довга Діана': 50,
      'Лаптєва Руслана': 55,
      'Могильна Оксана': 55,
      'Сторожук Аліна': 60,
      'Ящишина Наталія': 55,
      'Кучер Аня': 60,
      'Мартинчик Альона': 60,
      'Нагорняк Світлана': 65,
      'Дюг Тетяна': 60,
      'Івасишин Денис': 50,
      'Олійник Влад': 50,
      'Швець Ірина': 55,
    },
  },
  {
    id: 'default-delicia-grn',
    label: 'Деліція грн',
    brand: 'delicia',
    metric: 'grn',
    threshold: 0,
    agentPlans: {
      'Гриник Ольга': 145000,
      'Довга Діана': 145000,
      'Лаптєва Руслана': 170000,
      'Могильна Оксана': 140000,
      'Сторожук Аліна': 145000,
      'Ящишина Наталія': 145000,
      'Кучер Аня': 65000,
      'Мартинчик Альона': 75000,
      'Нагорняк Світлана': 135000,
      'Дюг Тетяна': 100000,
      'Івасишин Денис': 125000,
      'Олійник Влад': 110000,
      'Швець Ірина': 120000,
    },
  },
  {
    id: 'default-delicia-vkb',
    label: 'Деліція ВКБ',
    brand: 'delicia',
    metric: 'tt',
    threshold: 0,
    agentPlans: {
      'Гриник Ольга': 98,
      'Довга Діана': 100,
      'Лаптєва Руслана': 90,
      'Могильна Оксана': 98,
      'Сторожук Аліна': 100,
      'Ящишина Наталія': 110,
      'Кучер Аня': 100,
      'Мартинчик Альона': 90,
      'Нагорняк Світлана': 100,
      'Дюг Тетяна': 108,
      'Івасишин Денис': 108,
      'Олійник Влад': 108,
      'Швець Ірина': 100,
    },
  },
];

export function loadPlanColumns(): PlanColumn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS.map(normalizePlanColumn);
    const parsed = JSON.parse(raw) as PlanColumn[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_COLUMNS.map(normalizePlanColumn);
    }
    return parsed.map(normalizePlanColumn);
  } catch {
    return DEFAULT_COLUMNS.map(normalizePlanColumn);
  }
}

export function savePlanColumns(cols: PlanColumn[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

export function calcColumnFact(agentSales: Sale[], column: PlanColumn): number {
  const filtered = agentSales.filter(
    s => matchesAnyBrand(s.бренд, column) && matchesAssortment(s.товар, column)
  );

  switch (column.metric) {
    case 'grn':
      return filtered.reduce((sum, s) => sum + (s.сума || 0), 0);

    case 'tt': {
      const storeSum = new Map<string, number>();
      for (const s of filtered) {
        if (s.торгова_точка)
          storeSum.set(
            s.торгова_точка,
            (storeSum.get(s.торгова_точка) ?? 0) + (s.сума || 0)
          );
      }
      return [...storeSum.values()].filter(v => v >= 0).length;
    }

    case 'tt_from_x': {
      const storeSum = new Map<string, number>();
      for (const s of filtered) {
        if (s.торгова_точка)
          storeSum.set(
            s.торгова_точка,
            (storeSum.get(s.торгова_точка) ?? 0) + (s.сума || 0)
          );
      }
      return [...storeSum.values()].filter(v => v >= column.threshold).length;
    }

    case 'kg':
      return filtered.reduce((sum, s) => sum + (s.вага || 0), 0);

    case 'pcs':
      return filtered.reduce((sum, s) => sum + (s.кількість || 0), 0);

    case 'tt_from_kg': {
      const storeKg = new Map<string, number>();
      for (const s of filtered) {
        if (s.торгова_точка)
          storeKg.set(
            s.торгова_точка,
            (storeKg.get(s.торгова_точка) ?? 0) + (s.вага || 0)
          );
      }
      return [...storeKg.values()].filter(v => v >= column.threshold).length;
    }

    case 'tt_from_pcs': {
      const storeQty = new Map<string, number>();
      for (const s of filtered) {
        if (s.торгова_точка)
          storeQty.set(
            s.торгова_точка,
            (storeQty.get(s.торгова_точка) ?? 0) + (s.кількість || 0)
          );
      }
      return [...storeQty.values()].filter(v => v >= column.threshold).length;
    }

    case 'tt_from_sku': {
      const storeSkuCount = new Map<string, Set<string>>();
      for (const s of filtered) {
        if (!s.торгова_точка) continue;
        if (!storeSkuCount.has(s.торгова_точка))
          storeSkuCount.set(s.торгова_точка, new Set());
        if (s.товар)
          storeSkuCount
            .get(s.торгова_точка)!
            .add(s.товар.trim().toLocaleLowerCase('uk-UA'));
      }
      return [...storeSkuCount.values()].filter(v => v.size >= column.threshold)
        .length;
    }

    case 'checkin_sku': {
      // Кількість унікальних SKU по ТМ серед чекін-ТТ
      const skus = new Set<string>();
      for (const s of filtered) {
        if (s.товар) skus.add(s.товар.trim().toLocaleLowerCase('uk-UA'));
      }
      return skus.size;
    }

    case 'total_sku': {
      const skus = new Set<string>();
      for (const s of filtered) {
        if (s.товар) skus.add(s.товар.trim().toLocaleLowerCase('uk-UA'));
      }
      return skus.size;
    }

    case 'avg_sku': {
      const storeSkus = new Map<string, Set<string>>();
      for (const s of filtered) {
        if (!s.торгова_точка) continue;
        if (!storeSkus.has(s.торгова_точка))
          storeSkus.set(s.торгова_точка, new Set());
        if (s.товар)
          storeSkus
            .get(s.торгова_точка)!
            .add(s.товар.trim().toLocaleLowerCase('uk-UA'));
      }
      if (storeSkus.size === 0) return 0;
      const total = [...storeSkus.values()].reduce(
        (sum, set) => sum + set.size,
        0
      );
      return total / storeSkus.size;
    }
  }
}

export function isGrnMetric(metric: MetricType): boolean {
  return metric === 'grn' || metric === 'kg' || metric === 'pcs';
}
