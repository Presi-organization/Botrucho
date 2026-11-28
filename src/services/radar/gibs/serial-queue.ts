// Runs CPU-heavy tasks one at a time, so a burst (a timelapse, several users) becomes a line of
// short tasks with the event loop free in between, instead of one long freeze.
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
