import type { FootballCompetition } from '@/types';

// espnId is the numeric league id found in an event uid ("s:600~l:775~e:...").
export const footballCompetitions: FootballCompetition[] = [
  { key: 'champions', espnId: '775', name: 'Champions League', emoji: '🏆' },
  { key: 'europaleague', espnId: '776', name: 'Europa League', emoji: '🏆' },
  { key: 'premier', espnId: '700', name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'laliga', espnId: '740', name: 'La Liga', emoji: '🇪🇸' },
  { key: 'seriea', espnId: '730', name: 'Serie A', emoji: '🇮🇹' },
  { key: 'bundesliga', espnId: '720', name: 'Bundesliga', emoji: '🇩🇪' },
  { key: 'ligue1', espnId: '710', name: 'Ligue 1', emoji: '🇫🇷' },
  { key: 'betplay', espnId: '650', name: 'Liga BetPlay', emoji: '🇨🇴' },
  { key: 'copacolombia', espnId: '8313', name: 'Copa Colombia', emoji: '🇨🇴' },
  { key: 'libertadores', espnId: '783', name: 'Copa Libertadores', emoji: '🏆' },
  { key: 'sudamericana', espnId: '5454', name: 'Copa Sudamericana', emoji: '🏆' },
  { key: 'uefanations', espnId: '2395', name: 'UEFA Nations League', emoji: '🌍' },
  { key: 'copaamerica', espnId: '780', name: 'Copa América', emoji: '🌎' },
  { key: 'euro', espnId: '781', name: 'UEFA Euro', emoji: '🌍' },
  { key: 'euroq', espnId: '3947', name: 'UEFA Euro Qualifying', emoji: '🌍' },
  { key: 'conmebolq', espnId: '787', name: 'CONMEBOL World Cup Qualifying', emoji: '🌎' },
];

export const findCompetitionByEspnId = (espnId: string): FootballCompetition | undefined =>
  footballCompetitions.find((competition) => competition.espnId === espnId);
