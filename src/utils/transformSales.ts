type RawSale = Record<string, string>;

export function transformSales(raw: RawSale[]) {
  return raw
    .filter(r => r['Дата'])
    .map(r => ({
      date: r['Дата'],
      brand: r['ТМ'],
      product: r['Товар'],
      qty: Number((r['Кво'] || '0').replace(',', '.')),
      amount: Number((r['Сума'] || '0').replace(',', '.')),
      agent: r['Агент'],
      supervisor: r['Супер'],
      store: r['Точка Название'],
    }));
}
