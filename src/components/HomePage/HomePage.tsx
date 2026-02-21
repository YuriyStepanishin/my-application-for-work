import { useState } from 'react';
import bg from '../../assets/tea_coffee.png';
import styles from './HomePage.module.css';
import Popup from '../../components/Popup/Popup';

interface Props {
  onOpenDisplay: () => void;
  onOpenBonus: () => void;
}

export default function HomePage({ onOpenDisplay, onOpenBonus }: Props) {
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
          Показники роботи
        </button>

        {/* кнопка 2 */}
        <button onClick={onOpenDisplay} className={styles.button}>
          Акція вітрини
        </button>

        <button onClick={onOpenBonus} className={styles.button}>
          Фотозвіти ТП (бонус)
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
