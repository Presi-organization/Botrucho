const LogColors = {
  Yellow: '\x1b[33m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  Gray: '\x1b[90m',
  Black: '\x1b[30m',

  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m',
  BgGray: '\x1b[100m',

  Reset: '\x1b[0m',
};

export const Tint = {
  log(message: string): string {
    return `${LogColors.Reset}${message}${LogColors.Reset}`;
  },

  green(message: string): string {
    return `${LogColors.Green}${message}${LogColors.Reset}`;
  },

  red(message: string): string {
    return `${LogColors.Red}${message}${LogColors.Reset}`;
  },

  yellow(message: string): string {
    return `${LogColors.Yellow}${message}${LogColors.Reset}`;
  },

  blue(message: string): string {
    return `${LogColors.Blue}${message}${LogColors.Reset}`;
  },

  magenta(message: string): string {
    return `${LogColors.Magenta}${message}${LogColors.Reset}`;
  },

  cyan(message: string): string {
    return `${LogColors.Cyan}${message}${LogColors.Reset}`;
  },

  white(message: string): string {
    return `${LogColors.White}${message}${LogColors.Reset}`;
  },

  gray(message: string): string {
    return `${LogColors.Gray}${message}${LogColors.Reset}`;
  },
};
