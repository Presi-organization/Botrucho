export class EventAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventAlreadyExistsError";
  }
}
