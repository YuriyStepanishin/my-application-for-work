const API =
  'https://script.google.com/macros/s/AKfycbzQNG_Ykf0zfBbT09kr-4iDBbcwCWm-G5oC2s3EaIOFWHcxaZZCavYlAKaP8pwiygmz/exec';

export async function sendCode(email: string) {
  const res = await fetch(API, {
    method: 'POST',

    body: JSON.stringify({
      action: 'sendCode',
      email,
    }),
  });

  return res.json();
}

export async function verifyCode(email: string, code: string) {
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
