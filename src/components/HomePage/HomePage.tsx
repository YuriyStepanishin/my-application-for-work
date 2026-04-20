import bg from '../../assets/screensaver.png';
import styles from './HomePage.module.css';

interface Props {
  onOpenDisplay: () => void;
  onOpenBonus: () => void;
  onOpenGallery: () => void;
  onOpenSales: () => void;
  onOpenRouteHistory: () => void;
  onOpenActiveCustomerBase: () => void;
  onOpenImplementation: () => void;
  onOpenMessages: () => void;
  unreadMessagesCount: number;
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
  onOpenMessages,
  unreadMessagesCount,
  canOpenDisplayReport,
  canOpenBonusReport,
  canOpenGallery,
  canOpenSales,
  canOpenRouteHistory,
  canOpenActiveCustomerBase,
  canOpenImplementation,
  canOpenMessages,
}: Props) {
  const handleRefreshApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    }

    window.location.reload();
  };

  const topMenuItems = [
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
      icon: './icons/gallery-icon-64.svg',
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
      label: 'Повідомлення',
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
  ];

  const bottomMenuItems = [
    {
      key: 'bonus',
      label: 'Додавання фотозвіту',
      icon: './icons/camera-icon-64.svg',
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
      <img src={bg} className={styles.background} />

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
        <span>Оновити v2.4.0</span>
      </button>

      {/* навігація */}
      <div className={styles.buttonContainer}>
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
                <img src={item.icon} className={styles.icon} />
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
                <img src={item.icon} className={styles.icon} />
                <span className={styles.menuLabel}>{item.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* footer */}
      <footer className={styles.footer}>
        <span>© 2026</span>
        <span>v{__APP_VERSION__}</span>
      </footer>
    </div>
  );
}
