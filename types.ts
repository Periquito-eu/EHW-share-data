export interface Wrestler {
  name: string;
  // Stats derived from history
  wins: number;
  losses: number;
  matches: number;
  streak: number;
  maxStreak: number;
  reputation: number;
  titles: number;
  history: number[]; // Reputation over time
}

export interface Match {
  id: string;
  season: number;
  episode: number;
  show: string; // Still used for display, e.g., "Temporada 1 - Episodio 4"
  winner: string;
  loser: string;
  isTitleMatch: boolean;
  titleName?: string;
  timestamp: number;
}

export interface Show {
  id: string;
  name: string;
  matches: Match[];
}

export enum AppTab {
  RANKING = 'ranking',
  TIMELINE = 'timeline',
  PROFILE = 'profile',
  TRIVIA = 'trivia',
  DATA = 'data'
}