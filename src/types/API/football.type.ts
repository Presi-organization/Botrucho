export interface FootballCompetition {
  key: string;
  espnId: string;
  name: string;
  emoji: string;
}

export type FootballMatchState = 'pre' | 'in' | 'post';

export interface FootballMatch {
  competitionKey: string;
  home: string;
  away: string;
  kickoff: Date;
  state: FootballMatchState;
  homeScore?: number;
  awayScore?: number;
}

export interface FootballPage {
  title: string;
  description: string;
}
