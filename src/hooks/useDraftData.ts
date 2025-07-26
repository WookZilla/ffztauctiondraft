import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Player, Team, DraftState } from '../types';

// Mock data - no external dependencies
const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'Josh Allen', position: 'QB', team: 'BUF', rank: 1, projectedPoints: 385.2, adp: 35, lastYearPoints: 378.4, age: 28, experience: 6 },
  { id: '2', name: 'Lamar Jackson', position: 'QB', team: 'BAL', rank: 2, projectedPoints: 378.4, adp: 42, lastYearPoints: 365.8, age: 27, experience: 6 },
  { id: '3', name: 'Christian McCaffrey', position: 'RB', team: 'SF', rank: 3, projectedPoints: 298.7, adp: 65, lastYearPoints: 285.3, age: 28, experience: 7 },
  { id: '4', name: 'Tyreek Hill', position: 'WR', team: 'MIA', rank: 4, projectedPoints: 285.6, adp: 58, lastYearPoints: 278.3, age: 30, experience: 8 },
  { id: '5', name: 'Travis Kelce', position: 'TE', team: 'KC', rank: 5, projectedPoints: 245.7, adp: 45, lastYearPoints: 235.4, age: 35, experience: 11 },
  { id: '6', name: 'Justin Jefferson', position: 'WR', team: 'MIN', rank: 6, projectedPoints: 279.8, adp: 52, lastYearPoints: 268.4, age: 25, experience: 4 },
  { id: '7', name: 'Cooper Kupp', position: 'WR', team: 'LAR', rank: 7, projectedPoints: 265.3, adp: 48, lastYearPoints: 245.8, age: 31, experience: 7 },
  { id: '8', name: 'Derrick Henry', position: 'RB', team: 'BAL', rank: 8, projectedPoints: 245.6, adp: 38, lastYearPoints: 228.9, age: 30, experience: 8 },
  { id: '9', name: 'Davante Adams', position: 'WR', team: 'LV', rank: 9, projectedPoints: 258.7, adp: 44, lastYearPoints: 242.1, age: 32, experience: 10 },
  { id: '10', name: 'Saquon Barkley', position: 'RB', team: 'PHI', rank: 10, projectedPoints: 235.4, adp: 41, lastYearPoints: 218.7, age: 27, experience: 6 }
];

const MOCK_TEAMS: Team[] = [
  { id: 'team-1', name: 'Team 1', ownerId: 'user-1', budget: 200, players: [] },
  { id: 'team-2', name: 'Team 2', ownerId: 'user-2', budget: 200, players: [] },
  { id: 'team-3', name: 'Team 3', ownerId: 'user-3', budget: 200, players: [] },
  { id: 'team-4', name: 'Team 4', ownerId: 'user-4', budget: 200, players: [] },
  { id: 'team-5', name: 'Team 5', ownerId: 'user-5', budget: 200, players: [] },
  { id: 'team-6', name: 'Team 6', ownerId: 'user-6', budget: 200, players: [] },
  { id: 'team-7', name: 'Team 7', ownerId: 'user-7', budget: 200, players: [] },
  { id: 'team-8', name: 'Team 8', ownerId: 'user-8', budget: 200, players: [] },
  { id: 'team-9', name: 'Team 9', ownerId: 'user-9', budget: 200, players: [] },
  { id: 'team-10', name: 'Team 10', ownerId: 'user-10', budget: 200, players: [] },
  { id: 'team-11', name: 'Team 11', ownerId: 'user-11', budget: 200, players: [] },
  { id: 'team-12', name: 'Team 12', ownerId: 'user-12', budget: 200, players: [] }
];

const INITIAL_DRAFT_STATE: DraftState = {
  currentRound: 1,
  currentNominator: 'team-1',
  nominatedPlayer: null,
  currentBids: [],
  highestBid: null,
  timeRemaining: 0,
  isActive: false,
  isPaused: false,
  isStarted: false,
  startingPrice: 1,
  nominationOrder: [],
  draftedPlayers: []
};

export function useDraftData() {
  const { socket } = useSocket();
  const [players] = useState<Player[]>(MOCK_PLAYERS);
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [draftState, setDraftState] = useState<DraftState>(INITIAL_DRAFT_STATE);
  const [loading] = useState(false);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (roomState: any) => {
      console.log('Room state received:', roomState);
      if (roomState?.teams) setTeams(roomState.teams);
      if (roomState?.draftState) setDraftState(roomState.draftState);
    };

    const handleRoomUpdated = (roomState: any) => {
      console.log('Room updated:', roomState);
      if (roomState?.teams) setTeams(roomState.teams);
      if (roomState?.draftState) setDraftState(roomState.draftState);
    };

    const handleDraftStarted = (newDraftState: any) => {
      console.log('Draft started:', newDraftState);
      if (newDraftState) setDraftState(newDraftState);
    };

    const handlePlayerNominated = (newDraftState: any) => {
      console.log('Player nominated:', newDraftState);
      if (newDraftState) setDraftState(newDraftState);
    };

    const handleBidPlaced = (newDraftState: any) => {
      console.log('Bid placed:', newDraftState);
      if (newDraftState) setDraftState(newDraftState);
    };

    const handleSaleCompleted = (roomState: any) => {
      console.log('Sale completed:', roomState);
      if (roomState?.teams) setTeams(roomState.teams);
      if (roomState?.draftState) setDraftState(roomState.draftState);
    };

    socket.on('room-state', handleRoomState);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('draft-started', handleDraftStarted);
    socket.on('player-nominated', handlePlayerNominated);
    socket.on('bid-placed', handleBidPlaced);
    socket.on('sale-completed', handleSaleCompleted);

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('draft-started', handleDraftStarted);
      socket.off('player-nominated', handlePlayerNominated);
      socket.off('bid-placed', handleBidPlaced);
      socket.off('sale-completed', handleSaleCompleted);
    };
  }, [socket]);

  const nominatePlayer = (player: Player) => {
    if (socket) {
      socket.emit('nominate-player', 'main-draft-room', player, 1);
    }
  };

  const placeBid = (amount: number, userId: string, username: string, teamName: string) => {
    if (socket) {
      socket.emit('place-bid', 'main-draft-room', {
        userId,
        username,
        teamName,
        amount
      });
    }
  };

  return {
    players,
    teams,
    draftState,
    loading,
    nominatePlayer,
    placeBid
  };
}