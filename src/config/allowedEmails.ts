export type UserRole = 'agent' | 'supervisor' | 'admin';

export type UserProfile = {
  role: UserRole;
  department: string;
  representative?: string;
};

export const userAccessMap: Record<string, UserProfile> = {
  'oliahrynyk32@gmail.com': {
    role: 'agent',
    department: 'Область (Центр)',
    representative: 'Гриник Ольга',
  },
  'storoshdiana@gmail.com': {
    role: 'agent',
    department: 'Місто',
    representative: 'Довга Діана',
  },
  'dyug.tany.90@gmail.com': {
    role: 'agent',
    department: "Кам'янець-Подільський відділ",
    representative: 'Дюг Тетяна',
  },
  'ivsn.denis@gmail.com': {
    role: 'agent',
    department: "Кам'янець-Подільський відділ",
    representative: 'Івасишин Денис',
  },
  'anna.stetsyuk25@gmail.com': {
    role: 'agent',
    department: 'Шепетівський відділ',
    representative: 'Кучер Аня',
  },
  'laptevahm@gmail.com': {
    role: 'agent',
    department: 'Місто',
    representative: 'Лаптєва Руслана',
  },
  'olenkapolonne@gmail.com': {
    role: 'agent',
    department: 'Шепетівський відділ',
    representative: 'Мартинчик Альона',
  },
  'glukhovska.84@gmail.com': {
    role: 'agent',
    department: 'Область (Центр)',
    representative: 'Могильна Оксана',
  },
  'svetlananagornak1984@gmail.com': {
    role: 'agent',
    department: 'Шепетівський відділ',
    representative: 'Нагорняк Світлана',
  },
  'vlad-oliynik@ukr.net': {
    role: 'agent',
    department: "Кам'янець-Подільський відділ",
    representative: 'Олійник Влад',
  },
  'alinakukolka84@gmail.com': {
    role: 'agent',
    department: 'Область (Центр)',
    representative: 'Сторожук Аліна',
  },
  'natasha14148282@icloud.com': {
    role: 'agent',
    department: 'Місто',
    representative: 'Ящишина Наталія',
  },
  'y.stepanishin@gmail.com': {
    role: 'admin',
    department: 'Усі відділи',
  },
  'gutovskan@gmail.com': {
    role: 'admin',
    department: 'Усі відділи',
  },
  'vkamsnskiy@gmail.com': {
    role: 'supervisor',
    department: "Кам'янець-Подільський відділ",
  },
  'nikolya202@gmail.com': {
    role: 'supervisor',
    department: 'Шепетівський відділ',
  },
  'w18051985@gmail.com': {
    role: 'supervisor',
    department: 'Місто, Область (Центр)',
  },
};

export const allowedEmails = Object.keys(userAccessMap);
