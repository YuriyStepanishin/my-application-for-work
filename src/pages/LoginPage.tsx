import { useState } from 'react';

import styles from './LoginPage.module.css';

import { sendCode } from '../api/authApi';

interface Props {
  onCodeSent: (email: string) => void;
}

export default function LoginPage({ onCodeSent }: Props) {
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!email) {
      alert('Введіть email');
      return;
    }

    try {
      setLoading(true);

      const res = await sendCode(email);

      if (res.success) {
        onCodeSent(email);
      } else {
        alert('Доступ заборонено');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>Вхід у систему</div>

        <input
          type="email"
          placeholder="Введіть email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={styles.input}
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className={styles.button}
        >
          {loading ? 'Надсилання...' : 'Отримати код'}
        </button>
      </div>
    </div>
  );
}
