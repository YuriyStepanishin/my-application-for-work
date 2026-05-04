import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import {
  ASSORTMENT_MODE_OPTIONS,
  METRIC_BASE_OPTIONS,
  METRIC_UNIT_OPTIONS,
  type PlanColumn,
  BRAND_OPTIONS,
  buildMetricType,
  inferMetricControls,
  metricLabel,
  loadPlanColumns,
  savePlanColumns,
  thresholdLabel,
  type MetricBase,
  type MetricUnit,
} from '../ImplementationPage/planColumnsStorage';
import {
  ALL_AGENTS,
  DEPARTMENT_ORDER,
  getBrandLabel,
  matchesBrand,
} from '../ImplementationPage/agentsConfig';
import styles from './PlanTargetsPage.module.css';

type Props = {
  onBack: () => void;
};

function buildEmpty(): PlanColumn {
  const deptMode: Record<string, 'total' | 'individual'> = {};
  const deptPlans: Record<string, number> = {};
  for (const d of DEPARTMENT_ORDER) {
    deptMode[d.dept] = 'individual';
    deptPlans[d.dept] = 0;
  }
  return {
    id: crypto.randomUUID(),
    label: '',
    brand: 'jockey',
    metric: 'tt_from_x',
    threshold: 500,
    agentPlans: Object.fromEntries(ALL_AGENTS.map(a => [a, 0])),
    deptMode,
    deptPlans,
  };
}

