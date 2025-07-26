import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Player, Team, DraftState } from '../types';

// Mock data for demo mode
const mockPlayers: Player[] = [
  { id: '1', name: 'Josh Allen', position: 'QB', team: 'BUF', rank: 1, projectedPoints: 385.2, adp: 35, byeWeek: 12, lastYearPoints: 378.4, age: 28, experience: 6 },
  { id: '2', name: 'Lamar Jackson', position: 'QB', team: 'BAL', rank: 2, projectedPoints: 378.4, adp: 42, byeWeek: 14, lastYearPoints: 365.8, age: 27, experience: 6 },
  { id: '3', name: 'Christian McCaffrey', position: 'RB', team: 'SF', rank: 3, projectedPoints: 298.7, adp: 65, byeWeek: 9, lastYearPoints: 285.3, age: 28, experience: 7 },
  { id: '4', name: 'Tyreek Hill', position: 'WR', team: 'MIA', rank: 4, projectedPoints: 285.6, adp: 58, byeWeek: 6, lastYearPoints: 278.3, age: 30, experience: 8 },
  { id: '5', name: 'Travis Kelce', position: 'TE', team: 'KC', rank: 5, projectedPoints: 245.7, adp: 45, byeWeek: 10, lastYearPoints: 235.4, age: 35, experience: 11 },
  { id: '6', name: 'Justin Jefferson', position: 'WR', team: 'MIN', rank: 6, projectedPoints: 279.8, adp: 52, byeWeek: 6, lastYearPoints: 268.4, age: 25, experience: 4 },
  { id: '7', name: 'Cooper Kupp', position: 'WR', team: 'LAR', rank: 7, projectedPoints: 265.3, adp: 48, byeWeek: 6, lastYearPoints: 245.8, age: 31, experience: 7 },
  { id: '8', name: 'Derrick Henry', position: 'RB', team: 'BAL', rank: 8, projectedPoints: 245.6, adp: 38, byeWeek: 14, lastYearPoints: 228.9, age: 30, experience: 8 },
  { id: '9', name: 'Davante Adams', position: 'WR', team: 'LV', rank: 9, projectedPoints: 258.7, adp: 44, byeWeek: 10, lastYearPoints: 242.1, age: 32, experience: 10 },
  { id: '10', name: 'Saquon Barkley', position: 'RB', team: 'PHI', rank: 10, projectedPoints: 235.4, adp: 41, byeWeek: 5, lastYearPoints: 218.7, age: 27, experience: 6 },
  { id: '11', name: 'CeeDee Lamb', position: 'WR', team: 'DAL', rank: 11, projectedPoints: 252.8, adp: 46, byeWeek: 7, lastYearPoints: 238.9, age: 25, experience: 4 },
  { id: '12', name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', rank: 12, projectedPoints: 248.3, adp: 43, byeWeek: 12, lastYearPoints: 231.6, age: 24, experience: 3 },
  { id: '13', name: 'Nick Chubb', position: 'RB', team: 'CLE', rank: 13, projectedPoints: 228.9, adp: 39, byeWeek: 10, lastYearPoints: 205.4, age: 28, experience: 6 },
  { id: '14', name: 'Stefon Diggs', position: 'WR', team: 'HOU', rank: 14, projectedPoints: 242.1, adp: 40, byeWeek: 14, lastYearPoints: 225.8, age: 31, experience: 9 },
  { id: '15', name: 'Mark Andrews', position: 'TE', team: 'BAL', rank: 15, projectedPoints: 198.7, adp: 32, byeWeek: 14, lastYearPoints: 185.3, age: 29, experience: 6 },
  { id: '16', name: 'Aaron Jones', position: 'RB', team: 'MIN', rank: 16, projectedPoints: 218.4, adp: 36, byeWeek: 6, lastYearPoints: 198.7, age: 29, experience: 7 },
  { id: '17', name: 'Mike Evans', position: 'WR', team: 'TB', rank: 17, projectedPoints: 235.6, adp: 37, byeWeek: 11, lastYearPoints: 218.9, age: 31, experience: 10 },
  { id: '18', name: 'Alvin Kamara', position: 'RB', team: 'NO', rank: 18, projectedPoints: 212.8, adp: 34, byeWeek: 12, lastYearPoints: 195.4, age: 29, experience: 7 },
  { id: '19', name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', rank: 19, projectedPoints: 228.7, adp: 33, byeWeek: 5, lastYearPoints: 212.3, age: 25, experience: 3 },
  { id: '20', name: 'Puka Nacua', position: 'WR', team: 'LAR', rank: 20, projectedPoints: 221.4, adp: 31, byeWeek: 6, lastYearPoints: 198.6, age: 23, experience: 1 },
];

const mockTeams: Team[] = [
  { id: 'team-1', name: 'Team 1', ownerId: '1', budget: 200, players: [] },
  { id: 'team-2', name: 'Team 2', ownerId: '2', budget: 200, players: [] },
  { id: 'team-3', name: 'Team 3', ownerId: '3', budget: 200, players: [] },
  { id: 'team-4', name: 'Team 4', ownerId: '4', budget: 200, players: [] },
  { id: 'team-5', name: 'Team 5', ownerId: '5', budget: 200, players: [] },
  { id: 'team-6', name: 'Team 6', ownerId: '6', budget: 200, players: [] },
  { id: 'team-7', name: 'Team 7', ownerId: '7', budget: 200, players: [] },
  { id: 'team-8', name: 'Team 8', ownerId: '8', budget: 200, players: [] },
  { id: 'team-9', name: 'Team 9', ownerId: '9', budget: 200, players: [] },
  { id: 'team-10', name: 'Team 10', ownerId: '10', budget: 200, players: [] },
  { id: 'team-11', name: 'Team 11', ownerId: '11', budget: 200, players: [] },
  { id: 'team-12', name: 'Team 12', ownerId: '12', budget: 200, players: [] },
];

const mockDraftState: DraftState = {
  currentRound: 1,
  currentNominator: 'team-1',
  nominatedPlayer: null,
  currentBids: [],
  highestBid: null,
  timeRemaining: 0,
  isActive: false,
  isPaused: false,
  isStarted: false,
  draftedPlayers: []
};

export const useDraftData = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [draftState, setDraftState] = useState<DraftState>(mockDraftState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from API
    const fetchData = async () => {
      try {
        // Fetch players
        const playersResponse = await fetch('http://localhost:3001/api/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          console.log('Fetched players:', playersData.length);
          setPlayers(playersData);
        }
        
        // Fetch room state
        const roomResponse = await fetch('http://localhost:3001/api/room/main-draft-room');
        if (roomResponse.ok) {
          const roomData = await roomResponse.json();
          console.log('Fetched room data:', roomData);
          setTeams(roomData.teams);
          setDraftState(roomData.draftState);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    socket.on('room-state', (roomState) => {
      console.log('Received room state:', roomState);
      setTeams(roomState.teams);
      setDraftState(roomState.draftState);
    });
    
    socket.on('room-updated', (roomState) => {
      console.log('Room updated:', roomState);
      setTeams(roomState.teams);
      setDraftState(roomState.draftState);
    });
    
    socket.on('draft-started', (newDraftState) => {
      console.log('Draft started:', newDraftState);
      setDraftState(newDraftState);
    });
    
    socket.on('player-nominated', (newDraftState) => {
      console.log('Player nominated:', newDraftState);
      setDraftState(newDraftState);
    });
    
    socket.on('bid-placed', (newDraftState) => {
      console.log('Bid placed:', newDraftState);
      setDraftState(newDraftState);
    });
    
    socket.on('sale-completed', (roomState) => {
      console.log('Sale completed:', roomState);
      setTeams(roomState.teams);
      setDraftState(roomState.draftState);
    });

    return () => {
      socket.off('room-state');
      socket.off('room-updated');
      socket.off('draft-started');
      socket.off('player-nominated');
      socket.off('bid-placed');
      socket.off('sale-completed');
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

  const completeSale = () => {
    if (socket) {
      socket.emit('complete-sale', 'main-draft-room');
    }
  };

  return {
    players,
    teams,
    draftState,
    loading,
    nominatePlayer,
    placeBid,
    completeSale
  };
};