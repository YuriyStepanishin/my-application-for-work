import { useState } from 'react';
import bg from '../../assets/screensaver.png';
import styles from './HomePage.module.css';
import Popup from '../../components/Popup/Popup';

interface Props {
  onOpenDisplay: () => void;
  onOpenBonus: () => void;
  onOpenGallery: () => void;
  onOpenSales: () => void;
  onOpenSalesByDays: () => void;
}

export default function HomePage({
  onOpenDisplay,
  onOpenBonus,
  onOpenGallery,
  onOpenSales,
  onOpenSalesByDays,
}: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const topMenuItems = [
    {
      key: 'sales',
      label: 'Продажі',
      icon: '/icons/chart-icon-64.svg',
      onClick: onOpenSales,
    },
    {
      key: 'gallery',
      label: 'Фотогалерея',
      icon: './icons/gallery-icon-64.svg',
      onClick: onOpenGallery,
    },
    {
      key: 'sales-by-days',
      label: 'Продажі по днях',
      icon: '/icons/calendar-icon-64.svg',
      onClick: onOpenSalesByDays,
    },
  ];

  const bottomMenuItems = [
    {
      key: 'bonus',
      label: 'Додавання фотозвіту',
      icon: './icons/camera-icon-64.svg',
      onClick: onOpenBonus,
    },
    {
      key: 'display',
      label: 'Додавання фотозвіту для Акція на представленність',
      icon: '/icons/promo-icon-64.svg',
      onClick: onOpenDisplay,
    },
    {
      key: 'messages',
      label: 'Повідомлення',
      icon: '/icons/message-icon-64.svg',
      onClick: () => setShowPopup(true),
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

      {/* навігація */}
      <div className={styles.buttonContainer}>
        <p className={styles.sidebarTitle}>Розділи</p>
        <div className={styles.topGroup}>
          {topMenuItems.map(item => (
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

        <div className={styles.bottomGroup}>
          {bottomMenuItems.map(item => (
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

      {/* popup (виносимо за контейнер кнопок) */}
      {showPopup && (
        <Popup message="В розробці" onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}
