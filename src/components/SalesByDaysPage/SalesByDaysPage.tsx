import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import Loader from '../Loader/Loader';
import SalesFilter from '../SalesFilter/SalesFilter';
import styles from './SalesByDaysPage.module.css';

type DayStats = {
  dateLabel: string;
  dateDisplay: string;
  dateSortValue: number;
  weekKey: string;
  weekLabel: string;
  weekSortValue: number;
  weekdayOrder: number;
  amount: number;
  weight: number;
  storesCount: number;
  tt500: number;
};

type Totals = {
  storesCount: number;
  tt500: number;
  weight: number;
  amount: number;
};

type ChartMetric = 'amount' | 'stores';

type WeekChartStats = {
  weekKey: string;
  weekLabel: string;
  weekSortValue: number;
  amount: number;
  storesCount: number;
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

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function formatDateWithWeekday(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const weekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' })
    .format(date)
    .toUpperCase();

  return `${day}/${month}/${year} - ${weekday}`;
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

function getWeekdayOrder(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export default function SalesByDaysPage({ onBack }: { onBack: () => void }) {
  const [agent, setAgent] = useState('');
  const [department, setDepartment] = useState('');
  const [brand, setBrand] = useState('');

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  const filteredByDepartmentAgent = useMemo(() => {
    return data.filter(i => {
      if (department && i.відділ !== department) return false;
      if (agent && i.агент !== agent) return false;
      return true;
    });
  }, [data, agent, department]);

  const filtered = useMemo(() => {
    if (!brand) return filteredByDepartmentAgent;

    return filteredByDepartmentAgent.filter(i => i.бренд === brand);
  }, [filteredByDepartmentAgent, brand]);

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

  const uniqueBrands = useMemo(() => {
    return [
      ...new Set(
        filteredByDepartmentAgent.map(item => item.бренд).filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, 'uk'));
  }, [filteredByDepartmentAgent]);

  const rows = useMemo<DayStats[]>(() => {
    const grouped: Record<
      string,
      {
        amount: number;
        weight: number;
        storeMap: Record<string, number>;
      }
    > = {};

    filtered.forEach(item => {
      const dateKey = item.дата || 'Без дати';

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          amount: 0,
          weight: 0,
          storeMap: {},
        };
      }

      const current = grouped[dateKey];
      current.amount += item.сума || 0;
      current.weight += (item.кількість || 0) * (item.вага || 0);

      if (item.торгова_точка) {
        current.storeMap[item.торгова_точка] =
          (current.storeMap[item.торгова_точка] || 0) + (item.сума || 0);
      }
    });

    return Object.entries(grouped)
      .map(([dateLabel, value]) => {
        const stores = Object.keys(value.storeMap).length;
        const tt500 = Object.values(value.storeMap).filter(
          sum => sum >= 500
        ).length;
        const parsedDate = parseDateObject(dateLabel);
        const adjustedDate = parsedDate
          ? value.amount < 0
            ? parsedDate
            : shiftDays(parsedDate, -1)
          : null;
        const weekInfo = adjustedDate ? getIsoWeekInfo(adjustedDate) : null;

        return {
          dateLabel,
          dateDisplay: adjustedDate
            ? formatDateWithWeekday(adjustedDate)
            : dateLabel,
          dateSortValue: adjustedDate ? adjustedDate.getTime() : 0,
          weekKey: weekInfo
            ? `${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}`
            : 'unknown-week',
          weekLabel: weekInfo
            ? `Тиждень ${String(weekInfo.week).padStart(2, '0')}`
            : 'Без дати',
          weekSortValue: weekInfo ? weekInfo.year * 100 + weekInfo.week : 0,
          weekdayOrder: adjustedDate ? getWeekdayOrder(adjustedDate) : 99,
          amount: value.amount,
          weight: value.weight,
          storesCount: stores,
          tt500,
        };
      })
      .sort((a, b) => {
        if (a.weekSortValue !== b.weekSortValue) {
          return b.weekSortValue - a.weekSortValue;
        }

        if (a.weekdayOrder !== b.weekdayOrder) {
          return a.weekdayOrder - b.weekdayOrder;
        }

        return b.dateSortValue - a.dateSortValue;
      });
  }, [filtered]);

  const format = (n: number) =>
    n.toLocaleString('uk-UA', {
      maximumFractionDigits: 2,
    });

  const weeklyTotals = useMemo(() => {
    const map = new Map<string, { label: string; totals: Totals }>();

    rows.forEach(row => {
      if (!map.has(row.weekKey)) {
        map.set(row.weekKey, {
          label: row.weekLabel,
          totals: {
            storesCount: 0,
            tt500: 0,
            weight: 0,
            amount: 0,
          },
        });
      }

      const week = map.get(row.weekKey);
      if (!week) return;

      week.totals.storesCount += row.storesCount;
      week.totals.tt500 += row.tt500;
      week.totals.weight += row.weight;
      week.totals.amount += row.amount;
    });

    return map;
  }, [rows]);

  const grandTotal = useMemo<Totals>(() => {
    return rows.reduce(
      (acc, row) => {
        acc.storesCount += row.storesCount;
        acc.tt500 += row.tt500;
        acc.weight += row.weight;
        acc.amount += row.amount;
        return acc;
      },
      {
        storesCount: 0,
        tt500: 0,
        weight: 0,
        amount: 0,
      }
    );
  }, [rows]);

  const chartRows = useMemo(() => {
    return [...rows].sort((a, b) => a.dateSortValue - b.dateSortValue);
  }, [rows]);

  const chartLimits = useMemo(() => {
    return chartRows.reduce(
      (acc, row) => {
        acc.maxAmountAbs = Math.max(acc.maxAmountAbs, Math.abs(row.amount));
        acc.maxStores = Math.max(acc.maxStores, row.storesCount);
        return acc;
      },
      {
        maxAmountAbs: 0,
        maxStores: 0,
      }
    );
  }, [chartRows]);

  const weekChartRows = useMemo<WeekChartStats[]>(() => {
    const map = new Map<string, WeekChartStats>();

    rows.forEach(row => {
      if (!map.has(row.weekKey)) {
        map.set(row.weekKey, {
          weekKey: row.weekKey,
          weekLabel: row.weekLabel,
          weekSortValue: row.weekSortValue,
          amount: 0,
          storesCount: 0,
        });
      }

      const week = map.get(row.weekKey);
      if (!week) return;

      week.amount += row.amount;
      week.storesCount += row.storesCount;
    });

    return Array.from(map.values()).sort(
      (a, b) => a.weekSortValue - b.weekSortValue
    );
  }, [rows]);

  const weekChartLimits = useMemo(() => {
    return weekChartRows.reduce(
      (acc, row) => {
        acc.maxAmountAbs = Math.max(acc.maxAmountAbs, Math.abs(row.amount));
        acc.maxStores = Math.max(acc.maxStores, row.storesCount);
        return acc;
      },
      {
        maxAmountAbs: 0,
        maxStores: 0,
      }
    );
  }, [weekChartRows]);

  const getChartPercent = (row: DayStats, metric: ChartMetric) => {
    if (metric === 'amount') {
      if (chartLimits.maxAmountAbs === 0) return 0;
      return (Math.abs(row.amount) / chartLimits.maxAmountAbs) * 100;
    }

    if (chartLimits.maxStores === 0) return 0;
    return (row.storesCount / chartLimits.maxStores) * 100;
  };

  const getWeekChartPercent = (row: WeekChartStats, metric: ChartMetric) => {
    if (metric === 'amount') {
      if (weekChartLimits.maxAmountAbs === 0) return 0;
      return (Math.abs(row.amount) / weekChartLimits.maxAmountAbs) * 100;
    }

    if (weekChartLimits.maxStores === 0) return 0;
    return (row.storesCount / weekChartLimits.maxStores) * 100;
  };

  const chartMetrics: Array<{ key: ChartMetric; title: string }> = [
    { key: 'amount', title: 'Сума по днях' },
    { key: 'stores', title: 'ТТ по днях' },
  ];

  if (isLoading) return <Loader />;
  if (error) return <div className={styles.error}>Помилка</div>;

  return (
    <div className={styles.container}>
      <SalesFilter
        departments={uniqueDepartments}
        agents={uniqueAgents}
        department={department}
        agent={agent}
        onChangeDepartment={setDepartment}
        onChangeAgent={setAgent}
      />

      <div className={styles.brandFilters}>
        <button
          className={`${styles.brandButton} ${brand === '' ? styles.brandButtonActive : ''}`}
          onClick={() => setBrand('')}
        >
          Усі ТМ
        </button>

        {uniqueBrands.map(tm => (
          <button
            key={tm}
            className={`${styles.brandButton} ${brand === tm ? styles.brandButtonActive : ''}`}
            onClick={() => setBrand(tm)}
          >
            {tm}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        <h3 className={styles.title}>Продажі по днях</h3>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>ТТ</th>
                <th>ТТ 500+</th>
                <th>Вага</th>
                <th>Сума</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.grandTotalRow}>
                <td>
                  <b>Загалом</b>
                </td>
                <td>
                  <b>{grandTotal.storesCount}</b>
                </td>
                <td>
                  <b>{grandTotal.tt500}</b>
                </td>
                <td>
                  <b>{format(grandTotal.weight)}</b>
                </td>
                <td>
                  <b>{format(grandTotal.amount)}</b>
                </td>
              </tr>

              {rows.map((row, index) => {
                const nextRow = rows[index + 1];
                const isWeekEnd = !nextRow || nextRow.weekKey !== row.weekKey;
                const weekData = weeklyTotals.get(row.weekKey);

                return (
                  <Fragment key={row.dateLabel}>
                    <tr>
                      <td>{row.dateDisplay}</td>
                      <td>{row.storesCount}</td>
                      <td>{row.tt500}</td>
                      <td>{format(row.weight)}</td>
                      <td>{format(row.amount)}</td>
                    </tr>

                    {isWeekEnd && weekData && (
                      <tr className={styles.weekTotalRow}>
                        <td>
                          <b>Разом за {weekData.label}</b>
                        </td>
                        <td>
                          <b>{weekData.totals.storesCount}</b>
                        </td>
                        <td>
                          <b>{weekData.totals.tt500}</b>
                        </td>
                        <td>
                          <b>{format(weekData.totals.weight)}</b>
                        </td>
                        <td>
                          <b>{format(weekData.totals.amount)}</b>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.chartsSection}>
        <h3 className={styles.title}>Графіки за фільтром</h3>

        <div className={styles.chartsGrid}>
          {chartMetrics.map(metric => (
            <article key={metric.key} className={styles.chartCard}>
              <h4 className={styles.chartTitle}>{metric.title}</h4>

              <div className={styles.chartBody}>
                {chartRows.map(row => {
                  const pct = getChartPercent(row, metric.key);
                  const safePct = pct > 0 ? Math.max(pct, 4) : 0;
                  const dayLabel =
                    row.dateDisplay.split(' - ')[0] ?? row.dateDisplay;

                  return (
                    <div
                      key={`${metric.key}-${row.dateLabel}`}
                      className={styles.chartRow}
                    >
                      <span className={styles.chartDate}>{dayLabel}</span>

                      <div className={styles.chartTrack}>
                        <div
                          className={`${styles.chartBar} ${metric.key === 'amount' && row.amount < 0 ? styles.chartBarNegative : ''}`}
                          style={{ width: `${safePct}%` }}
                        />
                      </div>

                      <span className={styles.chartValue}>
                        {metric.key === 'amount' && format(row.amount)}
                        {metric.key === 'stores' && row.storesCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        <div className={styles.chartsGrid}>
          {chartMetrics.map(metric => (
            <article key={`week-${metric.key}`} className={styles.chartCard}>
              <h4 className={styles.chartTitle}>
                {metric.key === 'amount' ? 'Сума по тижнях' : 'ТТ по тижнях'}
              </h4>

              <div className={styles.chartBody}>
                {weekChartRows.map(row => {
                  const pct = getWeekChartPercent(row, metric.key);
                  const safePct = pct > 0 ? Math.max(pct, 4) : 0;

                  return (
                    <div
                      key={`${metric.key}-${row.weekKey}`}
                      className={styles.chartRow}
                    >
                      <span className={styles.chartDate}>{row.weekLabel}</span>

                      <div className={styles.chartTrack}>
                        <div
                          className={`${styles.chartBar} ${metric.key === 'amount' && row.amount < 0 ? styles.chartBarNegative : ''}`}
                          style={{ width: `${safePct}%` }}
                        />
                      </div>

                      <span className={styles.chartValue}>
                        {metric.key === 'amount' && format(row.amount)}
                        {metric.key === 'stores' && row.storesCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <button onClick={onBack} className={styles.backButton}>
        ← Назад
      </button>
    </div>
  );
}
