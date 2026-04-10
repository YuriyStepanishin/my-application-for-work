import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import Loader from '../Loader/Loader';
import styles from './ImplementationPage.module.css';

// ─── ПЛАНИ ──────────────────────────────────────────────────────────────────

type AgentPlan = {
  /** план ВКБ СВ/АКБ ТП — кількість ТТ ≥500 грн */
  vkb: number;
  /** план ТМ Жокей — кількість ТТ з Жокеєм (ТП від 0 грн) */
  jockey: number;
};

const AGENT_PLANS: Record<string, AgentPlan> = {
  'Гриник Ольга': { vkb: 65, jockey: 50 },
  'Довга Діана': { vkb: 85, jockey: 50 },
  'Лаптєва Руслана': { vkb: 90, jockey: 55 },
  'Могильна Оксана': { vkb: 75, jockey: 55 },
  'Сторожук Аліна': { vkb: 85, jockey: 60 },
  'Ящишина Наталія': { vkb: 80, jockey: 55 },
  'Кучер Аня': { vkb: 65, jockey: 60 },
  'Мартинчик Альона': { vkb: 75, jockey: 60 },
  'Нагорняк Світлана': { vkb: 80, jockey: 65 },
  'Дюг Тетяна': { vkb: 60, jockey: 60 },
  'Івасишин Денис': { vkb: 65, jockey: 50 },
  'Олійник Влад': { vkb: 55, jockey: 50 },
};

// Порядок відділів і агентів у таблиці
const DEPARTMENT_ORDER: {
  dept: string;
  label: string;
  agents: string[];
}[] = [
  {
    dept: 'Місто+Область (Центр)',
    label: 'Місто+Область (Центр)',
    agents: [
      'Гриник Ольга',
      'Довга Діана',
      'Лаптєва Руслана',
      'Могильна Оксана',
      'Сторожук Аліна',
      'Ящишина Наталія',
    ],
  },
  {
    dept: 'Шепетівський відділ',
    label: 'Шепетівський відділ',
    agents: ['Кучер Аня', 'Мартинчик Альона', 'Нагорняк Світлана'],
  },
  {
    dept: "Кам'янець-Подільський відділ",
    label: "Кам'янець-Подільський відділ",
    agents: ['Дюг Тетяна', 'Івасишин Денис', 'Олійник Влад'],
  },
];

// ─── УТИЛІТИ ────────────────────────────────────────────────────────────────

function getCurrentMonthKey(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${m}`;
}

function parseDateMonth(raw: string): string | null {
  if (!raw) return null;
  const dmy = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}`;
  const iso = raw.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return null;
}

function parseDateISO(raw: string): string | null {
  if (!raw) return null;
  const dmy = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return null;
}

