export class EventExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventExpiredError';
  }
}
