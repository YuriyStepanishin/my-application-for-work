import { useEffect, useMemo, useState } from 'react';
import { SALES_URL } from '../../api/config';
import { transformSales } from '../../utils/transformSales';
import styles from './SalesPage.module.css';
import type { RawSale } from '../../types/sales';

type Sale = {
  date: string;
  brand: string;
  product: string;
  qty: number;
  amount: number;
  agent: string;
  supervisor: string;
  store: string;
};

type BrandData = {
  amount: number;
  qty: number;
  stores: Set<string>;
  storeMap: Record<string, number>;
  tt500: number;
};

export default function SalesPage({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Sale[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const [agent, setAgent] = useState('');
  const [supervisor, setSupervisor] = useState('');

  // 🔹 Завантаження CSV
  useEffect(() => {
    async function init() {
      const res = await fetch(SALES_URL);

      const raw: RawSale[] = await res.json();

      const clean = transformSales(raw);
      setData(clean);
    }

    init();
  }, []);

  // 🔥 ВСЯ АНАЛІТИКА ТУТ (useMemo)
  const grouped = useMemo(() => {
    let filtered = [...data];

    if (agent) {
      filtered = filtered.filter(i => i.agent === agent);
    }

    if (supervisor) {
      filtered = filtered.filter(i => i.supervisor === supervisor);
    }

    const result: Record<string, BrandData> = {};

    filtered.forEach(i => {
      if (!result[i.brand]) {
        result[i.brand] = {
          amount: 0,
          qty: 0,
          stores: new Set(),
          storeMap: {},
          tt500: 0,
        };
      }

      result[i.brand].amount += i.amount;
      result[i.brand].qty += i.qty;
      result[i.brand].stores.add(i.store);

      if (!result[i.brand].storeMap[i.store]) {
        result[i.brand].storeMap[i.store] = 0;
      }

      result[i.brand].storeMap[i.store] += i.amount;
    });

    Object.values(result).forEach(brand => {
      brand.tt500 = Object.values(brand.storeMap).filter(
        sum => sum >= 500
      ).length;
    });

    return result;
  }, [data, agent, supervisor]);

  const selectedStores =
    selectedBrand && grouped[selectedBrand]
      ? Object.entries(grouped[selectedBrand].storeMap)
      : [];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Показники</h2>

      {/* 🔥 ФІЛЬТРИ */}
      <div className={styles.filters}>
        <select
          className={styles.select}
          value={supervisor}
          onChange={e => setSupervisor(e.target.value)}
        >
          <option value="">Всі супери</option>
          {[...new Set(data.map(d => d.supervisor))].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          className={styles.select}
          value={agent}
          onChange={e => setAgent(e.target.value)}
        >
          <option value="">Всі агенти</option>
          {[...new Set(data.map(d => d.agent))].map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* 🔹 Таблиця */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Бренд</th>
            <th>Сума</th>
            <th>КГ</th>
            <th>ТТ</th>
            <th>ТТ від 500 грн</th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(grouped).map(([brand, val]) => (
            <tr key={brand}>
              <td>{brand}</td>
              <td>{val.amount.toFixed(2)}</td>
              <td>{val.qty.toFixed(2)}</td>

              <td
                className={styles.clickable}
                onClick={() => setSelectedBrand(brand)}
              >
                {val.stores.size}
              </td>

              <td>{val.tt500}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔻 Деталізація ТТ */}
      {selectedBrand && (
        <div className={styles.subBlock}>
          <h3>ТТ по бренду: {selectedBrand}</h3>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Точка</th>
                <th>Сума</th>
              </tr>
            </thead>

            <tbody>
              {selectedStores.map(([store, sum]) => (
                <tr key={store}>
                  <td>{store}</td>
                  <td>{Number(sum).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className={styles.button} onClick={onBack}>
        Назад
      </button>
    </div>
  );
}
