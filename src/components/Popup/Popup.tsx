import styles from './Popup.module.css';

interface Props {
  message: string;
  onClose: () => void;
}

export default function Popup({ message, onClose }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <p>{message}</p>

        <button onClick={onClose} className={styles.button}>
          OK
        </button>
      </div>
    </div>
  );
}
