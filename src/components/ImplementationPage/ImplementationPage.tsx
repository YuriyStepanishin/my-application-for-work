import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import Loader from '../Loader/Loader';
import {
  getCurrentAuthorizedEmail,
  getUserDepartment,
  getUserRepresentative,
  getUserRole,
} from '../../config/userRoles';
import styles from './ImplementationPage.module.css';

// ─── ПЛАНИ ──────────────────────────────────────────────────────────────────

type AgentPlan = {
  /** план АКБ — кількість ТТ ≥500 грн */
  akb: number;
  /** план ВКБ Жокей — кількість ТТ з Жокеєм ≥0 грн */
  vkbJockey: number;
};

type AgentDeliciaPlan = {
  /** план Деліція в грн */
  deliciaVkbGrn: number;
  /** план ВКБ Деліція в ТТ (від 0 грн) */
  deliciaVkbStores: number;
};

const AGENT_PLANS: Record<string, AgentPlan> = {
  'Гриник Ольга': { akb: 65, vkbJockey: 50 },
  'Довга Діана': { akb: 85, vkbJockey: 50 },
  'Лаптєва Руслана': { akb: 90, vkbJockey: 55 },
  'Могильна Оксана': { akb: 75, vkbJockey: 55 },
  'Сторожук Аліна': { akb: 85, vkbJockey: 60 },
  'Ящишина Наталія': { akb: 80, vkbJockey: 55 },
  'Кучер Аня': { akb: 65, vkbJockey: 60 },
  'Мартинчик Альона': { akb: 75, vkbJockey: 60 },
  'Нагорняк Світлана': { akb: 80, vkbJockey: 65 },
  'Дюг Тетяна': { akb: 60, vkbJockey: 60 },
  'Івасишин Денис': { akb: 65, vkbJockey: 50 },
  'Олійник Влад': { akb: 55, vkbJockey: 50 },
};

