import { CoinCommand, DiceCommand } from '@/commands/games';
import {
  AvatarCommand,
  CronsCommand,
  EventCommand,
  LangCommand,
  MoveCommand,
  PingCommand,
  PruneCommand,
  ServerCommand,
  ToggleCommandCommand,
  UserInfoCommand
} from '@/commands/management';
import { LeaveCommand, LyricsCommand, PlayCommand, ShuffleCommand, SkipCommand, VolumeCommand } from '@/commands/music';
import { SayCommand } from '@/commands/say';
import { FootballCommand, MultasCommand, SiataCommand, TFTEloCommand } from '@/commands/searching';
import { ICommand } from '@/types';

export const commandRegistry: (new () => ICommand)[] = [
  AvatarCommand,
  CronsCommand,
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
  ToggleCommandCommand,
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
