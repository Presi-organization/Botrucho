const BOGOTA = 'America/Bogota';

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const longDateFormat = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export const bogotaDate = (date: Date = new Date()): string => dateFormat.format(date);

export const bogotaTime = (date: Date): string => timeFormat.format(date);

export const addDays = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export const isDateKey = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;

export const formatLongDate = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return longDateFormat.format(new Date(Date.UTC(year, month - 1, day)));
};
