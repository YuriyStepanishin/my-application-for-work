import { useState } from 'react';
import styles from './LoginPage.module.css';
import { allowedEmails } from '../config/allowedEmails';

interface Props {
  onSuccess: (email: string) => void;
}

export default function LoginPage({ onSuccess }: Props) {
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

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
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
    </div>
  );
}
