import { useQuery } from '@tanstack/react-query';
import { fetchSheetData, fetchBonusSheetData } from './sheetApi';
import { fetchReports } from './fetchReports';

export const useDisplaySheet = () => {
  return useQuery({
    queryKey: ['displaySheet'],
    queryFn: fetchSheetData,
  });
};

export const useBonusSheet = () => {
  return useQuery({
    queryKey: ['bonusSheet'],
    queryFn: fetchBonusSheetData,
  });
};
export const useReports = () => {
  return useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });
};
