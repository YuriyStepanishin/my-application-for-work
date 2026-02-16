import styles from './ReportPage.module.css';

interface Props {
  email: string;

  onLogout: () => void;

  onOk: () => void;
}

export default function ReportPage({
  email,

  onLogout,

  onOk,
}: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2>Вітаю 👋</h2>

        <div>
          Ви увійшли як:
          <div className={styles.email}>{email}</div>
        </div>

        <div className={styles.info}>
          <button className={styles.ok} onClick={onOk}>
            Далі
          </button>

          <button className={styles.logout} onClick={onLogout}>
            Вийти
          </button>
        </div>
      </div>
    </div>
  );
}
