import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSales, type Sale } from '../../api/fetchSales';
import { fetchReports, type Report } from '../../api/fetchReports';
import styles from './HomePage.module.css';

type MenuItem = {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  visible: boolean;
  badge?: number | null;
};

type TopClientRow = {
  name: string;
  value: number;
};

type TopProductRow = {
  name: string;
  quantity: number;
  value: number;
};

function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;

  const monthNames = [
    'січень',
    'лютий',
    'березень',
    'квітень',
    'травень',
    'червень',
    'липень',
    'серпень',
    'вересень',
    'жовтень',
    'листопад',
    'грудень',
  ];

  const monthIndex = Number(match[2]) - 1;
  const monthName = monthNames[monthIndex] || match[2];
  return `${monthName} ${match[1]}`;
}

function parseSaleDateKey(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';

  const dmy = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

interface Props {
  onOpenDisplay: () => void;
  onOpenBonus: () => void;
  onOpenGallery: () => void;
  onOpenSales: () => void;
  onOpenRouteHistory: () => void;
  onOpenActiveCustomerBase: () => void;
  onOpenImplementation: () => void;
  onOpenStoreCheck: () => void;
  onOpenStoreCheckReview: () => void;
  onOpenMessages: () => void;
  unreadMessagesCount: number;
  onOpenPlanTargets: () => void;
  canOpenPlanTargets: boolean;
  canOpenDisplayReport: boolean;
  canOpenBonusReport: boolean;
  canOpenGallery: boolean;
  canOpenSales: boolean;
  canOpenRouteHistory: boolean;
  canOpenActiveCustomerBase: boolean;
  canOpenImplementation: boolean;
  canOpenMessages: boolean;
}

export default function HomePage({
  onOpenDisplay,
  onOpenBonus,
  onOpenGallery,
  onOpenSales,
  onOpenRouteHistory,
  onOpenActiveCustomerBase,
  onOpenImplementation,
  onOpenStoreCheck,
  onOpenStoreCheckReview,
  onOpenMessages,
  unreadMessagesCount,
  onOpenPlanTargets,
  canOpenPlanTargets,
  canOpenDisplayReport,
  canOpenBonusReport,
  canOpenGallery,
  canOpenSales,
  canOpenRouteHistory,
  canOpenActiveCustomerBase,
  canOpenImplementation,
  canOpenMessages,
}: Props) {
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('uk-UA', {
        maximumFractionDigits: 0,
      }),
    []
  );

  const integerFormatter = useMemo(
    () =>
      new Intl.NumberFormat('uk-UA', {
        maximumFractionDigits: 0,
      }),
    []
  );

  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['home-sales-preview'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5,
  });

  const { data: photoReports = [] } = useQuery<Report[]>({
    queryKey: ['home-photo-reports-preview'],
    queryFn: fetchReports,
    staleTime: 1000 * 60 * 5,
  });

  const salesInsights = useMemo(() => {
    const currentMonthKey = getCurrentMonthKey();
    const storeAmount: Record<string, number> = {};
    const storeSkuSet: Record<string, Set<string>> = {};
    const productQuantity: Record<string, number> = {};
    const productAmount: Record<string, number> = {};
    const stores = new Set<string>();

    let totalAmount = 0;
    let monthlySalesRows = 0;

    sales.forEach(row => {
      const amount = row.сума || 0;
      const quantity = row.кількість || 0;
      const product = (row.товар || '').trim();
      const store = (row.торгова_точка || '').trim();
      const dateKey = parseSaleDateKey(row.дата || '');
      if (!dateKey || !dateKey.startsWith(currentMonthKey)) return;

      monthlySalesRows += 1;

      totalAmount += amount;

      if (store) {
        stores.add(store);
        storeAmount[store] = (storeAmount[store] || 0) + amount;
      }
      if (product) {
        productQuantity[product] = (productQuantity[product] || 0) + quantity;
        productAmount[product] = (productAmount[product] || 0) + amount;
      }
      if (store && product) {
        if (!storeSkuSet[store]) storeSkuSet[store] = new Set<string>();
        storeSkuSet[store].add(product);
      }
    });

    const topClients: TopClientRow[] = Object.entries(storeAmount)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const productStats: TopProductRow[] = Object.entries(productQuantity).map(
      ([name, quantity]) => ({
        name,
        quantity,
        value: productAmount[name] || 0,
      })
    );

    const topProductsByQuantity = productStats
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topProductsByAmount = [...productStats]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topClientsSku: TopClientRow[] = Object.entries(storeSkuSet)
      .map(([name, skuSet]) => ({ name, value: skuSet.size }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      currentMonthKey,
      totalAmount,
      storesCount: stores.size,
      salesCount: monthlySalesRows,
      topClients,
      topProductsByQuantity,
      topProductsByAmount,
      topClientsSku,
    };
  }, [sales]);

  const currentMonthLabel = formatMonthLabel(salesInsights.currentMonthKey);

  const photoReportsTtCount = useMemo(() => {
    const currentMonthKey = getCurrentMonthKey();
    const storesInReports = new Set<string>();

    photoReports.forEach(report => {
      const dateKey = parseSaleDateKey(report.date || '');
      if (!dateKey || !dateKey.startsWith(currentMonthKey)) return;

      const store = (report.store || '').trim();
      if (store) storesInReports.add(store);
    });

    return storesInReports.size;
  }, [photoReports]);

  const maxProductQty =
    salesInsights.topProductsByQuantity.length > 0
      ? Math.max(
          ...salesInsights.topProductsByQuantity.map(item => item.quantity),
          1
        )
      : 1;

  const maxProductAmount =
    salesInsights.topProductsByAmount.length > 0
      ? Math.max(
          ...salesInsights.topProductsByAmount.map(item => item.value),
          1
        )
      : 1;

  const maxClientAmount =
    salesInsights.topClients.length > 0
      ? Math.max(...salesInsights.topClients.map(item => item.value), 1)
      : 1;

  const maxClientSku =
    salesInsights.topClientsSku.length > 0
      ? Math.max(...salesInsights.topClientsSku.map(item => item.value), 1)
      : 1;

  const handleRefreshApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    }
    window.location.reload();
  };

  const topMenuItems: MenuItem[] = [
    {
      key: 'sales',
      label: 'Продажі',
      icon: '/icons/chart-icon-64.svg',
      onClick: onOpenSales,
      visible: canOpenSales,
    },
    {
      key: 'gallery',
      label: 'Фотогалерея',
      icon: '/icons/gallery-icon-64.svg',
      onClick: onOpenGallery,
      visible: canOpenGallery,
    },
    {
      key: 'sales-by-days',
      label: 'Історія продажів',
      icon: '/icons/ClientProduct.svg',
      onClick: onOpenRouteHistory,
      visible: canOpenRouteHistory,
    },
    {
      key: 'active-customer-base',
      label: 'Поточне АКБ',
      icon: '/icons/calendar-icon-64.svg',
      onClick: onOpenActiveCustomerBase,
      visible: canOpenActiveCustomerBase,
    },
    {
      key: 'messages',
      label: 'Дошка інформації',
      icon: '/icons/message-icon-64.svg',
      onClick: onOpenMessages,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      visible: canOpenMessages,
    },
    {
      key: 'implementation',
      label: 'Виконання показників',
      icon: '/icons/implementation.svg',
      onClick: onOpenImplementation,
      visible: canOpenImplementation,
    },
    {
      key: 'store-check-review',
      label: 'Перегляд StoreCheck',
      icon: '/icons/storecheck.svg',
      onClick: onOpenStoreCheckReview,
      visible: true,
    },
    {
      key: 'plan-targets',
      label: 'Планові показники',
      icon: '/icons/icons_planning.svg',
      onClick: onOpenPlanTargets,
      visible: canOpenPlanTargets,
    },
  ];

  const bottomMenuItems: MenuItem[] = [
    {
      key: 'bonus',
      label: 'Додавання фотозвіту',
      icon: '/icons/camera-icon-64.svg',
      onClick: onOpenBonus,
      visible: canOpenBonusReport,
    },
    {
      key: 'display',
      label: 'Додавання фотозвіту для Акція на представленність',
      icon: '/icons/promo-icon-64.svg',
      onClick: onOpenDisplay,
      visible: canOpenDisplayReport,
    },
    {
      key: 'store-check',
      label: 'Додавання StoreCheck',
      icon: '/icons/storecheck.svg',
      onClick: onOpenStoreCheck,
      visible: true,
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* фон */}
      <div className={styles.backgroundOverlay} aria-hidden="true" />

      <button
        type="button"
        className={styles.refreshButton}
        onClick={() => {
          void handleRefreshApp();
        }}
        aria-label="Оновити додаток"
        title="Оновити"
      >
        <span className={styles.refreshIcon} aria-hidden="true">
          ↻
        </span>
        <span className={styles.refreshText}>Оновити v{__APP_VERSION__}</span>
      </button>

      {/* навігація */}
      <div className={styles.buttonContainer}>
        <div className={styles.brandBlock}>
          <span className={styles.brandLogo}>S</span>
          <div className={styles.brandMeta}>
            <strong className={styles.brandName}>SODA</strong>
            <span className={styles.brandSub}>Головна панель</span>
          </div>
        </div>

        <p className={styles.sidebarTitle}>Розділи</p>
        <div className={styles.topGroup}>
          {topMenuItems
            .filter(item => item.visible)
            .map(item => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={styles.button}
              >
                {item.badge ? (
                  <span className={styles.badge}>{item.badge}</span>
                ) : null}
                <span className={styles.iconWrap}>
                  <img src={item.icon} className={styles.icon} />
                </span>
                <span className={styles.menuLabel}>{item.label}</span>
              </button>
            ))}
        </div>

        <div className={styles.bottomGroup}>
          {bottomMenuItems
            .filter(item => item.visible)
            .map(item => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={styles.button}
              >
                <span className={styles.iconWrap}>
                  <img src={item.icon} className={styles.icon} />
                </span>
                <span className={styles.menuLabel}>{item.label}</span>
              </button>
            ))}
        </div>
      </div>

      <main className={styles.dashboardArea}>
        <section className={styles.dashboardCard}>
          <h2 className={styles.dashboardTitle}>
            Найпопулярніші продажі ({currentMonthLabel})
          </h2>
          <div className={styles.kpiRow}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Сума продажів</span>
              <strong className={styles.kpiValue}>
                {moneyFormatter.format(salesInsights.totalAmount)} ₴
              </strong>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Активні ТТ</span>
              <strong className={styles.kpiValue}>
                {integerFormatter.format(salesInsights.storesCount)}
              </strong>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Кількість ТТ у фотозвітах</span>
              <strong className={styles.kpiValue}>
                {integerFormatter.format(photoReportsTtCount)}
              </strong>
            </div>
          </div>
        </section>

        <section className={styles.dashboardGrid}>
          <article className={styles.chartCard}>
            <h3 className={styles.chartTitle}>ТОП 10 клієнтів</h3>
            {salesLoading ? (
              <p className={styles.chartHint}>Завантаження...</p>
            ) : salesInsights.topClients.length === 0 ? (
              <p className={styles.chartHint}>Немає даних для графіка</p>
            ) : (
              <ul className={styles.barList}>
                {salesInsights.topClients.map(item => (
                  <li key={item.name} className={styles.barItem}>
                    <div className={styles.barMeta}>
                      <span className={styles.barName}>{item.name}</span>
                      <span className={styles.barValue}>
                        {moneyFormatter.format(item.value)} ₴
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${(item.value / maxClientAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Топ 10 товарів (шт)</h3>
            {salesLoading ? (
              <p className={styles.chartHint}>Завантаження...</p>
            ) : salesInsights.topProductsByQuantity.length === 0 ? (
              <p className={styles.chartHint}>Немає даних для графіка</p>
            ) : (
              <ul className={styles.barList}>
                {salesInsights.topProductsByQuantity.map(item => (
                  <li key={item.name} className={styles.barItem}>
                    <div className={styles.barMeta}>
                      <span className={styles.barName}>{item.name}</span>
                      <span className={styles.barValue}>
                        {integerFormatter.format(item.quantity)}
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillAlt}
                        style={{
                          width: `${(item.quantity / maxProductQty) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Топ 10 товарів (грн)</h3>
            {salesLoading ? (
              <p className={styles.chartHint}>Завантаження...</p>
            ) : salesInsights.topProductsByAmount.length === 0 ? (
              <p className={styles.chartHint}>Немає даних для графіка</p>
            ) : (
              <ul className={styles.barList}>
                {salesInsights.topProductsByAmount.map(item => (
                  <li key={item.name} className={styles.barItem}>
                    <div className={styles.barMeta}>
                      <span className={styles.barName}>{item.name}</span>
                      <span className={styles.barValue}>
                        {moneyFormatter.format(item.value)} ₴
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillAlt}
                        style={{
                          width: `${(item.value / maxProductAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.chartCard}>
            <h3 className={styles.chartTitle}>
              ТОП 10 клієнтів по кількості SKU
            </h3>
            {salesLoading ? (
              <p className={styles.chartHint}>Завантаження...</p>
            ) : salesInsights.topClientsSku.length === 0 ? (
              <p className={styles.chartHint}>Немає даних для графіка</p>
            ) : (
              <ul className={styles.barList}>
                {salesInsights.topClientsSku.map(item => (
                  <li key={item.name} className={styles.barItem}>
                    <div className={styles.barMeta}>
                      <span className={styles.barName}>{item.name}</span>
                      <span className={styles.barValue}>
                        {integerFormatter.format(item.value)} SKU
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillWarn}
                        style={{
                          width: `${(item.value / maxClientSku) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
