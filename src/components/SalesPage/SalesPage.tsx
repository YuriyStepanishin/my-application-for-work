import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { fetchSales, type Sale } from '../../api/fetchSales';
import styles from './SalesPage.module.css';
import Loader from '../Loader/Loader';
import SalesFilter from '../SalesFilter/SalesFilter';

type BrandData = {
  amount: number;
  weight: number;
  stores: Set<string>;
  storeMap: Record<string, number>;
  tt500: number;
};

type StoreDetailsRow = {
  name: string;
  sum: number;
  quantity: number;
  sku: number;
  products: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
  dates: Array<{
    key: string;
    label: string;
    sum: number;
    quantity: number;
    sku: number;
    products: Array<{
      name: string;
      quantity: number;
      amount: number;
    }>;
  }>;
};

const EXCLUDED_BRANDS = new Set(['Принцесв Канді']);

function getBrandOrderWeight(brand: string): number {
  if (brand === 'Greenfield') return 0;
  if (brand === 'TESS') return 1;
  if (brand.startsWith('Принцеса')) return 2;
  if (brand === 'Жокей') return 3;
  if (brand === 'JARDIN') return 4;
  if (brand === 'PIAZZA') return 5;
  return 6;
}

function sortBrandNames(a: string, b: string): number {
  const weightDiff = getBrandOrderWeight(a) - getBrandOrderWeight(b);
  if (weightDiff !== 0) return weightDiff;
  return a.localeCompare(b, 'uk');
}

function sortBrandRows(
  a: { brand: string; amount: number },
  b: { brand: string; amount: number }
): number {
  const weightDiff =
    getBrandOrderWeight(a.brand) - getBrandOrderWeight(b.brand);
  if (weightDiff !== 0) return weightDiff;

  // For brands inside one group (especially "Принцеса ..."), keep stronger sales first.
  const amountDiff = b.amount - a.amount;
  if (amountDiff !== 0) return amountDiff;

  return sortBrandNames(a.brand, b.brand);
}

