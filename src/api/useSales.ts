import { useQuery } from '@tanstack/react-query';
import { SALES_URL } from '../api/config';

export const useSales = () => {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await fetch(SALES_URL);

      if (!res.ok) {
        throw new Error('Помилка завантаження продажів');
      }

      return res.json();
    },
  });
};
