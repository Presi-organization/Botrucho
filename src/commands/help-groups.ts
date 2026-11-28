export type HelpGroup = 'MUSIC' | 'FUN' | 'INFO' | 'SERVER';

export interface HelpEntry {
  name: string;
  description: string;
}

export const HELP_GROUP_COMMANDS: Record<HelpGroup, string[]> = {
  MUSIC: [
    'play',
    'pause',
    'resume',
    'skip',
    'loop',
    'shuffle',
    'volume',
    'song-info',
    'lyrics',
    'leave',
  ],
  FUN: ['coin', 'dado', 'say'],
  INFO: [
    'football',
    'football-daily',
    'tftelo',
    'radar',
    'multas',
    'avatar',
    'user-info',
    'server',
    'ping',
    'help',
  ],
  SERVER: ['event', 'lang', 'move', 'prune', 'crons', 'toggle-command', 'ai'],
};

const OWNER_ONLY = new Set(['ai']);
const GROUP_ORDER = Object.keys(HELP_GROUP_COMMANDS) as HelpGroup[];

export const buildHelpGroups = (
  commands: HelpEntry[],
  disabledCommands: string[],
  isOwner: boolean,
): { group: HelpGroup; lines: string[] }[] => {
  const groupOf = new Map(
    GROUP_ORDER.flatMap((group) =>
      HELP_GROUP_COMMANDS[group].map((name) => [name, group] as const),
    ),
  );
  const visible = commands.filter(
    ({ name }) => !disabledCommands.includes(name) && (isOwner || !OWNER_ONLY.has(name)),
  );
  return GROUP_ORDER.map((group) => ({
    group,
    lines: visible
      .filter(({ name }) => (groupOf.get(name) ?? 'INFO') === group)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, description }) => `\`/${name}\` ${description}`),
  })).filter(({ lines }) => lines.length > 0);
};