/** Повертає дату у форматі "YYYY-MM-DD" або null якщо не вдалося розпарсити */
function parseSaleDate(raw: string): string | null {
  if (!raw) return null;

  // DD.MM.YYYY
  const dmyMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;

  // ISO / будь-яке інше що Date розпарсить
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function formatDateLabel(dateKey: string): string {
  if (!dateKey) return 'Без дати';

  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}.${match[2]}.${match[1]}`;

  return dateKey;
}

type SalesPageProps = {
  onBack: () => void;
  onOpenSalesByDays: () => void;
};

export default function SalesPage({
  onBack,
  onOpenSalesByDays,
}: SalesPageProps) {
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [agent, setAgent] = useState('');
  const [department, setDepartment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStores, setShowStores] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showByDates, setShowByDates] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 560px)').matches;
  });
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('uk-UA', {
        maximumFractionDigits: 2,
      }),
    []
  );

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 560px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const filtered = useMemo(() => {
    return data.filter(i => {
      if (department && i.відділ !== department) return false;
      if (agent && i.агент !== agent) return false;

      if (dateFrom || dateTo) {
        const saleDate = parseSaleDate(i.дата);
        if (saleDate === null) return false;
        if (dateFrom && saleDate < dateFrom) return false;
        if (dateTo && saleDate > dateTo) return false;
      }

      return true;
    });
  }, [data, agent, department, dateFrom, dateTo]);

  const groupedAllBrands = useMemo(() => {
    const result: Record<string, BrandData> = {};

    filtered.forEach(i => {
      if (!i.бренд || EXCLUDED_BRANDS.has(i.бренд)) return;

      if (!result[i.бренд]) {
        result[i.бренд] = {
          amount: 0,
          weight: 0,
          stores: new Set(),
          storeMap: {},
          tt500: 0,
        };
      }

      const b = result[i.бренд];

      b.amount += i.сума || 0;
      b.weight += (i.кількість || 0) * (i.вага || 0);

      const key = i.торгова_точка;

      if (!key) return;

      b.stores.add(key);
      b.storeMap[key] = (b.storeMap[key] || 0) + (i.сума || 0);
    });

    Object.values(result).forEach(b => {
      b.tt500 = Object.values(b.storeMap).filter(sum => sum >= 500).length;
    });

    return result;
  }, [filtered]);

  const availableBrandSet = useMemo(
    () => new Set(Object.keys(groupedAllBrands)),
    [groupedAllBrands]
  );

  const effectiveSelectedBrands = useMemo(
    () => selectedBrands.filter(brand => availableBrandSet.has(brand)),
    [selectedBrands, availableBrandSet]
  );

  const activeBrandSet = useMemo(
    () => new Set(effectiveSelectedBrands),
    [effectiveSelectedBrands]
  );

  const grouped = useMemo(() => {
    if (effectiveSelectedBrands.length === 0) return groupedAllBrands;

    const result: Record<string, BrandData> = {};
    Object.entries(groupedAllBrands).forEach(([brand, value]) => {
      if (activeBrandSet.has(brand)) result[brand] = value;
    });

    return result;
  }, [groupedAllBrands, effectiveSelectedBrands, activeBrandSet]);

  const brandOptions = useMemo(() => {
    return Object.entries(groupedAllBrands)
      .map(([brand, value]) => ({
        brand,
        amount: value.amount,
      }))
      .sort(sortBrandRows);
  }, [groupedAllBrands]);

  const brandsList = useMemo(() => {
    return Object.entries(grouped)
      .map(([brand, val]) => ({
        brand,
        ...val,
      }))
      .sort(sortBrandRows);
  }, [grouped]);

  const totalRow = useMemo(() => {
    let amount = 0;
    let weight = 0;
    const stores = new Set<string>();
    const globalStoreMap: Record<string, number> = {};

    Object.values(grouped).forEach(b => {
      amount += b.amount;
      weight += b.weight;

      Object.entries(b.storeMap).forEach(([store, sum]) => {
        stores.add(store);
        globalStoreMap[store] = (globalStoreMap[store] || 0) + sum;
      });
    });

    const tt500 = Object.values(globalStoreMap).filter(
      sum => sum >= 500
    ).length;

    return {
      amount,
      weight,
      stores: stores.size,
      tt500,
    };
  }, [grouped]);

  const selectedSales = useMemo(() => {
    if (effectiveSelectedBrands.length === 0) {
      return filtered.filter(item => !EXCLUDED_BRANDS.has(item.бренд));
    }

    return filtered.filter(
      item => !EXCLUDED_BRANDS.has(item.бренд) && activeBrandSet.has(item.бренд)
    );
  }, [filtered, effectiveSelectedBrands, activeBrandSet]);

  const selectedStores = useMemo<StoreDetailsRow[]>(() => {
    const storeMap: Record<
      string,
      {
        sum: number;
        quantity: number;
        products: Record<string, { quantity: number; amount: number }>;
        dates: Record<
          string,
          {
            sum: number;
            quantity: number;
            products: Record<string, { quantity: number; amount: number }>;
          }
        >;
      }
    > = {};

    selectedSales.forEach(item => {
      if (!item.торгова_точка) return;

      if (!storeMap[item.торгова_точка]) {
        storeMap[item.торгова_точка] = {
          sum: 0,
          quantity: 0,
          products: {},
          dates: {},
        };
      }

      const store = storeMap[item.торгова_точка];
      store.sum += item.сума || 0;
      store.quantity += item.кількість || 0;

      const parsedDate = parseSaleDate(item.дата) || '';
      if (!store.dates[parsedDate]) {
        store.dates[parsedDate] = {
          sum: 0,
          quantity: 0,
          products: {},
        };
      }

      const dateBucket = store.dates[parsedDate];
      dateBucket.sum += item.сума || 0;
      dateBucket.quantity += item.кількість || 0;

      if (item.товар) {
        if (!store.products[item.товар]) {
          store.products[item.товар] = {
            quantity: 0,
            amount: 0,
          };
        }

        store.products[item.товар].quantity += item.кількість || 0;
        store.products[item.товар].amount += item.сума || 0;

        if (!dateBucket.products[item.товар]) {
          dateBucket.products[item.товар] = {
            quantity: 0,
            amount: 0,
          };
        }

        dateBucket.products[item.товар].quantity += item.кількість || 0;
        dateBucket.products[item.товар].amount += item.сума || 0;
      }
    });

    return Object.entries(storeMap)
      .map(([name, value]) => ({
        name,
        sum: value.sum,
        quantity: value.quantity,
        sku: Object.keys(value.products).length,
        products: Object.entries(value.products)
          .map(([productName, productValue]) => ({
            name: productName,
            quantity: productValue.quantity,
            amount: productValue.amount,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
        dates: Object.entries(value.dates)
          .map(([dateKey, dateValue]) => ({
            key: dateKey,
            label: formatDateLabel(dateKey),
            sum: dateValue.sum,
            quantity: dateValue.quantity,
            sku: Object.keys(dateValue.products).length,
            products: Object.entries(dateValue.products)
              .map(([productName, productValue]) => ({
                name: productName,
                quantity: productValue.quantity,
                amount: productValue.amount,
              }))
              .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
          }))
          .sort((a, b) => {
            if (!a.key) return 1;
            if (!b.key) return -1;
            return b.key.localeCompare(a.key);
          }),
      }))
      .sort((a, b) => b.sum - a.sum);
  }, [selectedSales]);

  const format = (n: number) => numberFormatter.format(n);

  const uniqueDepartments = useMemo(
    () => [...new Set(data.map(d => d.відділ).filter(Boolean))],
    [data]
  );

  const uniqueAgents = useMemo(() => {
    return [
      ...new Set(
        data
          .filter(d => !department || d.відділ === department)
          .map(d => d.агент)
          .filter(Boolean)
      ),
    ];
  }, [data, department]);

  const handleDepartmentChange = (value: string) => {
    setDepartment(value);
  };

  const handleAgentChange = (value: string) => {
    setAgent(value);
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.filter(item => item !== brand)
        : [...prev, brand]
    );
  };

  const handleSaveExcel = async () => {
    const rows = selectedSales.map(s => ({
      Дата: s.дата,
      Місяць: s.місяць,
      Відділ: s.відділ,
      Агент: s.агент,
      ТТ: s.торгова_точка,
      Бренд: s.бренд,
      Товар: s.товар,
      Кількість: s.кількість,
      Вага: s.вага,
      Сума: s.сума,
    }));

    const renderRows: Array<Record<string, string | number>> = [];

    brandsList.forEach(b => {
      renderRows.push({
        Блок: 'Зведення ТМ',
        Назва: b.brand,
        ТТ: b.stores.size,
        'ТТ 500+': b.tt500,
        Вага: b.weight,
        Сума: b.amount,
      });
    });

    renderRows.push({
      Блок: 'Зведення ТМ',
      Назва: 'Усі торгові марки',
      ТТ: totalRow.stores,
      'ТТ 500+': totalRow.tt500,
      Вага: totalRow.weight,
      Сума: totalRow.amount,
    });

    if (showStores) {
      selectedStores.forEach(store => {
        renderRows.push({
          Блок: 'ТТ',
          ТТ: store.name,
          SKU: store.sku,
          Сума: store.sum,
        });

        if (showByDates) {
          store.dates.forEach(dateGroup => {
            renderRows.push({
              Блок: 'Дата в ТТ',
              ТТ: store.name,
              Дата: dateGroup.label,
              Кількість: dateGroup.quantity,
              Сума: dateGroup.sum,
              SKU: dateGroup.sku,
            });

            if (showProducts) {
              dateGroup.products.forEach(product => {
                renderRows.push({
                  Блок: 'Товар по даті',
                  ТТ: store.name,
                  Дата: dateGroup.label,
                  Товар: product.name,
                  Кількість: product.quantity,
                  Сума: product.amount,
                  Ціна:
                    product.quantity > 0
                      ? product.amount / product.quantity
                      : 0,
                });
              });
            }
          });
        } else if (showProducts) {
          store.products.forEach(product => {
            renderRows.push({
              Блок: 'Товар в ТТ',
              ТТ: store.name,
              Товар: product.name,
              Кількість: product.quantity,
              Сума: product.amount,
            });
          });
        }
      });
    }

    const summaryRows = brandsList.map(b => ({
      Бренд: b.brand,
      ТТ: b.stores.size,
      'ТТ 500+': b.tt500,
      Вага: b.weight,
      Сума: b.amount,
    }));
    summaryRows.push({
      Бренд: 'Усі торгові марки',
      ТТ: totalRow.stores,
      'ТТ 500+': totalRow.tt500,
      Вага: totalRow.weight,
      Сума: totalRow.amount,
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summaryRows),
      'Зведення'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(renderRows),
      'Рендер'
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Деталі');

    const fromPart = dateFrom || 'початок';
    const toPart = dateTo || 'кінець';
    const fileName = `продажі_${fromPart}_${toPart}.xlsx`;

    if (isMobile && typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        const fileBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const file = new File([fileBuffer], fileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const canShareWithFiles =
          'canShare' in navigator &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        if (canShareWithFiles) {
          await navigator.share({
            title: 'Продажі',
            files: [file],
          });
          return;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }

    XLSX.writeFile(wb, fileName);
  };

  if (isLoading) return <Loader />;
  if (error) return <div className={styles.error}>Помилка</div>;

  return (
    <div className={styles.container}>
      <div className={styles.desktopLayout}>
        <aside className={styles.sidebar}>
          <div className={styles.filtersSticky}>
            <SalesFilter
              departments={uniqueDepartments}
              agents={uniqueAgents}
              department={department}
              agent={agent}
              onChangeDepartment={handleDepartmentChange}
              onChangeAgent={handleAgentChange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChangeDateFrom={setDateFrom}
              onChangeDateTo={setDateTo}
            />

            <section className={styles.sidebarSection}>
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarControls}>
                  <label
                    className={`${styles.brandChip} ${showStores ? styles.brandChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showStores}
                      onChange={e => setShowStores(e.target.checked)}
                    />
                    <span>Показати ТТ</span>
                  </label>

                  <label
                    className={`${styles.brandChip} ${showProducts ? styles.brandChipActive : ''} ${!showStores ? styles.brandChipDisabled : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showProducts}
                      disabled={!showStores}
                      onChange={e => setShowProducts(e.target.checked)}
                    />
                    <span>З товаром</span>
                  </label>

                  <label
                    className={`${styles.brandChip} ${showByDates ? styles.brandChipActive : ''} ${!showStores ? styles.brandChipDisabled : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showByDates}
                      disabled={!showStores}
                      onChange={e => setShowByDates(e.target.checked)}
                    />
                    <span>По датам</span>
                  </label>
                </div>
              </div>
            </section>

            <section className={styles.sidebarSection}>
              <div className={styles.sidebarCard}>
                <div className={styles.brandFilters}>
                  <label
                    className={`${styles.brandChip} ${styles.brandChipAll} ${effectiveSelectedBrands.length === 0 ? styles.brandChipAllActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={effectiveSelectedBrands.length === 0}
                      onChange={() => setSelectedBrands([])}
                    />
                    <span>Усі ТМ</span>
                  </label>

                  {brandOptions.map(option => {
                    const isChecked = activeBrandSet.has(option.brand);

                    return (
                      <label
                        key={option.brand}
                        className={`${styles.brandChip} ${isChecked ? styles.brandChipActive : ''}`}
                      >
                        <input
                          type="checkbox"
                          className={styles.brandChipCheckbox}
                          checked={isChecked}
                          onChange={() => handleBrandToggle(option.brand)}
                        />
                        <span>{option.brand}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className={styles.sidebarButtons}>
              <button
                type="button"
                className={styles.sidebarSaveButton}
                onClick={handleSaveExcel}
              >
                {isMobile ? 'Поділитись' : 'Зберегти'}
              </button>
              <button
                type="button"
                className={styles.salesByDaysButton}
                onClick={onOpenSalesByDays}
              >
                Продажі по днях
              </button>
            </div>
          </div>
        </aside>

        <div ref={mainContentRef} className={styles.mainContent}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Торгова марка</th>
                <th>ТТ</th>
                <th>500+</th>
                <th>Вага</th>
                <th>Сума</th>
              </tr>
            </thead>

            <tbody>
              {brandsList.map(b => (
                <tr key={b.brand}>
                  <td className={styles.brandName}>{b.brand}</td>
                  <td>{b.stores.size}</td>
                  <td>{b.tt500}</td>
                  <td>{format(b.weight)}</td>
                  <td>{format(b.amount)}</td>
                </tr>
              ))}

              <tr className={styles.totalRow}>
                <td>
                  <b>Усі торгові марки</b>
                </td>
                <td>
                  <b>{totalRow.stores}</b>
                </td>
                <td>
                  <b>{totalRow.tt500}</b>
                </td>
                <td>
                  <b>{format(totalRow.weight)}</b>
                </td>
                <td>
                  <b>{format(totalRow.amount)}</b>
                </td>
              </tr>
            </tbody>
          </table>

          {showStores && (
            <div className={styles.subBlock}>
              <div className={styles.subHeader}>
                <h3 className={styles.subTitle}>
                  ТТ ({selectedStores.length})
                </h3>
              </div>

              <div className={styles.storeList}>
                {selectedStores.map(({ name, sum, sku, products, dates }) => (
                  <div key={name} className={styles.storeCard}>
                    <div className={styles.storeRow}>
                      <span className={styles.storeName}>{name}</span>
                      <span className={styles.storeAmountBlock}>
                        <span className={styles.storeSum}>
                          {sum >= 500 && (
                            <span className={styles.storeStar}>★</span>
                          )}
                          {format(sum)}
                        </span>
                      </span>
                      <span className={styles.storeSku}>SKU: {sku}</span>
                    </div>
                    {showByDates && dates.length > 0 && (
                      <div className={styles.dateGroupList}>
                        {dates.map(dateGroup => (
                          <div
                            key={`${name}-${dateGroup.key || 'no-date'}`}
                            className={styles.dateGroup}
                          >
                            <div className={styles.dateGroupRow}>
                              <span className={styles.dateGroupLabel}>
                                {dateGroup.label}
                              </span>
                              <span className={styles.dateGroupMetaItem}>
                                К-сть: {format(dateGroup.quantity)}
                              </span>
                              <span className={styles.dateGroupMetaItem}>
                                Сума: {format(dateGroup.sum)}
                              </span>
                              <span className={styles.dateGroupMetaItem}>
                                SKU: {dateGroup.sku}
                              </span>
                            </div>

                            {showProducts && dateGroup.products.length > 0 && (
                              <ul className={styles.productList}>
                                {dateGroup.products.map(p => (
                                  <li
                                    key={p.name}
                                    className={styles.productItem}
                                  >
                                    <span className={styles.productName}>
                                      {p.name}
                                    </span>
                                    <span className={styles.productMeta}>
                                      <span className={styles.productQty}>
                                        {format(p.quantity)}
                                      </span>
                                      <span className={styles.productAmount}>
                                        {format(p.amount)}
                                      </span>
                                      <span className={styles.productPrice}>
                                        {p.quantity > 0
                                          ? format(p.amount / p.quantity)
                                          : '0'}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {showProducts && !showByDates && products.length > 0 && (
                      <ul className={styles.productList}>
                        {products.map(p => (
                          <li key={p.name} className={styles.productItem}>
                            <span className={styles.productName}>{p.name}</span>
                            <span className={styles.productMeta}>
                              <span className={styles.productQty}>
                                {format(p.quantity)}
                              </span>
                              <span className={styles.productAmount}>
                                {format(p.amount)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={onBack} className={styles.button}>
        ← Назад
      </button>
    </div>
  );
}