const AGENT_DELICIA_PLANS: Record<string, AgentDeliciaPlan> = {
  'Гриник Ольга': { deliciaVkbGrn: 98000, deliciaVkbStores: 98 },
  'Довга Діана': { deliciaVkbGrn: 100000, deliciaVkbStores: 100 },
  'Лаптєва Руслана': { deliciaVkbGrn: 90000, deliciaVkbStores: 90 },
  'Могильна Оксана': { deliciaVkbGrn: 98000, deliciaVkbStores: 98 },
  'Сторожук Аліна': { deliciaVkbGrn: 100000, deliciaVkbStores: 100 },
  'Ящишина Наталія': { deliciaVkbGrn: 110000, deliciaVkbStores: 110 },
  'Кучер Аня': { deliciaVkbGrn: 100000, deliciaVkbStores: 100 },
  'Мартинчик Альона': { deliciaVkbGrn: 90000, deliciaVkbStores: 90 },
  'Нагорняк Світлана': { deliciaVkbGrn: 100000, deliciaVkbStores: 100 },
  'Дюг Тетяна': { deliciaVkbGrn: 108000, deliciaVkbStores: 108 },
  'Івасишин Денис': { deliciaVkbGrn: 108000, deliciaVkbStores: 108 },
  'Олійник Влад': { deliciaVkbGrn: 108000, deliciaVkbStores: 108 },
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

const DEPARTMENT_PLANS: Record<string, { vkb: number; akbJockey: number }> = {
  'Місто+Область (Центр)': { vkb: 680, akbJockey: 250 },
  'Шепетівський відділ': { vkb: 380, akbJockey: 140 },
  "Кам'янець-Подільський відділ": { vkb: 380, akbJockey: 120 },
};

function normalizeText(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

function getRenderableDepartmentsByScope() {
  const authEmail = getCurrentAuthorizedEmail();
  const role = getUserRole(authEmail);
  const department = getUserDepartment(authEmail);

  if (role === 'agent') {
    const representative = getUserRepresentative(authEmail);
    if (!department || !representative) return DEPARTMENT_ORDER;
    const allowed = department.split(',').map(part => normalizeText(part));
    const deptEntry = DEPARTMENT_ORDER.find(item => {
      const itemDept = normalizeText(item.dept);
      if (itemDept.includes('місто+область (центр)')) {
        return (
          allowed.some(value => value.includes('місто')) ||
          allowed.some(value => value.includes('область'))
        );
      }
      return allowed.some(value => itemDept.includes(value));
    });
    if (!deptEntry) return [];
    return [{ ...deptEntry, agents: [representative] }];
  }

  if (role !== 'supervisor' || !department) {
    return DEPARTMENT_ORDER;
  }

  const allowed = department.split(',').map(part => normalizeText(part));

  return DEPARTMENT_ORDER.filter(item => {
    const itemDept = normalizeText(item.dept);
    if (itemDept.includes('місто+область (центр)')) {
      return (
        allowed.some(value => value.includes('місто')) ||
        allowed.some(value => value.includes('область'))
      );
    }
    return allowed.some(value => itemDept.includes(value));
  });
}

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

const ORIMI_BRANDS = [
  'Greenfield',
  'TESS',
  'Принцеса Нурі',
  'Принцеса Канді',
  'Принцеса Ява',
  'Принцеса Гіта',
  'Жокей',
  'JARDIN',
  'PIAZZA',
];

function normalizeBrand(brand: string): string {
  return brand
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

const ORIMI_SET = new Set(ORIMI_BRANDS.map(normalizeBrand));
const DELICIA_BRAND = 'Деліція';
const DELICIA_NORMALIZED = normalizeBrand(DELICIA_BRAND);

function isOrimiBrand(brand: string): boolean {
  return ORIMI_SET.has(normalizeBrand(brand));
}

function isDeliciaBrand(brand: string): boolean {
  return normalizeBrand(brand) === DELICIA_NORMALIZED;
}

// ─── РОЗРАХУНОК ─────────────────────────────────────────────────────────────

type AgentStats = {
  factGrn: number;
  /** АКБ: ТТ із сумою ≥500 грн */
  akbFact: number;
  /** ВКБ Жокей: ТТ Жокей із сумою ≥0 грн */
  vkbJockeyFact: number;
  /** ВКБ: всі ТТ із сумою ≥0 грн */
  allStores: number;
  /** АКБ Жокей: ТТ Жокей із сумою ≥300 грн */
  akbJockeyStores: number;
  /** Деліція факт у грн (сума по ТТ із сумою ≥0 грн) */
  deliciaFactGrn: number;
  /** Деліція факт ВКБ у ТТ (від 0 грн) */
  deliciaStoresCount: number;
};

function calcStats(
  sales: Sale[],
  deliciaSales: Sale[]
): Record<string, AgentStats> {
  const byAgent: Record<
    string,
    {
      factGrn: number;
      storeSum: Record<string, number>;
      jockeyStoreSum: Record<string, number>;
      deliciaStoreSum: Record<string, number>;
    }
  > = {};

  for (const s of sales) {
    if (!s.агент) continue;
    if (!byAgent[s.агент]) {
      byAgent[s.агент] = {
        factGrn: 0,
        storeSum: {},
        jockeyStoreSum: {},
        deliciaStoreSum: {},
      };
    }
    const a = byAgent[s.агент];
    a.factGrn += s.сума || 0;

    if (s.торгова_точка) {
      a.storeSum[s.торгова_точка] =
        (a.storeSum[s.торгова_точка] || 0) + (s.сума || 0);

      if (s.бренд === 'Жокей') {
        a.jockeyStoreSum[s.торгова_точка] =
          (a.jockeyStoreSum[s.торгова_точка] || 0) + (s.сума || 0);
      }
    }
  }

  for (const s of deliciaSales) {
    if (!s.агент) continue;
    if (!byAgent[s.агент]) {
      byAgent[s.агент] = {
        factGrn: 0,
        storeSum: {},
        jockeyStoreSum: {},
        deliciaStoreSum: {},
      };
    }

    if (s.торгова_точка) {
      byAgent[s.агент].deliciaStoreSum[s.торгова_точка] =
        (byAgent[s.агент].deliciaStoreSum[s.торгова_точка] || 0) +
        (s.сума || 0);
    }
  }

  const result: Record<string, AgentStats> = {};
  for (const [agent, data] of Object.entries(byAgent)) {
    const akbFact = Object.values(data.storeSum).filter(v => v >= 500).length;
    const vkbJockeyFact = Object.values(data.jockeyStoreSum).filter(
      v => v >= 0
    ).length;
    const allStores = Object.keys(data.storeSum).length;
    const akbJockeyStores = Object.values(data.jockeyStoreSum).filter(
      v => v >= 300
    ).length;
    const deliciaFactGrn = Object.values(data.deliciaStoreSum)
      .filter(v => v >= 0)
      .reduce((sum, value) => sum + value, 0);
    const deliciaStoresCount = Object.values(data.deliciaStoreSum).filter(
      v => v >= 0
    ).length;
    result[agent] = {
      factGrn: data.factGrn,
      akbFact,
      vkbJockeyFact,
      allStores,
      akbJockeyStores,
      deliciaFactGrn,
      deliciaStoresCount,
    };
  }
  return result;
}

// ─── КОМПОНЕНТ ──────────────────────────────────────────────────────────────

export default function ImplementationPage({ onBack }: { onBack: () => void }) {
  const renderDepartments = useMemo(
    () => getRenderableDepartmentsByScope(),
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

  const currentMonth = useMemo(() => getCurrentMonthKey(), []);

  const currentMonthSales = useMemo(
    () => data.filter(s => parseDateMonth(s.дата) === currentMonth),
    [data, currentMonth]
  );

  const currentMonthOrimiSales = useMemo(
    () => currentMonthSales.filter(s => isOrimiBrand(s.бренд)),
    [currentMonthSales]
  );

  const currentMonthDeliciaSales = useMemo(
    () => currentMonthSales.filter(s => isDeliciaBrand(s.бренд)),
    [currentMonthSales]
  );

  const stats = useMemo(
    () => calcStats(currentMonthOrimiSales, currentMonthDeliciaSales),
    [currentMonthOrimiSales, currentMonthDeliciaSales]
  );

  const lastUpdated = useMemo(() => {
    let maxDate = '';
    for (const s of currentMonthOrimiSales) {
      const iso = parseDateISO(s.дата);
      if (iso && iso > maxDate) maxDate = iso;
    }
    return maxDate ? formatKyivDateTime(maxDate) : null;
  }, [currentMonthOrimiSales]);

  if (isLoading) return <Loader />;
  if (error) return <div className={styles.error}>Помилка завантаження</div>;

  // Будуємо рядки таблиці
  type Row =
    | {
        type: 'dept';
        label: string;
        factGrn: number;
        primaryPlan: number;
        primaryFact: number;
        secondaryPlan: number;
        secondaryFact: number;
        tertiaryPlan: number;
        tertiaryFact: number;
        quaternaryPlan: number;
        quaternaryFact: number;
      }
    | {
        type: 'agent';
        label: string;
        factGrn: number;
        primaryPlan: number;
        primaryFact: number;
        secondaryPlan: number;
        secondaryFact: number;
        tertiaryPlan: number;
        tertiaryFact: number;
        quaternaryPlan: number;
        quaternaryFact: number;
      };

  const rows: Row[] = [];

  let totalFactGrn = 0;
  let totalPrimaryPlan = 0;
  let totalPrimaryFact = 0;
  let totalSecondaryPlan = 0;
  let totalSecondaryFact = 0;
  let totalTertiaryPlan = 0;
  let totalTertiaryFact = 0;
  let totalQuaternaryPlan = 0;
  let totalQuaternaryFact = 0;

  for (const dept of renderDepartments) {
    const deptPlan = DEPARTMENT_PLANS[dept.dept] ?? { vkb: 0, akbJockey: 0 };
    let dFactGrn = 0,
      dPrimaryFact = 0,
      dSecondaryFact = 0,
      dTertiaryFact = 0,
      dQuaternaryFact = 0;
    const dPrimaryPlan = deptPlan.vkb;
    const dSecondaryPlan = deptPlan.akbJockey;
    let dTertiaryPlan = 0;
    let dQuaternaryPlan = 0;

    const agentRows: Row[] = [];

    for (const agent of dept.agents) {
      const s = stats[agent] ?? {
        factGrn: 0,
        akbFact: 0,
        vkbJockeyFact: 0,
        allStores: 0,
        akbJockeyStores: 0,
        deliciaFactGrn: 0,
        deliciaStoresCount: 0,
      };
      const plan = AGENT_PLANS[agent] ?? { akb: 0, vkbJockey: 0 };
      const deliciaPlan = AGENT_DELICIA_PLANS[agent] ?? {
        deliciaVkbGrn: 0,
        deliciaVkbStores: 0,
      };

      dFactGrn += s.factGrn;
      dPrimaryFact += s.allStores;
      dSecondaryFact += s.akbJockeyStores;
      dTertiaryFact += s.deliciaFactGrn;
      dQuaternaryFact += s.deliciaStoresCount;
      dTertiaryPlan += deliciaPlan.deliciaVkbGrn;
      dQuaternaryPlan += deliciaPlan.deliciaVkbStores;

      agentRows.push({
        type: 'agent',
        label: agent,
        factGrn: s.factGrn,
        primaryPlan: plan.akb,
        primaryFact: s.akbFact,
        secondaryPlan: plan.vkbJockey,
        secondaryFact: s.vkbJockeyFact,
        tertiaryPlan: deliciaPlan.deliciaVkbGrn,
        tertiaryFact: s.deliciaFactGrn,
        quaternaryPlan: deliciaPlan.deliciaVkbStores,
        quaternaryFact: s.deliciaStoresCount,
      });
    }

    rows.push({
      type: 'dept',
      label: dept.label,
      factGrn: dFactGrn,
      primaryPlan: dPrimaryPlan,
      primaryFact: dPrimaryFact,
      secondaryPlan: dSecondaryPlan,
      secondaryFact: dSecondaryFact,
      tertiaryPlan: dTertiaryPlan,
      tertiaryFact: dTertiaryFact,
      quaternaryPlan: dQuaternaryPlan,
      quaternaryFact: dQuaternaryFact,
    });

    rows.push(...agentRows);

    totalFactGrn += dFactGrn;
    totalPrimaryPlan += dPrimaryPlan;
    totalPrimaryFact += dPrimaryFact;
    totalSecondaryPlan += dSecondaryPlan;
    totalSecondaryFact += dSecondaryFact;
    totalTertiaryPlan += dTertiaryPlan;
    totalTertiaryFact += dTertiaryFact;
    totalQuaternaryPlan += dQuaternaryPlan;
    totalQuaternaryFact += dQuaternaryFact;
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
                ТП: АКБ / СВ: ВКБ
              </th>
              <th className={styles.colGroup} colSpan={3}>
                ТП: ВКБ Жокей / СВ: АКБ Жокей
              </th>
              <th className={styles.colGroup} colSpan={3}>
                Деліція: сума в грн (ВКБ від 0 грн)
              </th>
              <th className={styles.colGroup} colSpan={3}>
                Деліція: ВКБ окремо (ТТ від 0 грн)
              </th>
            </tr>
            <tr>
              <th className={styles.colSub}>ПЛАН</th>
              <th className={styles.colSub}>ФАКТ</th>
              <th className={styles.colSub}>%%</th>
              <th className={styles.colSub}>ПЛАН</th>
              <th className={styles.colSub}>ФАКТ</th>
              <th className={styles.colSub}>%%</th>
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
                  <td className={styles.numCell}>{row.primaryPlan}</td>
                  <td className={styles.numCell}>{row.primaryFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.primaryFact, row.primaryPlan, styles)}`}
                  >
                    {pct(row.primaryFact, row.primaryPlan)}
                  </td>
                  <td className={styles.numCell}>{row.secondaryPlan}</td>
                  <td className={styles.numCell}>{row.secondaryFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.secondaryFact, row.secondaryPlan, styles)}`}
                  >
                    {pct(row.secondaryFact, row.secondaryPlan)}
                  </td>
                  <td className={styles.numCell}>{fmt(row.tertiaryPlan)}</td>
                  <td className={styles.numCell}>{fmt(row.tertiaryFact)}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.tertiaryFact, row.tertiaryPlan, styles)}`}
                  >
                    {pct(row.tertiaryFact, row.tertiaryPlan)}
                  </td>
                  <td className={styles.numCell}>{row.quaternaryPlan}</td>
                  <td className={styles.numCell}>{row.quaternaryFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.quaternaryFact, row.quaternaryPlan, styles)}`}
                  >
                    {pct(row.quaternaryFact, row.quaternaryPlan)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td className={styles.nameCell}>Загальний підсумок ВКБ</td>
              <td className={styles.numCell}>{fmt(totalFactGrn)}</td>
              <td className={styles.numCell}>{totalPrimaryPlan}</td>
              <td className={styles.numCell}>{totalPrimaryFact}</td>
              <td
                className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalPrimaryFact, totalPrimaryPlan, styles)}`}
              >
                {pct(totalPrimaryFact, totalPrimaryPlan)}
              </td>
              <td className={styles.numCell}>{totalSecondaryPlan}</td>
              <td className={styles.numCell}>{totalSecondaryFact}</td>
              <td
                className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalSecondaryFact, totalSecondaryPlan, styles)}`}
              >
                {pct(totalSecondaryFact, totalSecondaryPlan)}
              </td>
              <td className={styles.numCell}>{fmt(totalTertiaryPlan)}</td>
              <td className={styles.numCell}>{fmt(totalTertiaryFact)}</td>
              <td
                className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalTertiaryFact, totalTertiaryPlan, styles)}`}
              >
                {pct(totalTertiaryFact, totalTertiaryPlan)}
              </td>
              <td className={styles.numCell}>{totalQuaternaryPlan}</td>
              <td className={styles.numCell}>{totalQuaternaryFact}</td>
              <td
                className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalQuaternaryFact, totalQuaternaryPlan, styles)}`}
              >
                {pct(totalQuaternaryFact, totalQuaternaryPlan)}
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
                <td className={styles.nameCell}>Загальний підсумок ВКБ</td>
                <td className={styles.numCell}>{fmt(totalFactGrn)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Таблиця 2: ТП: АКБ / СВ: ВКБ */}
        <p className={styles.mobileTableTitle}>ТП: АКБ / СВ: ВКБ</p>
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
                  <td className={styles.numCell}>{row.primaryPlan}</td>
                  <td className={styles.numCell}>{row.primaryFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.primaryFact, row.primaryPlan, styles)}`}
                  >
                    {pct(row.primaryFact, row.primaryPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок ВКБ</td>
                <td className={styles.numCell}>{totalPrimaryPlan}</td>
                <td className={styles.numCell}>{totalPrimaryFact}</td>
                <td
                  className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalPrimaryFact, totalPrimaryPlan, styles)}`}
                >
                  {pct(totalPrimaryFact, totalPrimaryPlan)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Таблиця 3: ТП: ВКБ Жокей / СВ: АКБ Жокей */}
        <p className={styles.mobileTableTitle}>ТП: ВКБ Жокей / СВ: АКБ Жокей</p>
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
                  <td className={styles.numCell}>{row.secondaryPlan}</td>
                  <td className={styles.numCell}>{row.secondaryFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.secondaryFact, row.secondaryPlan, styles)}`}
                  >
                    {pct(row.secondaryFact, row.secondaryPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок ВКБ</td>
                <td className={styles.numCell}>{totalSecondaryPlan}</td>
                <td className={styles.numCell}>{totalSecondaryFact}</td>
                <td
                  className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalSecondaryFact, totalSecondaryPlan, styles)}`}
                >
                  {pct(totalSecondaryFact, totalSecondaryPlan)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Таблиця 4: Деліція: ВКБ від 0 грн */}
        <p className={styles.mobileTableTitle}>
          Деліція: сума в грн (ВКБ від 0 грн)
        </p>
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
                  <td className={styles.numCell}>{fmt(row.tertiaryPlan)}</td>
                  <td className={styles.numCell}>{fmt(row.tertiaryFact)}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.tertiaryFact, row.tertiaryPlan, styles)}`}
                  >
                    {pct(row.tertiaryFact, row.tertiaryPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок ВКБ</td>
                <td className={styles.numCell}>{fmt(totalTertiaryPlan)}</td>
                <td className={styles.numCell}>{fmt(totalTertiaryFact)}</td>
                <td
                  className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalTertiaryFact, totalTertiaryPlan, styles)}`}
                >
                  {pct(totalTertiaryFact, totalTertiaryPlan)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Таблиця 5: Деліція ВКБ окремо */}
        <p className={styles.mobileTableTitle}>
          Деліція: ВКБ окремо (ТТ від 0 грн)
        </p>
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
                  <td className={styles.numCell}>{row.quaternaryPlan}</td>
                  <td className={styles.numCell}>{row.quaternaryFact}</td>
                  <td
                    className={`${styles.numCell} ${styles.pctCell} ${getPctClass(row.quaternaryFact, row.quaternaryPlan, styles)}`}
                  >
                    {pct(row.quaternaryFact, row.quaternaryPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.nameCell}>Загальний підсумок ВКБ</td>
                <td className={styles.numCell}>{totalQuaternaryPlan}</td>
                <td className={styles.numCell}>{totalQuaternaryFact}</td>
                <td
                  className={`${styles.numCell} ${styles.pctCell} ${getPctClass(totalQuaternaryFact, totalQuaternaryPlan, styles)}`}
                >
                  {pct(totalQuaternaryFact, totalQuaternaryPlan)}
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
