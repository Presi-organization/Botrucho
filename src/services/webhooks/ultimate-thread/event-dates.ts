/**
 * Retrieves the next Saturday and the date three days after it
 * @return { eventDate: Date, expirationDate: Date } The event and expiration dates
 */
export const getEventDates = (): { eventDate: Date; expirationDate: Date } => {
  const eventDate = new Date();
  eventDate.setHours(0, 0, 0, 0);

  const currentDay = eventDate.getDay();
  const daysUntilSaturday = (6 - currentDay + 7) % 7;

  eventDate.setDate(eventDate.getDate() + daysUntilSaturday);

  const expirationDate = new Date(eventDate);
  expirationDate.setDate(expirationDate.getDate() + 3);

  return { eventDate, expirationDate };
};

/**
 * Retrieves the event day formatted for display
 * @return string The formatted date (dd/mm/yyyy)
 */
export const getTomorrowsDay = (): string => {
  const { eventDate } = getEventDates();
  return eventDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
