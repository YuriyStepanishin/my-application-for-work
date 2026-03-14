import { useState } from 'react';
import bg from '../../assets/screensaver.png';
import styles from './HomePage.module.css';
import Popup from '../../components/Popup/Popup';

interface Props {
  onOpenDisplay: () => void;
  onOpenBonus: () => void;
  onOpenGallery: () => void;
}

export default function HomePage({
  onOpenDisplay,
  onOpenBonus,
  onOpenGallery,
}: Props) {
  const [showPopup, setShowPopup] = useState(false);

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

      {/* контейнер кнопок */}
      <div className={styles.buttonContainer}>
        {/* кнопка 1 */}
        <button onClick={() => setShowPopup(true)} className={styles.button}>
          <img src="/icons/chart-icon-64.svg" className={styles.icon} />
        </button>

        {/* кнопка 2 */}
        <button onClick={onOpenDisplay} className={styles.button}>
          <img src="/icons/promo-icon-64.svg" className={styles.icon} />
        </button>

        <button onClick={onOpenBonus} className={styles.button}>
          <img src="./icons/camera-icon-64.svg" className={styles.icon} />
        </button>
        <button onClick={onOpenGallery} className={styles.button}>
          <img src="./icons/gallery-icon-64.svg" className={styles.icon} />
        </button>
      </div>

      {/* popup (виносимо за контейнер кнопок) */}
      {showPopup && (
        <Popup
          message="Розділ 'Показники роботи' ще в розробці"
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
