const API_URL =
  'https://script.google.com/macros/s/AKfycbyNg3tnDGAFGVZE7KRahpV3B3SZIw6hTGvkkR1xnHO220HqVe_PvDpJzpfVV6CVpose/exec';

export async function addStore(data: {
  department: string;
  representative: string;
  store: string;
}) {
  const res = await fetch(API_URL, {
    method: 'POST',

    body: JSON.stringify({
      action: 'addStore',
      ...data,
    }),
  });

  return res.json();
}
