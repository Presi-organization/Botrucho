export interface LeagueEntryDTO {
  puuid: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  freshBlood: boolean;
  inactive: boolean;
}
