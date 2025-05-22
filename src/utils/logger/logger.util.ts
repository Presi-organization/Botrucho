import { Tint } from '@/utils';

const stringifyMessages = (messages: unknown[]): string => messages.map(msg => {
  if (msg instanceof Error) {
    return msg.stack || msg.message;
  }
  if (typeof msg === 'object') {
    try {
      return JSON.stringify(msg);
    } catch {
      return '[Unserializable Object]';
    }
  }
  return String(msg);
}).join(' ');

const getTimestamp = (): string => new Date().toLocaleString('en-GB', {
  hour12: true,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const getCaller = (): string => {
  const stack: string[] | undefined = new Error().stack?.split('\n');
  if (stack && stack.length > 3) {
    const callerLine: string = stack[4];
    const match: RegExpMatchArray | null = callerLine.match(/\/src\/(?:.*\/)?(\w+)(?:\.\w+)*\.js/);
    return match ? match[1] : 'Unknown';
  }
  return 'Unknown';
};

const formatLog = (level: string, message: string): string => {
  const pid: number = process.pid;
  const timestamp: string = getTimestamp();
  const caller: string = getCaller();
  return `${Tint.magenta(`[Botrucho] ${pid.toString().padEnd(6)} -`)} ${Tint.white(timestamp)}      ${level} ${Tint.magenta(`[${caller}]`)} ${message}`;
};

export const logger = {
  log(...messages: unknown[]): void {
    console.log(formatLog(Tint.green('LOG'), Tint.green(stringifyMessages(messages))));
  },

  warn(...messages: unknown[]): void {
    console.log(formatLog(Tint.yellow('WARN'), Tint.yellow(stringifyMessages(messages))));
  },

  error(...messages: unknown[]): void {
    console.log(formatLog(Tint.red('ERROR'), Tint.red(stringifyMessages(messages))));
  },

  debug(...messages: unknown[]): void {
    console.log(formatLog(Tint.cyan('DEBUG'), Tint.cyan(stringifyMessages(messages))));
  },

  trace(...messages: unknown[]): void {
    console.log(formatLog(Tint.blue('TRACE'), Tint.blue(stringifyMessages(messages))));
  },
};

