import styles from './MessagesPage.module.css';

interface Props {
  userEmail: string;
  onBack: () => void;
  messagesCenter: unknown;
}

export default function MessagesPage({
  onBack,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← Назад
        </button>
        <h1 className={styles.title}>Повідомлення</h1>
      </div>
      <div className={styles.placeholder}>
        <p>В розробці</p>
      </div>
    </div>
  );
}
