export enum Competitions {
  CHAMPIONS_LEAGUE = "CL",
  EUROPA_LEAGUE = "EL",
  PREMIER_LEAGUE = "PL",
  LALIGA = "PD",
  SERIE_A = "SA",
  BUNDESLIGA = "BL1",
  LIGUE_1 = "FL1",
  FPC = "COL"
}

export const subcommandToCompetition: Record<string, Competitions> = {
  champions: Competitions.CHAMPIONS_LEAGUE,
  europaleague: Competitions.EUROPA_LEAGUE,
  premier: Competitions.PREMIER_LEAGUE,
  laliga: Competitions.LALIGA,
  seriea: Competitions.SERIE_A,
  bundesliga: Competitions.BUNDESLIGA,
  ligue1: Competitions.LIGUE_1,
  fpc: Competitions.FPC
};

export const competitionNames: Record<Competitions, string> = {
  [Competitions.CHAMPIONS_LEAGUE]: "Champions League",
  [Competitions.EUROPA_LEAGUE]: "Europa League",
  [Competitions.PREMIER_LEAGUE]: "Premier League",
  [Competitions.LALIGA]: "La Liga",
  [Competitions.SERIE_A]: "Serie A",
  [Competitions.BUNDESLIGA]: "Bundesliga",
  [Competitions.LIGUE_1]: "Ligue 1",
  [Competitions.FPC]: "Fútbol Profesional Colombiano"
}

export interface ApiMatch {
  homeTeam: Team;
  awayTeam: Team;
  utcDate: string;
  stage: string;
  matchday: number;
  score: Score
}

export interface Team {
  name: string;
  shortName: string;
}

interface Score {
  fullTime: {
    home: number;
    away: number;
  }
}

export interface Matches {
  stage: string;
  matches: Match[];
}

export interface Match {
  homeTeam: string;
  awayTeam: string;
  localDate: string;
  stage: string;
}

export interface Results {
  stage: string;
  results: Result[];
}

export interface Result {
  homeTeam: string;
  homeResult: number;
  awayTeam: string;
  awayResult: number;
  localDate: string;
}

export type FootballResult = Matches | Results | undefined;

export const isMatches = (data: FootballResult): data is Matches => {
  return !!data && "matches" in data;
}

export const isResults = (data: FootballResult): data is Results => {
  return !!data && "results" in data;
}
