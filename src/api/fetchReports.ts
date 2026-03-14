export async function fetchReports() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}?action=getReports`);

  const json = await res.json();

  return json.data;
}
