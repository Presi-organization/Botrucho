import { CoinCommand, DiceCommand } from '@/commands/games';
import {
  AvatarCommand,
  EventCommand,
  LangCommand,
  MoveCommand,
  PingCommand,
  PruneCommand,
  ServerCommand,
  UserInfoCommand
} from '@/commands/management';
import { LeaveCommand, LyricsCommand, PlayCommand, ShuffleCommand, SkipCommand, VolumeCommand } from '@/commands/music';
import { SayCommand } from '@/commands/say';
import { FootballCommand, MultasCommand, SiataCommand, TFTEloCommand } from '@/commands/searching';
import { ICommand } from '@/types';

export const commandRegistry: (new () => ICommand)[] = [
  AvatarCommand,
  CoinCommand,
  DiceCommand,
  EventCommand,
  FootballCommand,
  LangCommand,
  LeaveCommand,
  LyricsCommand,
  MoveCommand,
  MultasCommand,
  TFTEloCommand,
  PingCommand,
  PlayCommand,
  PruneCommand,
  SayCommand,
  ServerCommand,
  SiataCommand,
  ShuffleCommand,
  SkipCommand,
  UserInfoCommand,
  VolumeCommand,
];
