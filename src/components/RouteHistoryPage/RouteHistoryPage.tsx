import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import Loader from '../Loader/Loader';
import styles from './RouteHistoryPage.module.css';

type Props = {
  onBack: () => void;
};

type ProductRow = {
  name: string;
  weeks: number[];
};

type BrandGroup = {
  brand: string;
  products: ProductRow[];
  totals: number[];
  isEmpty: boolean;
};

type StoreHistory = {
  store: string;
  brands: BrandGroup[];
  totals: number[];
  hasHistory: boolean;
};

const REQUIRED_BRANDS = [
  'Greenfield',
  'TESS',
  'Принцеса Нурі',
  'Принцеса Канді',
  'Принцеса Ява',
  'Жокей',
  'JARDIN',
  'PIAZZA',
];

function parseDateObject(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
  if (ymdMatch) {
    const [, yearRaw, monthRaw, dayRaw] = ymdMatch;
    const parsed = new Date(
      Number(yearRaw),
      Number(monthRaw) - 1,
      Number(dayRaw)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dmyMatch = trimmed.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\D|$)/
  );
  if (dmyMatch) {
    const [, dayRaw, monthRaw, yearRaw] = dmyMatch;
    const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
    const parsed = new Date(year, Number(monthRaw) - 1, Number(dayRaw));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function normalizeWeekendToFriday(date: Date): Date {
  const day = date.getDay();

  if (day === 6) return shiftDays(date, -1);
  if (day === 0) return shiftDays(date, -2);

  return date;
}

function getIsoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function getIsoWeekInfo(date: Date): { year: number; week: number } {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return { year: utcDate.getUTCFullYear(), week };
}

function getEffectiveDate(item: Sale): Date | null {
  const parsed = parseDateObject(item.дата);
  if (!parsed) return null;

  const shifted = item.сума < 0 ? parsed : shiftDays(parsed, -1);
  return normalizeWeekendToFriday(shifted);
}

function getDateLabel(date: Date): string {
  const weekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' }).format(
    date
  );
  const shortDate = new Intl.DateTimeFormat('uk-UA').format(date);

  return `${shortDate} (${weekday})`;
}

export default function RouteHistoryPage({ onBack }: Props) {
  const [department, setDepartment] = useState('');
  const [agent, setAgent] = useState('');
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  const uniqueDepartments = useMemo(
    () => [...new Set(data.map(item => item.відділ).filter(Boolean))].sort(),
    [data]
  );

  const uniqueAgents = useMemo(() => {
    return [
      ...new Set(
        data
          .filter(item => !department || item.відділ === department)
          .map(item => item.агент)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, 'uk'));
  }, [data, department]);

  const filtered = useMemo(() => {
    return data.filter(item => {
      if (department && item.відділ !== department) return false;
      if (agent && item.агент !== agent) return false;
      if (!item.торгова_точка) return false;
      return true;
    });
  }, [data, department, agent]);

  const today = useMemo(() => normalizeWeekendToFriday(new Date()), []);
  const currentWeekday = getIsoWeekday(today);

  const weekKeys = useMemo(() => {
    const keys: string[] = [];

    for (let offset = 0; offset <= 4; offset += 1) {
      const date = shiftDays(today, -offset * 7);
      const info = getIsoWeekInfo(date);
      keys.push(`${info.year}-W${String(info.week).padStart(2, '0')}`);
    }

    return keys;
  }, [today]);

  const weekIndexMap = useMemo(() => {
    const indexMap = new Map<string, number>();
    weekKeys.forEach((key, index) => indexMap.set(key, index));
    return indexMap;
  }, [weekKeys]);

  const weekNumbers = useMemo(
    () =>
      weekKeys.map(key => {
        const [, weekPart = ''] = key.split('-W');
        if (!weekPart) return '-';

        const parsed = Number(weekPart);
        return Number.isFinite(parsed) ? String(parsed) : weekPart;
      }),
    [weekKeys]
  );

  const routeStores = useMemo(() => {
    const stores = new Set<string>();

    filtered.forEach(item => {
      const effectiveDate = getEffectiveDate(item);
      if (!effectiveDate) return;

      if (getIsoWeekday(effectiveDate) === currentWeekday) {
        stores.add(item.торгова_точка);
      }
    });

    return Array.from(stores).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [filtered, currentWeekday]);

  const visibleBrands = useMemo(() => {
    const princessBrandsFromData = [
      ...new Set(
        filtered
          .map(item => item.бренд)
          .filter((brand): brand is string =>
            Boolean(brand && brand.startsWith('Принцеса'))
          )
      ),
    ].sort((a, b) => a.localeCompare(b, 'uk'));

    const knownPrincess = new Set(
      REQUIRED_BRANDS.filter(brand => brand.startsWith('Принцеса'))
    );

    const extraPrincessBrands = princessBrandsFromData.filter(
      brand => !knownPrincess.has(brand)
    );

    return [
      'Greenfield',
      'TESS',
      ...REQUIRED_BRANDS.filter(brand => brand.startsWith('Принцеса')),
      ...extraPrincessBrands,
      'Жокей',
      'JARDIN',
      'PIAZZA',
    ];
  }, [filtered]);

  const storeHistory = useMemo<StoreHistory[]>(() => {
    const storesSet = new Set(routeStores);

    const historyByStore = new Map<
      string,
      Map<string, Map<string, number[]>>
    >();

    filtered.forEach(item => {
      if (!storesSet.has(item.торгова_точка)) return;

      const effectiveDate = getEffectiveDate(item);
      if (!effectiveDate) return;
      if (getIsoWeekday(effectiveDate) !== currentWeekday) return;

      const weekInfo = getIsoWeekInfo(effectiveDate);
      const weekKey = `${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}`;
      const weekIndex = weekIndexMap.get(weekKey);

      if (weekIndex === undefined) return;

      if (!historyByStore.has(item.торгова_точка)) {
        historyByStore.set(item.торгова_точка, new Map());
      }

      const byBrand = historyByStore.get(item.торгова_точка);
      if (!byBrand) return;

      const brand = item.бренд || 'Без ТМ';
      const product = item.товар || 'Без назви';

      if (!byBrand.has(brand)) byBrand.set(brand, new Map());
      const byProduct = byBrand.get(brand);
      if (!byProduct) return;

      if (!byProduct.has(product)) byProduct.set(product, [0, 0, 0, 0, 0]);
      const bucket = byProduct.get(product);
      if (!bucket) return;

      bucket[weekIndex] += item.кількість || 0;
    });

    return routeStores.map(store => {
      const byBrand: Map<string, Map<string, number[]>> = historyByStore.get(
        store
      ) ?? new Map<string, Map<string, number[]>>();

      const brands: BrandGroup[] = visibleBrands.map(brand => {
        const byProduct = byBrand.get(brand) ?? new Map<string, number[]>();

        const products: ProductRow[] = Array.from(byProduct.entries())
          .map(([name, weeks]: [string, number[]]) => ({
            name,
            weeks,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

        const totals = [0, 0, 0, 0, 0];
        products.forEach(product => {
          product.weeks.forEach((value: number, idx: number) => {
            totals[idx] += value;
          });
        });

        const isEmpty = totals.every(value => value === 0);

        return {
          brand,
          products,
          totals,
          isEmpty,
        };
      });

      const totals = [0, 0, 0, 0, 0];
      brands.forEach(brand => {
        brand.totals.forEach((value, idx) => {
          totals[idx] += value;
        });
      });

      return {
        store,
        brands,
        totals,
        hasHistory: totals.some(value => value !== 0),
      };
    });
  }, [filtered, routeStores, currentWeekday, weekIndexMap, visibleBrands]);

  const summary = useMemo(() => {
    const withoutHistory = storeHistory.filter(item => !item.hasHistory).length;
    return {
      allStores: storeHistory.length,
      withoutHistory,
    };
  }, [storeHistory]);

  const formatQty = (value: number) =>
    value.toLocaleString('uk-UA', {
      maximumFractionDigits: 2,
    });

  const formatHistoryCell = (value: number) =>
    value === 0 ? '-' : formatQty(value);

  if (isLoading) return <Loader />;
  if (error) return <div className={styles.error}>Помилка</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.pageTitle}>Маршрут/історія продажів</h2>
        <p className={styles.pageMeta}>
          Поточна дата/день тижня: <b>{getDateLabel(today)}</b>
        </p>
      </header>

      <section className={styles.filtersCard}>
        <label className={styles.field}>
          <span>Відділ</span>
          <select
            value={department}
            onChange={event => {
              setDepartment(event.target.value);
              setAgent('');
              setExpandedStore(null);
            }}
          >
            <option value="">Усі відділи</option>
            {uniqueDepartments.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Торговий представник</span>
          <select
            value={agent}
            onChange={event => {
              setAgent(event.target.value);
              setExpandedStore(null);
            }}
          >
            <option value="">Усі ТП</option>
            {uniqueAgents.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.summaryCard}>
        <p>
          ТТ у маршруті (з усіх даних): <b>{summary.allStores}</b>
        </p>
        <p>
          Без відвантажень за останні 5 тижнів: <b>{summary.withoutHistory}</b>
        </p>
      </section>

      <section className={styles.routeList}>
        {storeHistory.map(store => {
          const isOpen = expandedStore === store.store;
          const nextExpanded = isOpen ? null : store.store;

          return (
            <article
              key={store.store}
              className={`${styles.storeCard} ${!store.hasHistory ? styles.storeCardAlert : ''}`}
            >
              <button
                type="button"
                className={styles.storeHead}
                onClick={() => setExpandedStore(nextExpanded)}
              >
                <span className={styles.storeName}>{store.store}</span>
                {!store.hasHistory && (
                  <span className={styles.alertChip}>
                    Немає відвантажень 5 тижнів
                  </span>
                )}
                <span className={styles.expandIcon}>{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className={styles.historyWrap}>
                  <div className={styles.desktopHistory}>
                    <table className={styles.historyTable}>
                      <thead>
                        <tr>
                          <th>Товар</th>
                          {weekNumbers.map((weekNumber, index) => (
                            <th key={`${store.store}-week-${index}`}>
                              {weekNumber}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {store.brands.length === 0 && (
                          <tr>
                            <td colSpan={6} className={styles.emptyCell}>
                              За останні 5 тижнів немає даних.
                            </td>
                          </tr>
                        )}

                        {store.brands.map(brand => (
                          <Fragment key={`${store.store}-${brand.brand}`}>
                            {brand.isEmpty ? (
                              <tr className={styles.brandOnlyRowAlert}>
                                <td colSpan={6}>
                                  <b>{brand.brand}</b>
                                </td>
                              </tr>
                            ) : (
                              <tr className={styles.brandRow}>
                                <td>
                                  <b>{brand.brand}</b>
                                </td>
                                {brand.totals.map((value, index) => (
                                  <td
                                    key={`${store.store}-${brand.brand}-total-${index}`}
                                  >
                                    <b>{formatHistoryCell(value)}</b>
                                  </td>
                                ))}
                              </tr>
                            )}

                            {brand.products.map(product => (
                              <tr
                                key={`${store.store}-${brand.brand}-${product.name}`}
                              >
                                <td>{product.name}</td>
                                {product.weeks.map((value, index) => (
                                  <td
                                    key={`${store.store}-${brand.brand}-${product.name}-${index}`}
                                  >
                                    {formatHistoryCell(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.mobileHistory}>
                    {store.brands.length === 0 && (
                      <p className={styles.emptyCell}>
                        За останні 5 тижнів немає даних.
                      </p>
                    )}

                    {store.brands.map(brand => (
                      <section
                        key={`${store.store}-${brand.brand}-mobile`}
                        className={styles.mobileBrandBlock}
                      >
                        <h4
                          className={`${styles.mobileBrandTitle} ${brand.isEmpty ? styles.mobileBrandTitleAlert : ''}`}
                        >
                          {brand.brand}
                        </h4>

                        {!brand.isEmpty && (
                          <>
                            <div className={styles.mobileHeaderRow}>
                              <span>Товар</span>
                              <span>{weekNumbers.join('/')}</span>
                            </div>

                            <div className={styles.mobileProductRow}>
                              <p className={styles.mobileProductName}>
                                Разом по ТМ
                              </p>
                              <p className={styles.mobileWeeksLine}>
                                {brand.totals
                                  .map(value => formatHistoryCell(value))
                                  .join('/')}
                              </p>
                            </div>

                            {brand.products.map(product => (
                              <div
                                key={`${store.store}-${brand.brand}-${product.name}-mobile`}
                                className={styles.mobileProductRow}
                              >
                                <p className={styles.mobileProductName}>
                                  {product.name}
                                </p>
                                <p className={styles.mobileWeeksLine}>
                                  {product.weeks
                                    .map(value => formatHistoryCell(value ?? 0))
                                    .join('/')}
                                </p>
                              </div>
                            ))}
                          </>
                        )}
                      </section>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <button onClick={onBack} className={styles.backButton}>
        ← Назад
      </button>
    </div>
  );
}