function formatKyivDateTime(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function pct(fact: number, plan: number): string {
  if (plan === 0) return '—';
  return ((fact / plan) * 100).toFixed(1) + '%';
}

function fmt(n: number): string {
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(n);
}

// ─── РОЗРАХУНОК ─────────────────────────────────────────────────────────────

type AgentStats = {
  factGrn: number;
  /** ТТ із загальною сумою ≥500 грн (для VKB) */
  vkbFact: number;
  /** ТТ де є Жокей (сума > 0) */
  jockeyFact: number;
};

function calcStats(sales: Sale[]): Record<string, AgentStats> {
  const byAgent: Record<
    string,
    {
      factGrn: number;
      storeSum: Record<string, number>;
      jockeyStores: Set<string>;
    }
  > = {};

  for (const s of sales) {
    if (!s.агент) continue;
    if (!byAgent[s.агент]) {
      byAgent[s.агент] = { factGrn: 0, storeSum: {}, jockeyStores: new Set() };
    }
    const a = byAgent[s.агент];
    a.factGrn += s.сума || 0;

    if (s.торгова_точка) {
      a.storeSum[s.торгова_точка] =
        (a.storeSum[s.торгова_точка] || 0) + (s.сума || 0);

      if (s.бренд === 'Жокей' && (s.сума || 0) > 0) {
        a.jockeyStores.add(s.торгова_точка);
      }
    }
  }

  const result: Record<string, AgentStats> = {};
  for (const [agent, data] of Object.entries(byAgent)) {
    result[agent] = {
      factGrn: data.factGrn,
      vkbFact: Object.values(data.storeSum).filter(v => v >= 500).length,
      jockeyFact: data.jockeyStores.size,
    };
  }
  return result;
}

// ─── КОМПОНЕНТ ──────────────────────────────────────────────────────────────

export default function ImplementationPage({ onBack }: { onBack: () => void }) {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  const currentMonth = useMemo(() => getCurrentMonthKey(), []);

  const currentMonthSales = useMemo(
    () => data.filter(s => parseDateMonth(s.дата) === currentMonth),
    [data, currentMonth]
  );

  const stats = useMemo(
    () => calcStats(currentMonthSales),
    [currentMonthSales]
  );

  const lastUpdated = useMemo(() => {
    let maxDate = '';
    for (const s of currentMonthSales) {
      const iso = parseDateISO(s.дата);
      if (iso && iso > maxDate) maxDate = iso;
    }
    return maxDate ? formatKyivDateTime(maxDate) : null;
  }, [currentMonthSales]);

  if (isLoading) return <Loader />;
  if (error) return <div className={styles.error}>Помилка завантаження</div>;

  // Будуємо рядки таблиці
  type Row =
    | {
        type: 'dept';
        label: string;
        factGrn: number;
        vkbPlan: number;
        vkbFact: number;
        jockeyPlan: number;
        jockeyFact: number;
      }
    | {
        type: 'agent';
        label: string;
        factGrn: number;
        vkbPlan: number;
        vkbFact: number;
        jockeyPlan: number;
        jockeyFact: number;
      };

  const rows: Row[] = [];

  let totalFactGrn = 0;
  let totalVkbPlan = 0;
  let totalVkbFact = 0;
  let totalJockeyPlan = 0;
  let totalJockeyFact = 0;

  for (const dept of DEPARTMENT_ORDER) {
    let dFactGrn = 0,
      dVkbPlan = 0,
      dVkbFact = 0,
      dJockeyPlan = 0,
      dJockeyFact = 0;

    const agentRows: Row[] = [];

    for (const agent of dept.agents) {
      const s = stats[agent] ?? { factGrn: 0, vkbFact: 0, jockeyFact: 0 };
      const plan = AGENT_PLANS[agent] ?? { vkb: 0, jockey: 0 };

      dFactGrn += s.factGrn;
      dVkbPlan += plan.vkb;
      dVkbFact += s.vkbFact;
      dJockeyPlan += plan.jockey;
      dJockeyFact += s.jockeyFact;

      agentRows.push({
        type: 'agent',
        label: agent,
        factGrn: s.factGrn,
        vkbPlan: plan.vkb,
        vkbFact: s.vkbFact,
        jockeyPlan: plan.jockey,
        jockeyFact: s.jockeyFact,
      });
    }

    rows.push({
      type: 'dept',
      label: dept.label,
      factGrn: dFactGrn,
      vkbPlan: dVkbPlan,
      vkbFact: dVkbFact,
      jockeyPlan: dJockeyPlan,
      jockeyFact: dJockeyFact,
    });

    rows.push(...agentRows);

    totalFactGrn += dFactGrn;
    totalVkbPlan += dVkbPlan;
    totalVkbFact += dVkbFact;
    totalJockeyPlan += dJockeyPlan;
    totalJockeyFact += dJockeyFact;
  }

  const monthLabel = new Date().toLocaleString('uk-UA', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Виконання показників</h2>
        <span className={styles.monthBadge}>{monthLabel}</span>
      </div>

      {lastUpdated && (
        <p className={styles.updatedAt}>
          Дані оновлено: <strong>{lastUpdated}</strong>
        </p>
      )}

      {/* ── DESKTOP: одна широка таблиця ── */}
      <div className={`${styles.tableWrapper} ${styles.desktopOnly}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colDept} rowSpan={2}>
                Відділ / ТП
              </th>
              <th className={styles.colFact} rowSpan={2}>
                Факт ГРН
              </th>
              <th className={styles.colGroup} colSpan={3}>
                ВКБ СВ / АКБ ТП
              </th>
              <th className={styles.colGroup} colSpan={3}>
                Задача ТМ Жокей
              </th>
            </tr>
            <tr>
              <th className={styles.colSub}>ПЛАН</th>
              <th className={styles.colSub}>ФАКТ</th>
              <th className={styles.colSub}>%%</th>
              <th className={styles.colSub}>ПЛАН</th>
              <th className={styles.colSub}>ФАКТ</th>
              <th className={styles.colSub}>%%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isDept = row.type === 'dept';
              return (
                <tr
                  key={i}
                  className={isDept ? styles.deptRow : styles.agentRow}
                >
                  <td className={styles.nameCell}>{row.label}</td>
                  <td className={styles.numCell}>{fmt(row.factGrn)}</td>
                  <td className={styles.numCell}>{row.vkbPlan}</td>
                  <td className={styles.numCell}>{row.vkbFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.vkbFact, row.vkbPlan, styles)}`}
                  >
                    {pct(row.vkbFact, row.vkbPlan)}
                  </td>
                  <td className={styles.numCell}>{row.jockeyPlan}</td>
                  <td className={styles.numCell}>{row.jockeyFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.jockeyFact, row.jockeyPlan, styles)}`}
                  >
                    {pct(row.jockeyFact, row.jockeyPlan)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td className={styles.nameCell}>Загальний підсумок</td>
              <td className={styles.numCell}>{fmt(totalFactGrn)}</td>
              <td className={styles.numCell}>{totalVkbPlan}</td>
              <td className={styles.numCell}>{totalVkbFact}</td>
              <td
                className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalVkbFact, totalVkbPlan, styles)}`}
              >
                {pct(totalVkbFact, totalVkbPlan)}
              </td>
              <td className={styles.numCell}>{totalJockeyPlan}</td>
              <td className={styles.numCell}>{totalJockeyFact}</td>
              <td
                className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalJockeyFact, totalJockeyPlan, styles)}`}
              >
                {pct(totalJockeyFact, totalJockeyPlan)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── MOBILE: три окремі таблиці ── */}
      <div className={styles.mobileOnly}>
        {/* Таблиця 1: Факт ГРН */}
        <p className={styles.mobileTableTitle}>Факт ГРН</p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colDept}>Відділ / ТП</th>
                <th className={styles.colFact}>Факт ГРН</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={
                    row.type === 'dept' ? styles.deptRow : styles.agentRow
                  }
                >
                  <td className={styles.nameCell}>{row.label}</td>
                  <td className={styles.numCell}>{fmt(row.factGrn)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок</td>
                <td className={styles.numCell}>{fmt(totalFactGrn)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Таблиця 2: ВКБ СВ / АКБ ТП */}
        <p className={styles.mobileTableTitle}>ВКБ СВ / АКБ ТП</p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colDept}>Відділ / ТП</th>
                <th className={styles.colSub}>ПЛАН</th>
                <th className={styles.colSub}>ФАКТ</th>
                <th className={styles.colSub}>%%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={
                    row.type === 'dept' ? styles.deptRow : styles.agentRow
                  }
                >
                  <td className={styles.nameCell}>{row.label}</td>
                  <td className={styles.numCell}>{row.vkbPlan}</td>
                  <td className={styles.numCell}>{row.vkbFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.vkbFact, row.vkbPlan, styles)}`}
                  >
                    {pct(row.vkbFact, row.vkbPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок</td>
                <td className={styles.numCell}>{totalVkbPlan}</td>
                <td className={styles.numCell}>{totalVkbFact}</td>
                <td
                  className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalVkbFact, totalVkbPlan, styles)}`}
                >
                  {pct(totalVkbFact, totalVkbPlan)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Таблиця 3: Задача ТМ Жокей */}
        <p className={styles.mobileTableTitle}>Задача ТМ Жокей</p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colDept}>Відділ / ТП</th>
                <th className={styles.colSub}>ПЛАН</th>
                <th className={styles.colSub}>ФАКТ</th>
                <th className={styles.colSub}>%%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={
                    row.type === 'dept' ? styles.deptRow : styles.agentRow
                  }
                >
                  <td className={styles.nameCell}>{row.label}</td>
                  <td className={styles.numCell}>{row.jockeyPlan}</td>
                  <td className={styles.numCell}>{row.jockeyFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.jockeyFact, row.jockeyPlan, styles)}`}
                  >
                    {pct(row.jockeyFact, row.jockeyPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок</td>
                <td className={styles.numCell}>{totalJockeyPlan}</td>
                <td className={styles.numCell}>{totalJockeyFact}</td>
                <td
                  className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalJockeyFact, totalJockeyPlan, styles)}`}
                >
                  {pct(totalJockeyFact, totalJockeyPlan)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <button className={styles.backBtn} onClick={onBack}>
        ← Назад
      </button>
    </div>
  );
}

function getPctClass(
  fact: number,
  plan: number,
  styles: Record<string, string>
): string {
  if (plan === 0) return '';
  const ratio = fact / plan;
  if (ratio >= 1) return styles.pctGood;
  if (ratio >= 0.75) return styles.pctMid;
  return styles.pctBad;
}
