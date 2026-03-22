import { useState } from 'react';
import styles from './LoginPage.module.css';
import { allowedEmails } from '../../config/allowedEmails';

interface Props {
  onSuccess: (email: string) => void;
  embedded?: boolean;
}

export default function LoginPage({ onSuccess, embedded = false }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (allowedEmails.includes(normalizedEmail)) {
      onSuccess(normalizedEmail);
    } else {
      setError('Email не має доступу');
    }
  };

  const content = (
    <div className={`${styles.card} ${embedded ? styles.embeddedCard : ''}`}>
      {embedded && <h3 className={styles.panelTitle}>Вхід в акаунт</h3>}

      <input
        className={styles.input}
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
      />

      <button className={styles.button} onClick={handleLogin}>
        Увійти
      </button>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className={styles.wrapper}>{content}</div>;
}
