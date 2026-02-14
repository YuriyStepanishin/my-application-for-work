import { useState } from 'react';

import styles from './LoginPage.module.css';

const API =
  'https://script.google.com/macros/s/AKfycbyrHvJ1ZfOP-zDohBFS080KJGRHD4YyRmmiXhNI5airMrz9HW0p_0jHBLue5N9G_2mG/exec';

interface Props {
  email: string;
  onSuccess: () => void;
}

async function verifyCode(email: string, code: string) {
  const res = await fetch(API, {
    method: 'POST',

    headers: {
      'Content-Type': 'text/plain',
    },

    body: JSON.stringify({
      action: 'verifyCode',
      email: email.toLowerCase().trim(),
      code,
    }),
  });

  return res.json();
}

export default function VerifyCodePage({ email, onSuccess }: Props) {
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (!code) {
      alert('Введіть код');
      return;
    }

    try {
      setLoading(true);

      const res = await verifyCode(email, code);

      if (res.success) {
        localStorage.setItem('auth', email);

        onSuccess();
      } else {
        alert('Невірний код');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>Введіть код з email</div>

        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="123456"
          className={styles.input}
        />

        <button
          onClick={handleVerify}
          disabled={loading}
          className={styles.button}
        >
          {loading ? 'Перевірка...' : 'Увійти'}
        </button>
      </div>
    </div>
  );
}
