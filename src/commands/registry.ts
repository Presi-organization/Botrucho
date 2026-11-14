import { CoinCommand, DiceCommand } from '@/commands/games';
import {
  AiCommand,
  AvatarCommand,
  CronsCommand,
  EventCommand,
  FootballDailyCommand,
  LangCommand,
  MoveCommand,
  PingCommand,
  PruneCommand,
  ServerCommand,
  ToggleCommandCommand,
  UserInfoCommand,
} from '@/commands/management';
import {
  LeaveCommand,
  LyricsCommand,
  PauseCommand,
  PlayCommand,
  ResumeCommand,
  ShuffleCommand,
  SkipCommand,
  VolumeCommand,
} from '@/commands/music';
import { SayCommand } from '@/commands/say';
import { FootballCommand, MultasCommand, SiataCommand, TFTEloCommand } from '@/commands/searching';
import { ICommand } from '@/types';

export const commandRegistry: (new () => ICommand)[] = [
  AiCommand,
  AvatarCommand,
  CronsCommand,
  CoinCommand,
  DiceCommand,
  EventCommand,
  FootballCommand,
  FootballDailyCommand,
  LangCommand,
  LeaveCommand,
  LyricsCommand,
  MoveCommand,
  MultasCommand,
  TFTEloCommand,
  ToggleCommandCommand,
  PauseCommand,
  PingCommand,
  PlayCommand,
  PruneCommand,
  ResumeCommand,
  SayCommand,
  ServerCommand,
  SiataCommand,
  ShuffleCommand,
  SkipCommand,
  UserInfoCommand,
  VolumeCommand,
];
