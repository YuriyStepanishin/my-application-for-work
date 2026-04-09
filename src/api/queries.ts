import { useQuery } from '@tanstack/react-query';
import { fetchSheetData, fetchBonusSheetData } from './sheetApi';

export const useDisplaySheet = (enabled = true) => {
  return useQuery({
    queryKey: ['displaySheet'],
    queryFn: fetchSheetData,
    enabled,
  });
};

export const useBonusSheet = (enabled = true) => {
  return useQuery({
    queryKey: ['bonusSheet'],
    queryFn: fetchBonusSheetData,
    enabled,
  });
};
