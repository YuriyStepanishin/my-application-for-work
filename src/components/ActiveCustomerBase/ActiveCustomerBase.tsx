import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import Loader from '../Loader/Loader';
import SearchInput from '../SearchInput';
import styles from './ActiveCustomerBase.module.css';

type Props = {
  onBack: () => void;
};

type StoreAggregate = {
  store: string;
  sum: number;
};

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

function isSameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
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

export default function ActiveCustomerBase({ onBack }: Props) {
  const [department, setDepartment] = useState('');
  const [agent, setAgent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => normalizeWeekendToFriday(now), [now]);
  const currentWeekday = useMemo(() => getIsoWeekday(today), [today]);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const normalizedSales = useMemo(() => {
    return data
      .map(item => {
        const effectiveDate = getEffectiveDate(item);
        if (!item.торгова_точка || !effectiveDate) return null;

        return {
          ...item,
          effectiveDate,
        };
      })
      .filter(
        (
          item
        ): item is Sale & {
          effectiveDate: Date;
        } => item !== null
      );
  }, [data]);

  const uniqueDepartments = useMemo(
    () =>
      [
        ...new Set(normalizedSales.map(item => item.відділ).filter(Boolean)),
      ].sort(),
    [normalizedSales]
  );

  const uniqueAgents = useMemo(() => {
    return [
      ...new Set(
        normalizedSales
          .filter(item => !department || item.відділ === department)
          .map(item => item.агент)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, 'uk'));
  }, [normalizedSales, department]);

  const filteredSales = useMemo(() => {
    return normalizedSales.filter(item => {
      if (department && item.відділ !== department) return false;
      if (agent && item.агент !== agent) return false;

      return true;
    });
  }, [normalizedSales, department, agent]);

  const stores = useMemo<StoreAggregate[]>(() => {
    const routeTodayStores = new Set<string>();
    const monthSumsByStore = new Map<string, number>();
    const search = searchTerm.trim().toLowerCase();

    filteredSales.forEach(item => {
      if (getIsoWeekday(item.effectiveDate) === currentWeekday) {
        routeTodayStores.add(item.торгова_точка);
      }

      if (isSameMonth(item.effectiveDate, currentYear, currentMonth)) {
        monthSumsByStore.set(
          item.торгова_точка,
          (monthSumsByStore.get(item.торгова_точка) || 0) + (item.сума || 0)
        );
      }
    });

    return Array.from(routeTodayStores)
      .filter(store => !search || store.toLowerCase().includes(search))
      .map(store => ({
        store,
        sum: monthSumsByStore.get(store) || 0,
      }))
      .sort((a, b) => {
        if (b.sum !== a.sum) return b.sum - a.sum;
        return a.store.localeCompare(b.store, 'uk');
      });
  }, [filteredSales, searchTerm, currentWeekday, currentYear, currentMonth]);

  const summary = useMemo(() => {
    let totalSum = 0;
    let greenStores = 0;
    let yellowStores = 0;
    let redStores = 0;

    stores.forEach(store => {
      totalSum += store.sum;

      if (store.sum >= 500) {
        greenStores += 1;
      } else if (store.sum > 0) {
        yellowStores += 1;
      } else {
        redStores += 1;
      }
    });

    return {
      activeStores: stores.length,
      totalSum,
      greenStores,
      yellowStores,
      redStores,
    };
  }, [stores]);

  const formatQty = (value: number) =>
    value.toLocaleString('uk-UA', {
      maximumFractionDigits: 2,
    });

  const getShortageTo500 = (sum: number) => Math.max(0, 500 - sum);

  const getTrafficClass = (sum: number) => {
    if (sum >= 500) return styles.storeCardGreen;
    if (sum > 0) return styles.storeCardYellow;
    return styles.storeCardRed;
  };

  if (isLoading) return <Loader />;
  if (error) return <div className={styles.error}>Помилка</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.pageTitle}>Поточне АКБ</h2>
        <p className={styles.pageMeta}>
          Поточний день: <b>{getDateLabel(today)}</b>
        </p>
      </header>

      <section className={styles.filtersCard}>
        <label className={styles.field}>
          <span>Пошук ТТ</span>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Введіть назву ТТ"
            ariaLabel="Пошук торгової точки"
            className={styles.searchInput}
          />
        </label>

        <label className={styles.field}>
          <span>Відділ</span>
          <select
            value={department}
            onChange={event => {
              setDepartment(event.target.value);
              setAgent('');
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
            onChange={event => setAgent(event.target.value)}
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
        <div className={styles.summaryRow}>
          <div className={styles.summaryMainGroup}>
            <span className={styles.summaryItem}>
              Активні ТТ: <b>{summary.activeStores}</b>
            </span>
            <span className={styles.summaryItem}>
              Сума: <b>{formatQty(summary.totalSum)} грн</b>
            </span>
          </div>

          <div className={styles.summaryTrafficGroup}>
            <span className={styles.summaryItem}>
              🟢: <b>{summary.greenStores}</b> ТТ
            </span>
            <span className={styles.summaryItem}>
              🟡: <b>{summary.yellowStores}</b> ТТ
            </span>
            <span className={styles.summaryItem}>
              🔴: <b>{summary.redStores}</b> ТТ
            </span>
          </div>
        </div>
      </section>

      <section className={styles.routeList}>
        {stores.length === 0 && (
          <p className={styles.emptyCell}>
            Немає ТТ у маршруті на поточний день.
          </p>
        )}

        {stores.map(store => (
          <article
            key={store.store}
            className={`${styles.storeCard} ${getTrafficClass(store.sum)}`}
          >
            <div className={styles.storeHead}>
              <span className={styles.storeName}>{store.store}</span>
              <span className={styles.storeSum}>
                {formatQty(store.sum)} грн
                {store.sum > 0 && store.sum < 500 && (
                  <span className={styles.storeDelta}>
                    {' '}
                    ({formatQty(getShortageTo500(store.sum))} грн)
                  </span>
                )}
              </span>
            </div>
          </article>
        ))}
      </section>

      <button onClick={onBack} className={styles.backButton}>
        ← Назад
      </button>
    </div>
  );
}