export default function PlanTargetsPage({ onBack }: Props) {
  const [columns, setColumns] = useState<PlanColumn[]>(loadPlanColumns);
  const [editing, setEditing] = useState<PlanColumn | null>(null);
  const [saved, setSaved] = useState(false);
  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  const handleSaveAll = useCallback(() => {
    savePlanColumns(columns);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [columns]);

  function handleAddColumn() {
    setEditing(buildEmpty());
  }

  function handleEditColumn(col: PlanColumn) {
    // ensure all agents present
    const plans = { ...col.agentPlans };
    for (const a of ALL_AGENTS) {
      if (!(a in plans)) plans[a] = 0;
    }
    setEditing({ ...col, agentPlans: plans });
  }

  function handleDeleteColumn(id: string) {
    setColumns(prev => prev.filter(c => c.id !== id));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    setColumns(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function handleMoveDown(index: number) {
    setColumns(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function handleSaveColumn(col: PlanColumn) {
    setColumns(prev => {
      const idx = prev.findIndex(c => c.id === col.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = col;
        return next;
      }
      return [...prev, col];
    });
    setEditing(null);
  }

  if (editing) {
    return (
      <ColumnEditor
        column={editing}
        sales={sales}
        onSave={handleSaveColumn}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>Планові показники</h2>
      </header>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.addBtn}
          onClick={handleAddColumn}
        >
          + Додати колонку
        </button>
        <button
          type="button"
          className={styles.saveAllBtn}
          onClick={handleSaveAll}
        >
          {saved ? '✓ Збережено' : 'Зберегти всі'}
        </button>
      </div>

      {columns.length === 0 ? (
        <p className={styles.empty}>
          Немає колонок. Натисніть «+ Додати колонку».
        </p>
      ) : (
        <div className={styles.columnList}>
          {columns.map((col, idx) => {
            const brandLabel = summarizeSelection(
              (col.brands && col.brands.length > 0
                ? col.brands
                : [col.brand]
              ).map(getBrandLabel),
              'Без ТМ'
            );
            const assortmentLabel =
              (col.assortmentMode ?? 'all') === 'specific' &&
              ((col.assortmentProducts && col.assortmentProducts.length > 0) ||
                col.assortmentProduct)
                ? ` · ${summarizeSelection(
                    col.assortmentProducts && col.assortmentProducts.length > 0
                      ? col.assortmentProducts
                      : col.assortmentProduct
                        ? [col.assortmentProduct]
                        : [],
                    'Без асортименту'
                  )}`
                : '';
            const calcLabel = metricLabel(col.metric, col.threshold);

            return (
              <div key={col.id} className={styles.columnCard}>
                <div className={styles.colInfo}>
                  <span className={styles.colLabel}>
                    {col.label || '(без назви)'}
                  </span>
                  <span className={styles.colMeta}>
                    {brandLabel}
                    {assortmentLabel} · {calcLabel}
                  </span>
                </div>
                <div className={styles.colActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    title="Вгору"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === columns.length - 1}
                    title="Вниз"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => handleEditColumn(col)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteColumn(col.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Назад
      </button>
    </div>
  );
}

// ─── Column Editor ────────────────────────────────────────────────────────────

type EditorProps = {
  column: PlanColumn;
  sales: Sale[];
  onSave: (col: PlanColumn) => void;
  onCancel: () => void;
};

function parseNum(v: string): number {
  return Number(v.replace(',', '.')) || 0;
}

function summarizeSelection(values: string[], emptyLabel: string): string {
  if (values.length === 0) return emptyLabel;
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
}

function readSelectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(event.target.selectedOptions, option => option.value);
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

function ColumnEditor({ column, sales, onSave, onCancel }: EditorProps) {
  const [label, setLabel] = useState(column.label);
  const [selectedBrands, setSelectedBrands] = useState(() =>
    column.brands && column.brands.length > 0 ? column.brands : [column.brand]
  );
  const controls = useMemo(
    () => inferMetricControls(column.metric),
    [column.metric]
  );
  const [metricBase, setMetricBase] = useState<MetricBase>(controls.base);
  const [metricUnit, setMetricUnit] = useState<MetricUnit>(controls.unit);
  const [thresholdEnabled, setThresholdEnabled] = useState(
    controls.thresholdEnabled
  );
  const [threshold, setThreshold] = useState(String(column.threshold));
  const [assortmentMode, setAssortmentMode] = useState(
    column.assortmentMode ?? 'all'
  );
  const [selectedAssortmentProducts, setSelectedAssortmentProducts] = useState(
    () =>
      column.assortmentProducts && column.assortmentProducts.length > 0
        ? column.assortmentProducts
        : column.assortmentProduct
          ? [column.assortmentProduct]
          : []
  );
  const [plans, setPlans] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ALL_AGENTS.map(a => [a, String(column.agentPlans[a] ?? 0)])
    )
  );
  const [deptMode, setDeptMode] = useState<
    Record<string, 'total' | 'individual'>
  >(() => {
    const modes: Record<string, 'total' | 'individual'> = {};
    for (const d of DEPARTMENT_ORDER) {
      modes[d.dept] = column.deptMode?.[d.dept] ?? 'individual';
    }
    return modes;
  });
  const [deptPlans, setDeptPlans] = useState<Record<string, string>>(() => {
    const dp: Record<string, string> = {};
    for (const d of DEPARTMENT_ORDER) {
      dp[d.dept] = String(column.deptPlans?.[d.dept] ?? 0);
    }
    return dp;
  });

  const brandOptions = useMemo(() => {
    const firstBrand = selectedBrands[0] ?? column.brand;
    if (BRAND_OPTIONS.some(option => option.value === firstBrand))
      return BRAND_OPTIONS;
    return [
      { value: firstBrand, label: getBrandLabel(firstBrand) },
      ...BRAND_OPTIONS,
    ];
  }, [selectedBrands, column.brand]);

  const assortmentOptions = useMemo(() => {
    const seen = new Set<string>();
    return sales
      .filter(item => item.товар && item.бренд)
      .filter(item =>
        selectedBrands.some(selectedBrand =>
          matchesBrand(item.бренд, selectedBrand)
        )
      )
      .map(item => item.товар.trim())
      .filter(item => {
        const key = normalizeText(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, 'uk-UA'));
  }, [sales, selectedBrands]);

  const showThreshold =
    metricBase === 'tt' && (thresholdEnabled || metricUnit !== 'grn');
  const unitOptions = METRIC_UNIT_OPTIONS.filter(option => {
    if (metricBase === 'sum') return option.value !== 'sku';
    if (metricBase === 'tt') return true;
    return option.value === 'sku';
  });

  const taTotal = DEPARTMENT_ORDER.filter(
    dept => (deptMode[dept.dept] ?? 'individual') === 'individual'
  ).reduce(
    (sum, dept) =>
      sum +
      dept.agents.reduce(
        (agentSum, agent) => agentSum + parseNum(plans[agent] ?? '0'),
        0
      ),
    0
  );

  const deptGrandTotal = DEPARTMENT_ORDER.filter(
    dept => (deptMode[dept.dept] ?? 'individual') === 'total'
  ).reduce((sum, dept) => sum + parseNum(deptPlans[dept.dept] ?? '0'), 0);

  const overallTotal = taTotal + deptGrandTotal;

  function handlePlanChange(agent: string, val: string) {
    if (val !== '' && !/^\d*([.,]\d{0,2})?$/.test(val)) return;
    setPlans(prev => ({ ...prev, [agent]: val }));
  }

  function handleDeptPlanChange(dept: string, val: string) {
    if (val !== '' && !/^\d*([.,]\d{0,2})?$/.test(val)) return;
    setDeptPlans(prev => ({ ...prev, [dept]: val }));
  }

  function handleSave() {
    const agentPlans: Record<string, number> = {};
    for (const a of ALL_AGENTS) {
      agentPlans[a] = parseNum(plans[a] ?? '0');
    }
    const deptModeSaved: Record<string, 'total' | 'individual'> = {};
    const deptPlansSaved: Record<string, number> = {};
    for (const d of DEPARTMENT_ORDER) {
      deptModeSaved[d.dept] = deptMode[d.dept];
      deptPlansSaved[d.dept] = parseNum(deptPlans[d.dept] ?? '0');
    }
    const metric = buildMetricType(
      metricBase,
      metricUnit,
      metricBase === 'tt' ? thresholdEnabled || metricUnit !== 'grn' : false
    );
    onSave({
      id: column.id,
      label: label.trim(),
      brand: selectedBrands[0] ?? column.brand,
      brands: selectedBrands,
      assortmentMode,
      assortmentProduct:
        assortmentMode === 'specific'
          ? (selectedAssortmentProducts[0] ?? '')
          : '',
      assortmentProducts:
        assortmentMode === 'specific' ? selectedAssortmentProducts : [],
      metric,
      threshold: parseNum(threshold),
      agentPlans,
      deptMode: deptModeSaved,
      deptPlans: deptPlansSaved,
    });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          {column.label ? `Редагувати: ${column.label}` : 'Нова колонка'}
        </h2>
      </header>

      <div className={styles.editorForm}>
        {/* Назва */}
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Назва колонки</label>
          <input
            className={styles.formInput}
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="напр. АКБ Жокей"
          />
        </div>

        {/* ТМ */}
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Торгова марка</label>
          <span className={styles.formHint}>
            {summarizeSelection(
              selectedBrands.map(getBrandLabel),
              'Оберіть одну або кілька ТМ'
            )}
          </span>
          <select
            className={`${styles.formSelect} ${styles.multiSelect}`}
            multiple
            size={Math.min(brandOptions.length, 8)}
            value={selectedBrands}
            onChange={e =>
              setSelectedBrands(readSelectedValues(e) as typeof selectedBrands)
            }
          >
            {brandOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formRow}>
          <label className={styles.formLabel}>Асортимент по ТМ</label>
          <select
            className={styles.formSelect}
            value={assortmentMode}
            onChange={e =>
              setAssortmentMode(e.target.value as 'all' | 'specific')
            }
          >
            {ASSORTMENT_MODE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {assortmentMode === 'specific' && (
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Визначений асортимент</label>
            <span className={styles.formHint}>
              {summarizeSelection(
                selectedAssortmentProducts,
                'Оберіть одну або кілька позицій'
              )}
            </span>
            <select
              className={`${styles.formSelect} ${styles.multiSelect}`}
              multiple
              size={Math.min(Math.max(assortmentOptions.length, 4), 10)}
              value={selectedAssortmentProducts}
              onChange={e =>
                setSelectedAssortmentProducts(readSelectedValues(e))
              }
            >
              {assortmentOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formRow}>
          <label className={styles.formLabel}>Тип розрахунку</label>
          <div className={styles.calcGrid}>
            <div className={styles.calcBlock}>
              <span className={styles.calcLabel}>Показник</span>
              <div className={styles.chipRow}>
                {METRIC_BASE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      metricBase === option.value
                        ? styles.chipActive
                        : styles.chipBtn
                    }
                    onClick={() => {
                      setMetricBase(option.value);
                      if (option.value === 'sku') {
                        setMetricUnit('sku');
                        setThresholdEnabled(false);
                      }
                      if (option.value === 'sum' && metricUnit === 'sku') {
                        setMetricUnit('grn');
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.calcBlock}>
              <span className={styles.calcLabel}>Одиниця</span>
              <div className={styles.chipRow}>
                {unitOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      metricUnit === option.value
                        ? styles.chipActive
                        : styles.chipBtn
                    }
                    onClick={() => {
                      setMetricUnit(option.value);
                      if (metricBase !== 'tt') setThresholdEnabled(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {metricBase === 'tt' && metricUnit === 'grn' && (
              <div className={styles.calcBlock}>
                <span className={styles.calcLabel}>Модуль «від»</span>
                <div className={styles.chipRow}>
                  <button
                    type="button"
                    className={
                      !thresholdEnabled ? styles.chipActive : styles.chipBtn
                    }
                    onClick={() => setThresholdEnabled(false)}
                  >
                    Без порогу
                  </button>
                  <button
                    type="button"
                    className={
                      thresholdEnabled ? styles.chipActive : styles.chipBtn
                    }
                    onClick={() => setThresholdEnabled(true)}
                  >
                    Від
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showThreshold && (
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              {thresholdLabel(buildMetricType('tt', metricUnit, true))}
            </label>
            <input
              className={styles.formInput}
              type="text"
              inputMode="decimal"
              value={threshold}
              onChange={e => {
                if (/^\d*([.,]\d*)?$/.test(e.target.value))
                  setThreshold(e.target.value);
              }}
              placeholder="0"
            />
          </div>
        )}

        {/* Плани по агентах */}
        <h3 className={styles.agentsTitle}>Плани по агентах</h3>

        <div className={styles.agentsTable}>
          {DEPARTMENT_ORDER.map(dept => {
            const mode = deptMode[dept.dept] ?? 'individual';
            return (
              <div key={dept.dept} className={styles.deptBlock}>
                <div className={styles.deptHeader}>
                  <span>{dept.label}</span>
                  <div className={styles.modeToggle}>
                    <button
                      type="button"
                      className={
                        mode === 'individual'
                          ? styles.modeActive
                          : styles.modeBtn
                      }
                      onClick={() =>
                        setDeptMode(p => ({ ...p, [dept.dept]: 'individual' }))
                      }
                    >
                      Окремо
                    </button>
                    <button
                      type="button"
                      className={
                        mode === 'total' ? styles.modeActive : styles.modeBtn
                      }
                      onClick={() =>
                        setDeptMode(p => ({ ...p, [dept.dept]: 'total' }))
                      }
                    >
                      Сумарно
                    </button>
                  </div>
                </div>

                {mode === 'total' ? (
                  <div className={styles.agentRow}>
                    <span className={styles.agentName}>План по відділу</span>
                    <input
                      className={styles.planInput}
                      type="text"
                      inputMode="decimal"
                      value={deptPlans[dept.dept] ?? '0'}
                      onChange={e =>
                        handleDeptPlanChange(dept.dept, e.target.value)
                      }
                    />
                  </div>
                ) : (
                  dept.agents.map(agent => (
                    <div key={agent} className={styles.agentRow}>
                      <span className={styles.agentName}>{agent}</span>
                      <input
                        className={styles.planInput}
                        type="text"
                        inputMode="decimal"
                        value={plans[agent] ?? '0'}
                        onChange={e => handlePlanChange(agent, e.target.value)}
                      />
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>

        {/* Динамічні підсумки */}
        <div className={styles.totalsSection}>
          <h3 className={styles.agentsTitle}>Підсумки</h3>
          {taTotal > 0 && (
            <div className={styles.totalDeptRow}>
              <span className={styles.agentName}>Загалом ТА</span>
              <span className={styles.totalValue}>
                {taTotal.toLocaleString('uk-UA')}
              </span>
            </div>
          )}
          {deptGrandTotal > 0 && (
            <div className={styles.totalDeptRow}>
              <span className={styles.agentName}>Загалом відділи</span>
              <span className={styles.totalValue}>
                {deptGrandTotal.toLocaleString('uk-UA')}
              </span>
            </div>
          )}
          <div className={styles.grandTotalRow}>
            <span className={styles.agentName}>Загалом</span>
            <span className={styles.grandTotalValue}>
              {overallTotal.toLocaleString('uk-UA')}
            </span>
          </div>
        </div>

        <div className={styles.editorActions}>
          <button
            type="button"
            className={styles.saveAllBtn}
            onClick={handleSave}
          >
            Зберегти колонку
          </button>
          <button type="button" className={styles.backBtn} onClick={onCancel}>
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}
