import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SALES_URL } from '../../api/config';
import styles from './SalesPage.module.css';
import Loader from '../Loader/Loader';
import SalesFilter from '../SalesFilter/SalesFilter';

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

type StoreDetailsRow = {
  name: string;
  sum: number;
  sku: number;
  products: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
};

const ALL_BRANDS_KEY = '__all_brands__';
const ALL_BRANDS_LABEL = 'Усі торгові марки';

export default function SalesPage({ onBack }: { onBack: () => void }) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [agent, setAgent] = useState('');
  const [department, setDepartment] = useState('');
  const [showProducts, setShowProducts] = useState(false);

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

  const filtered = useMemo(() => {
    return data.filter(i => {
      if (department && i.відділ !== department) return false;
      if (agent && i.агент !== agent) return false;
      return true;
    });
  }, [data, agent, department]);

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

      b.stores.add(key);
      b.storeMap[key] = (b.storeMap[key] || 0) + (i.сума || 0);
    });

    Object.values(result).forEach(b => {
      b.tt500 = Object.values(b.storeMap).filter(sum => sum >= 500).length;
    });

    return result;
  }, [filtered]);

  const brandsList = useMemo(() => {
    return Object.entries(grouped)
      .map(([brand, val]) => ({
        brand,
        ...val,
      }))
      .sort((a, b) => b.amount - a.amount);
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

  const selectedStores = useMemo<StoreDetailsRow[]>(() => {
    if (!selectedBrand) return [];

    const isAllBrandsSelected = selectedBrand === ALL_BRANDS_KEY;

    const storeMap: Record<
      string,
      {
        sum: number;
        products: Record<string, { quantity: number; amount: number }>;
      }
    > = {};

    filtered.forEach(item => {
      if (!isAllBrandsSelected && item.бренд !== selectedBrand) return;
      if (!item.торгова_точка) return;

      if (!storeMap[item.торгова_точка]) {
        storeMap[item.торгова_точка] = {
          sum: 0,
          products: {},
        };
      }

      const store = storeMap[item.торгова_точка];
      store.sum += item.сума || 0;

      if (item.товар) {
        if (!store.products[item.товар]) {
          store.products[item.товар] = {
            quantity: 0,
            amount: 0,
          };
        }

        store.products[item.товар].quantity += item.кількість || 0;
        store.products[item.товар].amount += item.сума || 0;
      }
    });

    return Object.entries(storeMap)
      .map(([name, value]) => ({
        name,
        sum: value.sum,
        sku: Object.keys(value.products).length,
        products: Object.entries(value.products)
          .map(([productName, productValue]) => ({
            name: productName,
            quantity: productValue.quantity,
            amount: productValue.amount,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
      }))
      .sort((a, b) => b.sum - a.sum);
  }, [filtered, selectedBrand]);

  const format = (n: number) =>
    n.toLocaleString('uk-UA', {
      maximumFractionDigits: 2,
    });

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

  useEffect(() => {
    setSelectedBrand(null);
    setShowProducts(false);
  }, [department, agent]);

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
              <td
                className={styles.clickable}
                onClick={() =>
                  setSelectedBrand(prev => (prev === b.brand ? null : b.brand))
                }
              >
                {b.brand}
              </td>
              <td>{b.stores.size}</td>
              <td>{b.tt500}</td>
              <td>{format(b.weight)}</td>
              <td>{format(b.amount)}</td>
            </tr>
          ))}

          <tr className={styles.totalRow}>
            <td
              className={styles.clickable}
              onClick={() =>
                setSelectedBrand(prev =>
                  prev === ALL_BRANDS_KEY ? null : ALL_BRANDS_KEY
                )
              }
            >
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

      <button
        className={`${styles.backSubButton} ${!selectedBrand ? styles.hidden : ''}`}
        onClick={() => {
          setSelectedBrand(null);
          setShowProducts(false);
        }}
      >
        ← Назад
      </button>

      {selectedBrand && (
        <div className={styles.subBlock}>
          <div className={styles.subHeader}>
            <h3 className={styles.subTitle}>
              {selectedBrand === ALL_BRANDS_KEY
                ? ALL_BRANDS_LABEL
                : selectedBrand}
            </h3>
            <button
              className={`${styles.toggleBtn} ${showProducts ? styles.toggleBtnActive : ''}`}
              onClick={() => setShowProducts(p => !p)}
            >
              {showProducts ? '✓ з товаром' : '+ з товаром'}
            </button>
          </div>

          <div className={styles.storeList}>
            {selectedStores.map(({ name, sum, sku, products }) => (
              <div key={name} className={styles.storeCard}>
                <div className={styles.storeRow}>
                  <span className={styles.storeName}>{name}</span>
                  <span className={styles.storeSum}>
                    {sum >= 500 && <span className={styles.storeStar}>★</span>}
                    {format(sum)}
                  </span>
                  <span className={styles.storeSku}>SKU: {sku}</span>
                </div>
                {showProducts && products.length > 0 && (
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

      <button onClick={onBack} className={styles.button}>
        ← Головна сторінка
      </button>
    </div>
  );
}
