import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SALES_URL } from '../../api/config';
import styles from './SalesPage.module.css';

type Sale = {
  місяць: string;
  дата: string;
  бренд: string;
  товар: string;
  вага: number;
  кількість: number;
  сума: number;
  агент: string;
  відділ: string;
  торгова_точка: string;
};

type BrandData = {
  amount: number;
  weight: number;
  stores: Set<string>;
  storeMap: Record<string, number>;
  tt500: number;
};

export default function SalesPage({ onBack }: { onBack: () => void }) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [agent, setAgent] = useState('');
  const [department, setDepartment] = useState('');

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await fetch(SALES_URL);
      if (!res.ok) throw new Error('Помилка');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // 🔥 фільтр
  const filtered = useMemo(() => {
    return data.filter(i => {
      if (department && i.відділ !== department) return false;
      if (agent && i.агент !== agent) return false;
      return true;
    });
  }, [data, agent, department]);

  // 🔥 ГОЛОВНА ЛОГІКА (по торгова_точка)
  const grouped = useMemo(() => {
    const result: Record<string, BrandData> = {};

    filtered.forEach(i => {
      if (!i.бренд) return;

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

      // 🔥 унікальні ТТ
      b.stores.add(key);

      // 🔥 сума по ТТ
      b.storeMap[key] = (b.storeMap[key] || 0) + (i.сума || 0);
    });

    // 🔥 500+
    Object.values(result).forEach(b => {
      b.tt500 = Object.values(b.storeMap).filter(sum => sum >= 500).length;
    });

    return result;
  }, [filtered]);

  // 🔥 список брендів
  const brandsList = useMemo(() => {
    return Object.entries(grouped)
      .map(([brand, val]) => ({
        brand,
        ...val,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [grouped]);

  // 🔥 TOTAL (правильний 500+)
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

  // 🔥 деталізація
  const selectedStores = useMemo(() => {
    if (!selectedBrand || !grouped[selectedBrand]) return [];

    return Object.entries(grouped[selectedBrand].storeMap)
      .map(([store, sum]) => ({
        name: store,
        sum,
      }))
      .sort((a, b) => b.sum - a.sum);
  }, [selectedBrand, grouped]);

  const format = (n: number) =>
    n.toLocaleString('uk-UA', {
      maximumFractionDigits: 2,
    });

  // 🔥 відділи
  const uniqueDepartments = useMemo(
    () => [...new Set(data.map(d => d.відділ).filter(Boolean))],
    [data]
  );

  // 🔥 агенти
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

  if (isLoading) return <div className={styles.loader}>Завантаження...</div>;
  if (error) return <div className={styles.error}>Помилка</div>;

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <select
          value={department}
          onChange={e => {
            setDepartment(e.target.value);
            setAgent('');
          }}
        >
          <option value="">Всі відділи</option>
          {uniqueDepartments.map(d => (
            <option key={d}>{d}</option>
          ))}
        </select>

        <select value={agent} onChange={e => setAgent(e.target.value)}>
          <option value="">Всі агенти</option>
          {uniqueAgents.map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Торгова марка</th>
            <th>Сума</th>
            <th>Вага</th>
            <th>ТТ</th>
            <th>500+</th>
          </tr>
        </thead>

        <tbody>
          {brandsList.map(b => (
            <tr key={b.brand}>
              <td>{b.brand}</td>
              <td>{format(b.amount)}</td>
              <td>{format(b.weight)}</td>
              <td
                className={styles.clickable}
                onClick={() =>
                  setSelectedBrand(prev => (prev === b.brand ? null : b.brand))
                }
              >
                {b.stores.size}
              </td>
              <td>{b.tt500}</td>
            </tr>
          ))}

          <tr className={styles.totalRow}>
            <td>
              <b>Усі торгові марки</b>
            </td>
            <td>
              <b>{format(totalRow.amount)}</b>
            </td>
            <td>
              <b>{format(totalRow.weight)}</b>
            </td>
            <td>
              <b>{totalRow.stores}</b>
            </td>
            <td>
              <b>{totalRow.tt500}</b>
            </td>
          </tr>
        </tbody>
      </table>

      {selectedBrand && (
        <div className={styles.subBlock}>
          <h3>{selectedBrand}</h3>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Точка</th>
                <th>Сума</th>
              </tr>
            </thead>

            <tbody>
              {selectedStores.map(({ name, sum }) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{format(sum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={onBack} className={styles.button}>
        ← Головна сторінка
      </button>
    </div>
  );
}
