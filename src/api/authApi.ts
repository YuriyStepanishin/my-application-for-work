import { API_URL } from './config';

export async function sendCode(email: string) {
  const res = await fetch(API_URL, {
    method: 'POST',

    body: JSON.stringify({
      action: 'sendCode',
      email,
    }),
  });

  return res.json();
}

export async function verifyCode(email: string, code: string) {
  const res = await fetch(API_URL, {
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
