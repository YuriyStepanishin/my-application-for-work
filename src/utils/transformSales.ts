import type { RawSale } from '../types/sales';

function toNumber(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  return Number(val.replace(',', '.'));
}

export function transformSales(raw: RawSale[]) {
  return raw
    .filter(r => r['Дата'])
    .map(r => ({
      date: r['Дата'],
      brand: r['ТМ'],
      product: r['Товар'],
      qty: toNumber(r['Кво']),
      amount: toNumber(r['Сума']),
      agent: r['Агент'],
      supervisor: r['Супер'],
      store: r['Точка Название'],
    }));
}
