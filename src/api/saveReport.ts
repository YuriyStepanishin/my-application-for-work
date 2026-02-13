const API_URL =
  'https://script.google.com/macros/s/AKfycbzT-uh2UolI-DkWNaN6koptrFtKOP-9N8VmhdquPQPPThZRCKF3CrtAVAg0chPtLjZM/exec';

export async function saveReport(data: {
  department: string;
  representative: string;
  store: string;
  startDate: string;
  endDate: string;
  comment: string;
  photos: File[];
}) {
  const formData = new FormData();

  formData.append('department', data.department);
  formData.append('representative', data.representative);
  formData.append('store', data.store);
  formData.append('startDate', data.startDate);
  formData.append('endDate', data.endDate);
  formData.append('comment', data.comment);

  data.photos.forEach((photo, i) => {
    formData.append(`photo${i}`, photo);
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}
