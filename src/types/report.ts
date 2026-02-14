export type ReportData = {
  department: string;
  representative: string;
  store: string;

  startDate: string;
  endDate: string;

  category: string;

  comment: string;

  photos: File[];
};

export interface Report {
  department: string;
  representative: string;
  store: string;

  startDate: string;
  endDate: string;

  category: string;

  comment: string;

  photos: File[];
}
