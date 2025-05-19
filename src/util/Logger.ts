import { Tint } from './logColors';

class Logger {
  private static getTimestamp(): string {
    return new Date().toLocaleString('en-US', { hour12: true });
  }

  private static getCaller(): string {
    const stack = new Error().stack?.split('\n');
    if (stack && stack.length > 3) {
      const callerLine = stack[4];
      const match = callerLine.match(/\/src\/(?:.*\/)?(\w+)\.js/);
      return match ? match[1] : 'Unknown';
    }
    return 'Unknown';
  }

  private static formatLog(level: string, message: string): string {
    const pid = process.pid;
    const timestamp = this.getTimestamp();
    const caller = this.getCaller();
    return `${Tint.magenta(`[Botrucho] ${pid.toString().padEnd(6)} -`)} ${Tint.white(timestamp)}      ${level} ${Tint.magenta(`[${caller}]`)} ${message}`;
  }

  static log(...messages: any[]): void {
    const combinedMessage = messages.map(msg => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ');
    console.log(this.formatLog(Tint.green("LOG"), Tint.green(combinedMessage)));
  }

  static warn(...messages: any[]): void {
    const combinedMessage = messages.map(msg => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ');
    console.log(this.formatLog(Tint.yellow("WARN"), Tint.green(combinedMessage)));
  }

  static error(...messages: any[]): void {
    const combinedMessage = messages.map(msg => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ');
    console.log(this.formatLog(Tint.red("ERROR"), Tint.green(combinedMessage)));
  }

  static debug(...messages: any[]): void {
    const combinedMessage = messages.map(msg => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ');
    console.log(this.formatLog(Tint.cyan("DEBUG"), Tint.green(combinedMessage)));
  }

  static trace(...messages: any[]): void {
    const combinedMessage = messages.map(msg => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ');
    console.log(this.formatLog(Tint.blue("TRACE"), Tint.green(combinedMessage)));
  }
}

export const logger = Logger;
