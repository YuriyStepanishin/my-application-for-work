import styles from './Popup.module.css';

type Props = {
  message: string;
  onClose: () => void;
};

export default function Popup({ message, onClose }: Props) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.popup}>
        <div className={styles.message}>{message}</div>
        <button type="button" className={styles.button} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
