export interface User {
  id: string;
  username: string;
  role: 'commissioner' | 'user';
  teamId: string;
  teamName: string;
  teamLogo?: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  budget: number;
  players: Player[];
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  rank: number;
  projectedPoints?: number;
  adp?: number; // Average Draft Position
  lastYearPoints?: number;
  injury?: {
    status: string;
    description: string;
  };
  sleeperId?: string;
  age?: number;
  experience?: number;
}

export interface Bid {
  id: string;
  playerId: string;
  userId: string;
  username: string;
  teamName: string;
  amount: number;
  timestamp: number;
}

export interface DraftState {
  currentRound: number;
  currentNominator: string;
  nominatedPlayer: Player | null;
  currentBids: Bid[];
  highestBid: Bid | null;
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  isStarted: boolean;
  draftedPlayers: Array<{
    player: Player;
    winningBid: Bid;
    round: number;
  }>;
}

export interface AuctionRoom {
  id: string;
  name: string;
  teams: Team[];
  draftState: DraftState;
  settings: {
    maxBudget: number;
    roundCount: number;
    initialTimer: number;
    bidTimer: number;
    sleeperLeagueId?: string;
  };
  draftHistory: Array<{
    year: number;
    winner: string;
    totalPlayers: number;
    avgPrice: number;
  }>;
}