import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { fetchSales, type Sale } from '../../api/fetchSales';
import { fetchReports } from '../../api/fetchReports';
import {
  getCurrentAuthorizedEmail,
  getUserRepresentative,
  getUserRole,
} from '../../config/userRoles';
import styles from './SalesPage.module.css';
import Loader from '../Loader/Loader';
import SalesFilter from '../SalesFilter/SalesFilter';
import SearchInput from '../SearchInput';

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

type HierarchyStoreRow = {
  name: string;
  sum: number;
  quantity: number;
  weight: number;
  sku: number;
};

type HierarchyDateRow = {
  key: string;
  label: string;
  sum: number;
  quantity: number;
  weight: number;
  sku: number;
  stores: HierarchyStoreRow[];
};

type HierarchyAgentRow = {
  name: string;
  sum: number;
  quantity: number;
  weight: number;
  stores: number;
  sku: number;
  dates: HierarchyDateRow[];
};

type HierarchyDepartmentRow = {
  name: string;
  sum: number;
  quantity: number;
  weight: number;
  stores: number;
  sku: number;
  agents: HierarchyAgentRow[];
};

type FlatHierarchyAgentRow = HierarchyAgentRow & {
  departmentName: string;
};

type ProductSummaryRow = {
  name: string;
  quantity: number;
  amount: number;
  weight: number;
  tt: number;
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

function normalizeFilterValue(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

function isDeliciaBrand(brand: string): boolean {
  return normalizeFilterValue(brand) === normalizeFilterValue('Деліція');
}

function isSameBrandSelection(selected: string[], target: string[]): boolean {
  if (selected.length !== target.length) return false;
  const targetSet = new Set(target);
  return selected.every(brand => targetSet.has(brand));
}

function aggregateStoresFromDates(
  dates: HierarchyDateRow[]
): HierarchyStoreRow[] {
  const storesMap: Record<
    string,
    {
      sum: number;
      quantity: number;
      weight: number;
      sku: number;
    }
  > = {};

  dates.forEach(dateRow => {
    dateRow.stores.forEach(storeRow => {
      if (!storesMap[storeRow.name]) {
        storesMap[storeRow.name] = { sum: 0, quantity: 0, weight: 0, sku: 0 };
      }
      storesMap[storeRow.name].sum += storeRow.sum;
      storesMap[storeRow.name].quantity += storeRow.quantity;
      storesMap[storeRow.name].weight += storeRow.weight;
      storesMap[storeRow.name].sku = Math.max(
        storesMap[storeRow.name].sku,
        storeRow.sku
      );
    });
  });

  return Object.entries(storesMap)
    .map(([name, value]) => ({
      name,
      sum: value.sum,
      quantity: value.quantity,
      weight: value.weight,
      sku: value.sku,
    }))
    .sort((a, b) => b.sum - a.sum);
}

function aggregateProductsFromSales(rows: Sale[]): ProductSummaryRow[] {
  const products: Record<
    string,
    { quantity: number; amount: number; weight: number; stores: Set<string> }
  > = {};

  rows.forEach(item => {
    const product = item.товар?.trim();
    if (!product) return;
    if (!products[product]) {
      products[product] = {
        quantity: 0,
        amount: 0,
        weight: 0,
        stores: new Set<string>(),
      };
    }
    products[product].quantity += item.кількість || 0;
    products[product].amount += item.сума || 0;
    products[product].weight += (item.кількість || 0) * (item.вага || 0);
    if (item.торгова_точка) products[product].stores.add(item.торгова_точка);
  });

  return Object.entries(products)
    .map(([name, value]) => ({
      name,
      quantity: value.quantity,
      amount: value.amount,
      weight: value.weight,
      tt: value.stores.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'));
}

type SalesPageProps = {
  onBack: () => void;
  onOpenSalesByDays: () => void;
};

export default function SalesPage({
  onBack,
  onOpenSalesByDays,
}: SalesPageProps) {
  const authEmail = getCurrentAuthorizedEmail();
  const userRole = getUserRole(authEmail);
  const ownRepresentative = getUserRepresentative(authEmail) ?? '';
  const isSupervisor = userRole === 'supervisor';
  const isAgent = userRole === 'agent';
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [agent, setAgent] = useState('');
  const [department, setDepartment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStores, setShowStores] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showByDates, setShowByDates] = useState(false);
  const [showByDepartments, setShowByDepartments] = useState(false);
  const [showByAgents, setShowByAgents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const { data: photoReports = [] } = useQuery({
    queryKey: ['photo-reports'],
    queryFn: fetchReports,
    staleTime: 1000 * 60 * 5,
  });

  const storesWithPhotos = useMemo(
    () => new Set(photoReports.map(r => r.store).filter(Boolean)),
    [photoReports]
  );

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
      if (
        department &&
        normalizeFilterValue(i.відділ) !== normalizeFilterValue(department)
      )
        return false;
      if (
        agent &&
        normalizeFilterValue(i.агент) !== normalizeFilterValue(agent)
      )
        return false;

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

  const orimiBrandSelection = useMemo(
    () =>
      brandOptions
        .map(option => option.brand)
        .filter(brand => !isDeliciaBrand(brand)),
    [brandOptions]
  );

  const isOrimiBrandSelectionActive = useMemo(
    () => isSameBrandSelection(effectiveSelectedBrands, orimiBrandSelection),
    [effectiveSelectedBrands, orimiBrandSelection]
  );

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

  const filteredStores = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return selectedStores;

    return selectedStores.filter(store => {
      const storeName = store.name.toLowerCase();
      return storeName.includes(query);
    });
  }, [selectedStores, searchTerm]);

  const prioritizedHierarchy = useMemo<HierarchyDepartmentRow[]>(() => {
    const departmentsMap: Record<
      string,
      {
        sum: number;
        quantity: number;
        weight: number;
        stores: Set<string>;
        products: Set<string>;
        agents: Record<
          string,
          {
            sum: number;
            quantity: number;
            weight: number;
            stores: Set<string>;
            products: Set<string>;
            dates: Record<
              string,
              {
                sum: number;
                quantity: number;
                weight: number;
                products: Set<string>;
                stores: Record<
                  string,
                  {
                    sum: number;
                    quantity: number;
                    weight: number;
                    products: Set<string>;
                  }
                >;
              }
            >;
          }
        >;
      }
    > = {};

    selectedSales.forEach(item => {
      const departmentKey = item.відділ || 'Без відділу';
      const agentKey = item.агент || 'Без торгового представника';
      const dateKey = parseSaleDate(item.дата) || '';
      const storeKey = item.торгова_точка || 'Без торгової точки';
      const amount = item.сума || 0;
      const quantity = item.кількість || 0;
      const weight = (item.кількість || 0) * (item.вага || 0);
      const productKey = item.товар;

      if (!departmentsMap[departmentKey]) {
        departmentsMap[departmentKey] = {
          sum: 0,
          quantity: 0,
          weight: 0,
          stores: new Set<string>(),
          products: new Set<string>(),
          agents: {},
        };
      }

      const departmentGroup = departmentsMap[departmentKey];
      departmentGroup.sum += amount;
      departmentGroup.quantity += quantity;
      departmentGroup.weight += weight;
      departmentGroup.stores.add(storeKey);
      if (productKey) departmentGroup.products.add(productKey);

      if (!departmentGroup.agents[agentKey]) {
        departmentGroup.agents[agentKey] = {
          sum: 0,
          quantity: 0,
          weight: 0,
          stores: new Set<string>(),
          products: new Set<string>(),
          dates: {},
        };
      }

      const agentGroup = departmentGroup.agents[agentKey];
      agentGroup.sum += amount;
      agentGroup.quantity += quantity;
      agentGroup.weight += weight;
      agentGroup.stores.add(storeKey);
      if (productKey) agentGroup.products.add(productKey);

      if (!agentGroup.dates[dateKey]) {
        agentGroup.dates[dateKey] = {
          sum: 0,
          quantity: 0,
          weight: 0,
          products: new Set<string>(),
          stores: {},
        };
      }

      const dateGroup = agentGroup.dates[dateKey];
      dateGroup.sum += amount;
      dateGroup.quantity += quantity;
      dateGroup.weight += weight;
      if (productKey) dateGroup.products.add(productKey);

      if (!dateGroup.stores[storeKey]) {
        dateGroup.stores[storeKey] = {
          sum: 0,
          quantity: 0,
          weight: 0,
          products: new Set<string>(),
        };
      }

      const storeGroup = dateGroup.stores[storeKey];
      storeGroup.sum += amount;
      storeGroup.quantity += quantity;
      storeGroup.weight += weight;
      if (productKey) storeGroup.products.add(productKey);
    });

    return Object.entries(departmentsMap)
      .map(([departmentName, department]) => ({
        name: departmentName,
        sum: department.sum,
        quantity: department.quantity,
        weight: department.weight,
        stores: department.stores.size,
        sku: department.products.size,
        agents: Object.entries(department.agents)
          .map(([agentName, agentValue]) => ({
            name: agentName,
            sum: agentValue.sum,
            quantity: agentValue.quantity,
            weight: agentValue.weight,
            stores: agentValue.stores.size,
            sku: agentValue.products.size,
            dates: Object.entries(agentValue.dates)
              .map(([dateGroupKey, dateValue]) => ({
                key: dateGroupKey,
                label: formatDateLabel(dateGroupKey),
                sum: dateValue.sum,
                quantity: dateValue.quantity,
                weight: dateValue.weight,
                sku: dateValue.products.size,
                stores: Object.entries(dateValue.stores)
                  .map(([storeName, storeValue]) => ({
                    name: storeName,
                    sum: storeValue.sum,
                    quantity: storeValue.quantity,
                    weight: storeValue.weight,
                    sku: storeValue.products.size,
                  }))
                  .sort((a, b) => b.sum - a.sum),
              }))
              .sort((a, b) => {
                if (!a.key) return 1;
                if (!b.key) return -1;
                return b.key.localeCompare(a.key);
              }),
          }))
          .sort((a, b) => b.sum - a.sum),
      }))
      .sort((a, b) => b.sum - a.sum);
  }, [selectedSales]);

  const prioritizedAgents = useMemo<FlatHierarchyAgentRow[]>(() => {
    return prioritizedHierarchy
      .flatMap(departmentRow =>
        departmentRow.agents.map(agentRow => ({
          ...agentRow,
          departmentName: departmentRow.name,
        }))
      )
      .sort((a, b) => b.sum - a.sum);
  }, [prioritizedHierarchy]);

  const productsByDeptAgent = useMemo(() => {
    const map: Record<string, ProductSummaryRow[]> = {};

    const grouped: Record<string, Sale[]> = {};
    selectedSales.forEach(item => {
      const key = `${item.відділ || 'Без відділу'}||${item.агент || 'Без торгового представника'}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([key, rows]) => {
      map[key] = aggregateProductsFromSales(rows);
    });

    return map;
  }, [selectedSales]);

  const productsByDepartment = useMemo(() => {
    const map: Record<string, ProductSummaryRow[]> = {};

    const grouped: Record<string, Sale[]> = {};
    selectedSales.forEach(item => {
      const key = item.відділ || 'Без відділу';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([key, rows]) => {
      map[key] = aggregateProductsFromSales(rows);
    });

    return map;
  }, [selectedSales]);

  const productsByDepartmentDate = useMemo(() => {
    const map: Record<string, ProductSummaryRow[]> = {};

    const grouped: Record<string, Sale[]> = {};
    selectedSales.forEach(item => {
      const dateKey = parseSaleDate(item.дата) || '';
      const key = `${item.відділ || 'Без відділу'}||${dateKey}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([key, rows]) => {
      map[key] = aggregateProductsFromSales(rows);
    });

    return map;
  }, [selectedSales]);

  const datesByDepartment = useMemo(() => {
    const map: Record<
      string,
      Record<
        string,
        {
          sum: number;
          quantity: number;
          weight: number;
          products: Set<string>;
          stores: Record<
            string,
            {
              sum: number;
              quantity: number;
              weight: number;
              products: Set<string>;
            }
          >;
        }
      >
    > = {};

    selectedSales.forEach(item => {
      const departmentKey = item.відділ || 'Без відділу';
      const dateKey = parseSaleDate(item.дата) || '';
      const storeKey = item.торгова_точка || 'Без торгової точки';
      const amount = item.сума || 0;
      const quantity = item.кількість || 0;
      const weight = (item.кількість || 0) * (item.вага || 0);
      const productKey = item.товар;

      if (!map[departmentKey]) map[departmentKey] = {};
      if (!map[departmentKey][dateKey]) {
        map[departmentKey][dateKey] = {
          sum: 0,
          quantity: 0,
          weight: 0,
          products: new Set<string>(),
          stores: {},
        };
      }

      const dateGroup = map[departmentKey][dateKey];
      dateGroup.sum += amount;
      dateGroup.quantity += quantity;
      dateGroup.weight += weight;
      if (productKey) dateGroup.products.add(productKey);

      if (!dateGroup.stores[storeKey]) {
        dateGroup.stores[storeKey] = {
          sum: 0,
          quantity: 0,
          weight: 0,
          products: new Set<string>(),
        };
      }

      const store = dateGroup.stores[storeKey];
      store.sum += amount;
      store.quantity += quantity;
      store.weight += weight;
      if (productKey) store.products.add(productKey);
    });

    const result: Record<string, HierarchyDateRow[]> = {};
    Object.entries(map).forEach(([departmentKey, dateMap]) => {
      result[departmentKey] = Object.entries(dateMap)
        .map(([dateKey, dateValue]) => ({
          key: dateKey,
          label: formatDateLabel(dateKey),
          sum: dateValue.sum,
          quantity: dateValue.quantity,
          weight: dateValue.weight,
          sku: dateValue.products.size,
          stores: Object.entries(dateValue.stores)
            .map(([storeName, storeValue]) => ({
              name: storeName,
              sum: storeValue.sum,
              quantity: storeValue.quantity,
              weight: storeValue.weight,
              sku: storeValue.products.size,
            }))
            .sort((a, b) => b.sum - a.sum),
        }))
        .sort((a, b) => {
          if (!a.key) return 1;
          if (!b.key) return -1;
          return b.key.localeCompare(a.key);
        });
    });

    return result;
  }, [selectedSales]);

  const productsByDeptAgentDate = useMemo(() => {
    const map: Record<string, ProductSummaryRow[]> = {};

    const grouped: Record<string, Sale[]> = {};
    selectedSales.forEach(item => {
      const dateKey = parseSaleDate(item.дата) || '';
      const key = `${item.відділ || 'Без відділу'}||${item.агент || 'Без торгового представника'}||${dateKey}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([key, rows]) => {
      map[key] = aggregateProductsFromSales(rows);
    });

    return map;
  }, [selectedSales]);

  const productsByAgent = useMemo(() => {
    const map: Record<string, ProductSummaryRow[]> = {};

    const grouped: Record<string, Sale[]> = {};
    selectedSales.forEach(item => {
      const key = item.агент || 'Без торгового представника';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([key, rows]) => {
      map[key] = aggregateProductsFromSales(rows);
    });

    return map;
  }, [selectedSales]);

  const productsByAgentDate = useMemo(() => {
    const map: Record<string, ProductSummaryRow[]> = {};

    const grouped: Record<string, Sale[]> = {};
    selectedSales.forEach(item => {
      const dateKey = parseSaleDate(item.дата) || '';
      const key = `${item.агент || 'Без торгового представника'}||${dateKey}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([key, rows]) => {
      map[key] = aggregateProductsFromSales(rows);
    });

    return map;
  }, [selectedSales]);

  const format = (n: number) => numberFormatter.format(n);

  const uniqueDepartments = useMemo(
    () => [...new Set(data.map(d => d.відділ).filter(Boolean))],
    [data]
  );

  const uniqueAgents = useMemo(() => {
    return [...new Set(data.map(d => d.агент).filter(Boolean))];
  }, [data]);

  const shouldShowStores = showStores;
  const shouldShowHierarchy = showByDepartments || showByAgents;

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
    const fileName = `продажі_${agent}_${fromPart}_${toPart}.xlsx`;

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
              showDepartment={!isSupervisor && !isAgent}
              showAgent={!isAgent}
              representativeLabel={ownRepresentative}
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
                    className={`${styles.brandChip} ${showProducts ? styles.brandChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showProducts}
                      onChange={e => setShowProducts(e.target.checked)}
                    />
                    <span>З товаром</span>
                  </label>

                  <label
                    className={`${styles.brandChip} ${showByDates ? styles.brandChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showByDates}
                      onChange={e => setShowByDates(e.target.checked)}
                    />
                    <span>По датам</span>
                  </label>

                  <label
                    className={`${styles.brandChip} ${showByDepartments ? styles.brandChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showByDepartments}
                      onChange={e => setShowByDepartments(e.target.checked)}
                    />
                    <span>По відділам</span>
                  </label>

                  <label
                    className={`${styles.brandChip} ${showByAgents ? styles.brandChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={showByAgents}
                      onChange={e => setShowByAgents(e.target.checked)}
                    />
                    <span>По торговим представникам</span>
                  </label>
                </div>

                {shouldShowStores && (
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Пошук ТТ"
                    ariaLabel="Пошук торгової точки"
                  />
                )}
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

                  <label
                    className={`${styles.brandChip} ${styles.brandChipAll} ${isOrimiBrandSelectionActive ? styles.brandChipAllActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.brandChipCheckbox}
                      checked={isOrimiBrandSelectionActive}
                      onChange={() => setSelectedBrands(orimiBrandSelection)}
                    />
                    <span>Усі ТМ Orimi</span>
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

          {shouldShowStores && (
            <div className={styles.subBlock}>
              <div className={styles.subHeader}>
                <h3 className={styles.subTitle}>
                  ТТ ({filteredStores.length})
                </h3>
              </div>

              <div className={styles.storeList}>
                {filteredStores.map(({ name, sum, sku, products, dates }) => (
                  <div key={name} className={styles.storeCard}>
                    <div className={styles.storeRow}>
                      <span className={styles.storeName}>{name}</span>
                      <span className={styles.storeAmountBlock}>
                        <span className={styles.storeSum}>
                          {storesWithPhotos.has(name) && (
                            <span className={styles.storeStar}>★</span>
                          )}
                          {format(sum)}
                        </span>
                      </span>
                      {showProducts && (
                        <span className={styles.storeSku}>SKU: {sku}</span>
                      )}
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
                                {showProducts ? `SKU: ${dateGroup.sku}` : ''}
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

          {shouldShowHierarchy && (
            <div className={styles.subBlock}>
              <div className={styles.subHeader}>
                <h3 className={styles.subTitle}>
                  Ієрархія ({prioritizedHierarchy.length})
                </h3>
              </div>

              <div className={styles.storeList}>
                {showByDepartments
                  ? prioritizedHierarchy.map(departmentRow => (
                      <div
                        key={departmentRow.name}
                        className={styles.storeCard}
                      >
                        <div className={styles.storeRow}>
                          <span className={styles.storeName}>
                            {departmentRow.name}
                          </span>
                          <span className={styles.storeAmountBlock}>
                            <span className={styles.storeSum}>
                              {format(departmentRow.sum)}
                            </span>
                          </span>
                          {showStores && (
                            <span className={styles.storeSku}>
                              ТТ: {departmentRow.stores}
                            </span>
                          )}
                          {showProducts && (
                            <span className={styles.storeSku}>
                              SKU: {departmentRow.sku}
                            </span>
                          )}
                          <span className={styles.storeSku}>
                            Вага: {format(departmentRow.weight)}
                          </span>
                          <span className={styles.storeSku}>
                            К-сть: {format(departmentRow.quantity)}
                          </span>
                        </div>

                        {!showByAgents &&
                          (showByDates ? (
                            <div className={styles.dateGroupList}>
                              {(
                                datesByDepartment[departmentRow.name] ?? []
                              ).map(dateRow => {
                                const dateProducts =
                                  productsByDepartmentDate[
                                    `${departmentRow.name}||${dateRow.key}`
                                  ] ?? [];

                                return (
                                  <div
                                    key={`${departmentRow.name}-${dateRow.key || 'no-date'}`}
                                    className={styles.dateGroup}
                                  >
                                    <div className={styles.dateGroupRow}>
                                      <span className={styles.dateGroupLabel}>
                                        {dateRow.label}
                                      </span>
                                      <span
                                        className={styles.dateGroupMetaItem}
                                      >
                                        К-сть: {format(dateRow.quantity)}
                                      </span>
                                      <span
                                        className={styles.dateGroupMetaItem}
                                      >
                                        Сума: {format(dateRow.sum)}
                                      </span>
                                      <span
                                        className={styles.dateGroupMetaItem}
                                      >
                                        Вага: {format(dateRow.weight)}
                                      </span>
                                      {showProducts && (
                                        <span
                                          className={styles.dateGroupMetaItem}
                                        >
                                          SKU: {dateRow.sku}
                                        </span>
                                      )}
                                    </div>

                                    {showStores && (
                                      <ul className={styles.productList}>
                                        {dateRow.stores.map(storeRow => (
                                          <li
                                            key={`${departmentRow.name}-${dateRow.key || 'no-date'}-${storeRow.name}`}
                                            className={styles.productItem}
                                          >
                                            <span
                                              className={styles.productName}
                                            >
                                              {storeRow.name}
                                            </span>
                                            <span
                                              className={styles.productMeta}
                                            >
                                              <span
                                                className={styles.productQty}
                                              >
                                                {format(storeRow.quantity)}
                                              </span>
                                              <span
                                                className={styles.productAmount}
                                              >
                                                {format(storeRow.sum)}
                                              </span>
                                              <span
                                                className={styles.productPrice}
                                              >
                                                Вага: {format(storeRow.weight)}
                                              </span>
                                              {showProducts && (
                                                <span
                                                  className={
                                                    styles.productPrice
                                                  }
                                                >
                                                  SKU: {storeRow.sku}
                                                </span>
                                              )}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}

                                    {showProducts &&
                                      !showStores &&
                                      dateProducts.length > 0 && (
                                        <ul className={styles.productList}>
                                          {dateProducts.map(product => (
                                            <li
                                              key={`${departmentRow.name}-${dateRow.key || 'no-date'}-${product.name}`}
                                              className={styles.productItem}
                                            >
                                              <span
                                                className={styles.productName}
                                              >
                                                {product.name}
                                              </span>
                                              <span
                                                className={styles.productMeta}
                                              >
                                                <span
                                                  className={styles.productQty}
                                                >
                                                  {format(product.quantity)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.productAmount
                                                  }
                                                >
                                                  {format(product.amount)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.productPrice
                                                  }
                                                >
                                                  Вага: {format(product.weight)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.productPrice
                                                  }
                                                >
                                                  ТТ: {product.tt}
                                                </span>
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            showProducts && (
                              <ul className={styles.productList}>
                                {(
                                  productsByDepartment[departmentRow.name] ?? []
                                ).map(product => (
                                  <li
                                    key={`${departmentRow.name}-${product.name}`}
                                    className={styles.productItem}
                                  >
                                    <span className={styles.productName}>
                                      {product.name}
                                    </span>
                                    <span className={styles.productMeta}>
                                      <span className={styles.productQty}>
                                        {format(product.quantity)}
                                      </span>
                                      <span className={styles.productAmount}>
                                        {format(product.amount)}
                                      </span>
                                      <span className={styles.productPrice}>
                                        Вага: {format(product.weight)}
                                      </span>
                                      <span className={styles.productPrice}>
                                        ТТ: {product.tt}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )
                          ))}

                        {showByAgents && (
                          <div className={styles.dateGroupList}>
                            {departmentRow.agents.map(agentRow => {
                              const stores = aggregateStoresFromDates(
                                agentRow.dates
                              );
                              const agentProducts =
                                productsByDeptAgent[
                                  `${departmentRow.name}||${agentRow.name}`
                                ] ?? [];

                              return (
                                <div
                                  key={`${departmentRow.name}-${agentRow.name}`}
                                  className={styles.dateGroup}
                                >
                                  <div className={styles.dateGroupRow}>
                                    <span className={styles.dateGroupLabel}>
                                      {agentRow.name}
                                    </span>
                                    <span className={styles.dateGroupMetaItem}>
                                      К-сть: {format(agentRow.quantity)}
                                    </span>
                                    <span className={styles.dateGroupMetaItem}>
                                      Сума: {format(agentRow.sum)}
                                    </span>
                                    <span className={styles.dateGroupMetaItem}>
                                      Вага: {format(agentRow.weight)}
                                    </span>
                                    {showStores && (
                                      <span
                                        className={styles.dateGroupMetaItem}
                                      >
                                        ТТ: {agentRow.stores}
                                      </span>
                                    )}
                                  </div>

                                  {showByDates ? (
                                    <div className={styles.dateGroupList}>
                                      {agentRow.dates.map(dateRow =>
                                        (() => {
                                          const dateProducts =
                                            productsByDeptAgentDate[
                                              `${departmentRow.name}||${agentRow.name}||${dateRow.key}`
                                            ] ?? [];

                                          return (
                                            <div
                                              key={`${departmentRow.name}-${agentRow.name}-${dateRow.key || 'no-date'}`}
                                              className={styles.dateGroup}
                                            >
                                              <div
                                                className={styles.dateGroupRow}
                                              >
                                                <span
                                                  className={
                                                    styles.dateGroupLabel
                                                  }
                                                >
                                                  {dateRow.label}
                                                </span>
                                                <span
                                                  className={
                                                    styles.dateGroupMetaItem
                                                  }
                                                >
                                                  К-сть:{' '}
                                                  {format(dateRow.quantity)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.dateGroupMetaItem
                                                  }
                                                >
                                                  Сума: {format(dateRow.sum)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.dateGroupMetaItem
                                                  }
                                                >
                                                  Вага: {format(dateRow.weight)}
                                                </span>
                                                {showProducts && (
                                                  <span
                                                    className={
                                                      styles.dateGroupMetaItem
                                                    }
                                                  >
                                                    SKU: {dateRow.sku}
                                                  </span>
                                                )}
                                              </div>

                                              {showStores && (
                                                <ul
                                                  className={styles.productList}
                                                >
                                                  {dateRow.stores.map(
                                                    storeRow => (
                                                      <li
                                                        key={`${departmentRow.name}-${agentRow.name}-${dateRow.key || 'no-date'}-${storeRow.name}`}
                                                        className={
                                                          styles.productItem
                                                        }
                                                      >
                                                        <span
                                                          className={
                                                            styles.productName
                                                          }
                                                        >
                                                          {storeRow.name}
                                                        </span>
                                                        <span
                                                          className={
                                                            styles.productMeta
                                                          }
                                                        >
                                                          <span
                                                            className={
                                                              styles.productQty
                                                            }
                                                          >
                                                            {format(
                                                              storeRow.quantity
                                                            )}
                                                          </span>
                                                          <span
                                                            className={
                                                              styles.productAmount
                                                            }
                                                          >
                                                            {format(
                                                              storeRow.sum
                                                            )}
                                                          </span>
                                                          <span
                                                            className={
                                                              styles.productPrice
                                                            }
                                                          >
                                                            Вага:{' '}
                                                            {format(
                                                              storeRow.weight
                                                            )}
                                                          </span>
                                                          {showProducts && (
                                                            <span
                                                              className={
                                                                styles.productPrice
                                                              }
                                                            >
                                                              SKU:{' '}
                                                              {storeRow.sku}
                                                            </span>
                                                          )}
                                                        </span>
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              )}

                                              {showProducts &&
                                                !showStores &&
                                                dateProducts.length > 0 && (
                                                  <ul
                                                    className={
                                                      styles.productList
                                                    }
                                                  >
                                                    {dateProducts.map(
                                                      product => (
                                                        <li
                                                          key={`${departmentRow.name}-${agentRow.name}-${dateRow.key || 'no-date'}-${product.name}`}
                                                          className={
                                                            styles.productItem
                                                          }
                                                        >
                                                          <span
                                                            className={
                                                              styles.productName
                                                            }
                                                          >
                                                            {product.name}
                                                          </span>
                                                          <span
                                                            className={
                                                              styles.productMeta
                                                            }
                                                          >
                                                            <span
                                                              className={
                                                                styles.productQty
                                                              }
                                                            >
                                                              {format(
                                                                product.quantity
                                                              )}
                                                            </span>
                                                            <span
                                                              className={
                                                                styles.productAmount
                                                              }
                                                            >
                                                              {format(
                                                                product.amount
                                                              )}
                                                            </span>
                                                            <span
                                                              className={
                                                                styles.productPrice
                                                              }
                                                            >
                                                              Вага:{' '}
                                                              {format(
                                                                product.weight
                                                              )}
                                                            </span>
                                                            <span
                                                              className={
                                                                styles.productPrice
                                                              }
                                                            >
                                                              ТТ: {product.tt}
                                                            </span>
                                                          </span>
                                                        </li>
                                                      )
                                                    )}
                                                  </ul>
                                                )}
                                            </div>
                                          );
                                        })()
                                      )}
                                    </div>
                                  ) : (
                                    showStores &&
                                    stores.length > 0 && (
                                      <ul className={styles.productList}>
                                        {stores.map(storeRow => (
                                          <li
                                            key={`${departmentRow.name}-${agentRow.name}-${storeRow.name}`}
                                            className={styles.productItem}
                                          >
                                            <span
                                              className={styles.productName}
                                            >
                                              {storeRow.name}
                                            </span>
                                            <span
                                              className={styles.productMeta}
                                            >
                                              <span
                                                className={styles.productQty}
                                              >
                                                {format(storeRow.quantity)}
                                              </span>
                                              <span
                                                className={styles.productAmount}
                                              >
                                                {format(storeRow.sum)}
                                              </span>
                                              <span
                                                className={styles.productPrice}
                                              >
                                                Вага: {format(storeRow.weight)}
                                              </span>
                                              {showProducts && (
                                                <span
                                                  className={
                                                    styles.productPrice
                                                  }
                                                >
                                                  SKU: {storeRow.sku}
                                                </span>
                                              )}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )
                                  )}

                                  {showProducts &&
                                    !showByDates &&
                                    !showStores &&
                                    agentProducts.length > 0 && (
                                      <ul className={styles.productList}>
                                        {agentProducts.map(product => (
                                          <li
                                            key={`${departmentRow.name}-${agentRow.name}-${product.name}`}
                                            className={styles.productItem}
                                          >
                                            <span
                                              className={styles.productName}
                                            >
                                              {product.name}
                                            </span>
                                            <span
                                              className={styles.productMeta}
                                            >
                                              <span
                                                className={styles.productQty}
                                              >
                                                {format(product.quantity)}
                                              </span>
                                              <span
                                                className={styles.productAmount}
                                              >
                                                {format(product.amount)}
                                              </span>
                                              <span
                                                className={styles.productPrice}
                                              >
                                                Вага: {format(product.weight)}
                                              </span>
                                              <span
                                                className={styles.productPrice}
                                              >
                                                ТТ: {product.tt}
                                              </span>
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  : showByAgents &&
                    prioritizedAgents.map(agentRow => {
                      const stores = aggregateStoresFromDates(agentRow.dates);
                      const agentProducts =
                        productsByAgent[agentRow.name] ?? [];

                      return (
                        <div
                          key={`${agentRow.departmentName}-${agentRow.name}`}
                          className={styles.storeCard}
                        >
                          <div className={styles.storeRow}>
                            <span className={styles.storeName}>
                              {agentRow.name}
                            </span>
                            <span className={styles.storeAmountBlock}>
                              <span className={styles.storeSum}>
                                {format(agentRow.sum)}
                              </span>
                            </span>
                            {showStores && (
                              <span className={styles.storeSku}>
                                ТТ: {agentRow.stores}
                              </span>
                            )}
                            <span className={styles.storeSku}>
                              Вага: {format(agentRow.weight)}
                            </span>
                            <span className={styles.storeSku}>
                              К-сть: {format(agentRow.quantity)}
                            </span>
                          </div>
                          <div className={styles.dateGroupRow}>
                            <span className={styles.dateGroupMetaItem}>
                              Відділ: {agentRow.departmentName}
                            </span>
                          </div>

                          {showByDates ? (
                            <div className={styles.dateGroupList}>
                              {agentRow.dates.map(dateRow =>
                                (() => {
                                  const dateProducts =
                                    productsByAgentDate[
                                      `${agentRow.name}||${dateRow.key}`
                                    ] ?? [];

                                  return (
                                    <div
                                      key={`${agentRow.departmentName}-${agentRow.name}-${dateRow.key || 'no-date'}`}
                                      className={styles.dateGroup}
                                    >
                                      <div className={styles.dateGroupRow}>
                                        <span className={styles.dateGroupLabel}>
                                          {dateRow.label}
                                        </span>
                                        <span
                                          className={styles.dateGroupMetaItem}
                                        >
                                          К-сть: {format(dateRow.quantity)}
                                        </span>
                                        <span
                                          className={styles.dateGroupMetaItem}
                                        >
                                          Сума: {format(dateRow.sum)}
                                        </span>
                                        <span
                                          className={styles.dateGroupMetaItem}
                                        >
                                          Вага: {format(dateRow.weight)}
                                        </span>
                                        {showProducts && (
                                          <span
                                            className={styles.dateGroupMetaItem}
                                          >
                                            SKU: {dateRow.sku}
                                          </span>
                                        )}
                                      </div>

                                      {showStores && (
                                        <ul className={styles.productList}>
                                          {dateRow.stores.map(storeRow => (
                                            <li
                                              key={`${agentRow.departmentName}-${agentRow.name}-${dateRow.key || 'no-date'}-${storeRow.name}`}
                                              className={styles.productItem}
                                            >
                                              <span
                                                className={styles.productName}
                                              >
                                                {storeRow.name}
                                              </span>
                                              <span
                                                className={styles.productMeta}
                                              >
                                                <span
                                                  className={styles.productQty}
                                                >
                                                  {format(storeRow.quantity)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.productAmount
                                                  }
                                                >
                                                  {format(storeRow.sum)}
                                                </span>
                                                <span
                                                  className={
                                                    styles.productPrice
                                                  }
                                                >
                                                  Вага:{' '}
                                                  {format(storeRow.weight)}
                                                </span>
                                                {showProducts && (
                                                  <span
                                                    className={
                                                      styles.productPrice
                                                    }
                                                  >
                                                    SKU: {storeRow.sku}
                                                  </span>
                                                )}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}

                                      {showProducts &&
                                        !showStores &&
                                        dateProducts.length > 0 && (
                                          <ul className={styles.productList}>
                                            {dateProducts.map(product => (
                                              <li
                                                key={`${agentRow.departmentName}-${agentRow.name}-${dateRow.key || 'no-date'}-${product.name}`}
                                                className={styles.productItem}
                                              >
                                                <span
                                                  className={styles.productName}
                                                >
                                                  {product.name}
                                                </span>
                                                <span
                                                  className={styles.productMeta}
                                                >
                                                  <span
                                                    className={
                                                      styles.productQty
                                                    }
                                                  >
                                                    {format(product.quantity)}
                                                  </span>
                                                  <span
                                                    className={
                                                      styles.productAmount
                                                    }
                                                  >
                                                    {format(product.amount)}
                                                  </span>
                                                  <span
                                                    className={
                                                      styles.productPrice
                                                    }
                                                  >
                                                    Вага:{' '}
                                                    {format(product.weight)}
                                                  </span>
                                                  <span
                                                    className={
                                                      styles.productPrice
                                                    }
                                                  >
                                                    ТТ: {product.tt}
                                                  </span>
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          ) : (
                            showStores &&
                            stores.length > 0 && (
                              <ul className={styles.productList}>
                                {stores.map(storeRow => (
                                  <li
                                    key={`${agentRow.departmentName}-${agentRow.name}-${storeRow.name}`}
                                    className={styles.productItem}
                                  >
                                    <span className={styles.productName}>
                                      {storeRow.name}
                                    </span>
                                    <span className={styles.productMeta}>
                                      <span className={styles.productQty}>
                                        {format(storeRow.quantity)}
                                      </span>
                                      <span className={styles.productAmount}>
                                        {format(storeRow.sum)}
                                      </span>
                                      <span className={styles.productPrice}>
                                        Вага: {format(storeRow.weight)}
                                      </span>
                                      {showProducts && (
                                        <span className={styles.productPrice}>
                                          SKU: {storeRow.sku}
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )
                          )}

                          {showProducts &&
                            !showByDates &&
                            !showStores &&
                            agentProducts.length > 0 && (
                              <ul className={styles.productList}>
                                {agentProducts.map(product => (
                                  <li
                                    key={`${agentRow.departmentName}-${agentRow.name}-${product.name}`}
                                    className={styles.productItem}
                                  >
                                    <span className={styles.productName}>
                                      {product.name}
                                    </span>
                                    <span className={styles.productMeta}>
                                      <span className={styles.productQty}>
                                        {format(product.quantity)}
                                      </span>
                                      <span className={styles.productAmount}>
                                        {format(product.amount)}
                                      </span>
                                      <span className={styles.productPrice}>
                                        Вага: {format(product.weight)}
                                      </span>
                                      <span className={styles.productPrice}>
                                        ТТ: {product.tt}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      );
                    })}
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
