import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useDraftData } from '../hooks/useDraftData';
import { Clock, Plus, Search, MessageCircle, Settings, ArrowLeft, Star, TrendingUp, ChevronUp, ChevronDown, Play, Pause, MoreVertical, Send, AlertTriangle, DollarSign } from 'lucide-react';
import { Player, Team, Bid } from '../types';

interface SleeperDraftBoardProps {
  onBackToDashboard: () => void;
}

const SleeperDraftBoard: React.FC<SleeperDraftBoardProps> = ({ onBackToDashboard }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { players, teams, draftState, loading, nominatePlayer, placeBid } = useDraftData();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(1);
  const [startingPrice, setStartingPrice] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'queue' | 'results' | 'chat'>('queue');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showDrafted, setShowDrafted] = useState(false);
  const [showRookies, setShowRookies] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [queue, setQueue] = useState<Player[]>([]);
  const [isPlayerPoolCollapsed, setIsPlayerPoolCollapsed] = useState(false);
  const [showCommissionerMenu, setShowCommissionerMenu] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [playerToNominate, setPlayerToNominate] = useState<Player | null>(null);

  const userTeam = teams.find(team => team.ownerId === user?.id);
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const ROOM_ID = 'main-draft-room';

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('chat-message', (message) => {
      console.log('Received chat message:', message);
      setChatMessages(prev => {
        // Avoid duplicate messages
        if (prev.find(msg => msg.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socket.on('chat-history', (messages) => {
      console.log('Received chat history:', messages);
      setChatMessages(messages || []);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      console.log('Error details:', error);
    });

    socket.on('timer-warning', ({ timeRemaining, message }) => {
      // You could add sound alerts here
      console.log(`Timer warning: ${message}`);
    });

    socket.on('player-nominated', (newDraftState) => {
      console.log('Player nominated event:', newDraftState);
      setSelectedPlayer(newDraftState.nominatedPlayer);
      setBidAmount((newDraftState.highestBid?.amount || 0) + 1);
    });

    socket.on('bid-placed', (newDraftState) => {
      console.log('Bid placed event:', newDraftState);
      setBidAmount((newDraftState.highestBid?.amount || 0) + 1);
    });

    return () => {
      socket.off('chat-message');
      socket.off('chat-history');
      socket.off('error');
      socket.off('timer-warning');
      socket.off('player-nominated');
      socket.off('bid-placed');
    };
  }, [socket]);

  // Join room on component mount
  useEffect(() => {
    if (socket && user) {
      console.log('Joining room with user:', user);
      socket.emit('join-room', ROOM_ID, {
        id: user.id,
        username: user.username,
        role: user.role,
        teamId: user.teamId,
        teamName: user.teamName
      });
    }
  }, [socket, user]);
  // Filter players based on current filters
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    const matchesWatchlist = !showWatchlist || watchlist.includes(player.id);
    const matchesDrafted = !showDrafted || draftState.draftedPlayers.some(dp => dp.player.id === player.id);
    const matchesRookies = !showRookies || (player.experience && player.experience <= 1);
    
    return matchesSearch && matchesPosition && matchesWatchlist && !matchesDrafted && !matchesRookies;
  }).slice(0, 20);

  const canNominate = draftState.currentNominator === userTeam?.id && !draftState.isActive && draftState.isStarted && !draftState.isPaused;
  const canBid = userTeam && draftState.isActive && !draftState.isPaused;
  const isMyTurn = draftState.currentNominator === userTeam?.id;
  const handleAddToQueue = (player: Player) => {
    if (!queue.find(p => p.id === player.id)) {
      setQueue([...queue, player]);
    }
  };

  const handleRemoveFromQueue = (playerId: string) => {
    setQueue(queue.filter(p => p.id !== playerId));
  };

  const handleToggleWatchlist = (playerId: string) => {
    if (watchlist.includes(playerId)) {
      setWatchlist(watchlist.filter(id => id !== playerId));
    } else {
      setWatchlist([...watchlist, playerId]);
    }
  };

  const handleNominatePlayer = (player: Player) => {
    setPlayerToNominate(player);
    setStartingPrice(1);
    setShowNominationModal(true);
  };

  const confirmNomination = () => {
    if (socket && playerToNominate) {
      socket.emit('nominate-player', ROOM_ID, playerToNominate, startingPrice);
      setShowNominationModal(false);
      setPlayerToNominate(null);
    }
  };
  const handleBid = (amount: number) => {
    if (socket && user && userTeam && canBid) {
      socket.emit('place-bid', ROOM_ID, {
        userId: user.id,
        username: user.username,
        teamName: userTeam.name,
        amount: amount
      });
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sending chat message:', chatMessage, 'Socket connected:', !!socket);
    if (socket && chatMessage.trim()) {
      console.log('Emitting chat message to room:', ROOM_ID);
      socket.emit('send-chat-message', ROOM_ID, chatMessage);
      setChatMessage('');
    } else {
      console.log('Cannot send message - socket:', !!socket, 'message:', chatMessage.trim());
    }
  };
  const handleStartDraft = () => {
    console.log('Starting draft...');
    if (socket) {
      socket.emit('start-draft', ROOM_ID);
    }
    setShowCommissionerMenu(false);
  };

  const handleTogglePause = () => {
    if (socket) {
      socket.emit('toggle-draft-pause', ROOM_ID);
    }
    setShowCommissionerMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading draft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBackToDashboard}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Draft Board</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Round {draftState.currentRound}/15</span>
            </div>
            {isMyTurn && canNominate && (
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                YOUR TURN TO NOMINATE
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => setShowCommissionerMenu(!showCommissionerMenu)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Commissioner Dropdown Menu */}
              {showCommissionerMenu && user?.role === 'commissioner' && (
                <div className="absolute right-0 top-8 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-700">
                      Commissioner Controls
                    </div>
                    
                    {!draftState.isStarted ? (
                      <button
                        onClick={handleStartDraft}
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center"
                      >
                        <Play className="w-4 h-4 mr-3 text-green-400" />
                        Start Draft
                      </button>
                    ) : (
                      <button
                        onClick={handleTogglePause}
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center"
                      >
                        {draftState.isPaused ? (
                          <>
                            <Play className="w-4 h-4 mr-3 text-green-400" />
                            Resume Draft
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 mr-3 text-yellow-400" />
                            Pause Draft
                          </>
                        )}
                      </button>
                    )}
                    
                    <div className="border-t border-gray-700 mt-2 pt-2">
                      <div className="px-4 py-2 text-xs text-gray-400">
                        Draft Status: {draftState.isStarted ? (draftState.isPaused ? 'Paused' : 'Active') : 'Not Started'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Click outside to close menu */}
              {showCommissionerMenu && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCommissionerMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Team Roster Grid */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="grid grid-cols-6 gap-2 mb-4">
            {teams.slice(0, 12).map((team, index) => (
              <div
                key={team.id}
                className={`bg-gray-800 rounded-lg p-3 border ${
                  team.ownerId === user?.id ? 'border-orange-500' : 'border-gray-700'
                }`}
              >
                <div className="text-center mb-2">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
                    team.ownerId === user?.id ? 'bg-orange-500' : 'bg-gray-600'
                  }`}>
                    {team.name.charAt(0)}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{team.name}</div>
                  <div className="text-xs">
                    <span className="text-white font-semibold">MAX ${team.budget}</span>
                  </div>
                  
                  {draftState.highestBid?.teamId === team.id && (
                    <div className="text-xs text-green-400 font-bold">
                      HIGH BID: ${draftState.highestBid.amount}
                    </div>
                  )}
                </div>

                {/* Position slots */}
                <div className="space-y-1">
                  {['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'].map((pos, posIndex) => {
                    const positionPlayers = team.players.filter(p => p.position === pos || (pos === 'FLEX' && ['RB', 'WR', 'TE'].includes(p.position)));
                    const player = positionPlayers[pos === 'RB' && posIndex === 2 ? 1 : 0];
                    
                    return (
                      <div
                        key={`${pos}-${posIndex}`}
                        className={`h-8 rounded text-xs flex items-center justify-center border ${
                          player 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-gray-700 border-gray-600 text-gray-400'
                        }`}
                      >
                        {player ? (
                          <div className="flex items-center space-x-1 px-2">
                            <span className="truncate font-medium">{player.name.split(' ').pop()}</span>
                            <span className="text-xs opacity-75">${player.adp || 0}</span>
                          </div>
                        ) : (
                          pos
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Current Auction */}
          {draftState.nominatedPlayer && (
            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <div className="flex items-center space-x-4 mb-4">
                {draftState.nominatedPlayer.photoUrl ? (
                  <img
                    src={draftState.nominatedPlayer.photoUrl}
                    alt={draftState.nominatedPlayer.name}
                    className="w-20 h-20 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${draftState.nominatedPlayer.name.charAt(0)}`;
                    }}
                  />
                ) : (
                <img
                    src={`https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${draftState.nominatedPlayer.name.charAt(0)}`}
                    alt={draftState.nominatedPlayer.name}
                  className="w-20 h-20 rounded-lg"
                />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{draftState.nominatedPlayer.name}</h2>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <span>{draftState.nominatedPlayer.position}</span>
                    <span>•</span>
                    <span>{draftState.nominatedPlayer.team}</span>
                    <span>•</span>
                    <span>Proj {draftState.nominatedPlayer.projectedPoints}</span>
                  </div>
                  
                  {/* Injury Status */}
                  {draftState.nominatedPlayer.injury && (
                    <div className="flex items-center space-x-2 mt-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm font-medium">
                        {draftState.nominatedPlayer.injury.status}
                      </span>
                      {draftState.nominatedPlayer.injury.description && (
                        <span className="text-gray-400 text-sm">
                          - {draftState.nominatedPlayer.injury.description}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Player Stats */}
                  <div className="grid grid-cols-5 gap-4 mt-3 text-center">
                    <div>
                      <div className="text-sm text-gray-400">POINTS</div>
                      <div className="font-bold">{draftState.nominatedPlayer.projectedPoints}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">RUSH</div>
                      <div className="font-bold">2</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">YDS</div>
                      <div className="font-bold">12</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">TDS</div>
                      <div className="font-bold">-</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">REC</div>
                      <div className="font-bold">1427</div>
                    </div>
                  </div>
                </div>

                {/* Bidding Controls */}
                <div className="flex items-center space-x-4">
                  {/* Timer Display */}
                  <div className="text-center">
                    <div className={`text-3xl font-bold font-mono ${
                      team.ownerId === user?.id ? 'bg-orange-500' : 
                      draftState.highestBid?.teamId === team.id ? 'bg-green-500' : 'bg-gray-600'
                    }`}>
                      {draftState.timeRemaining}
                    </div>
                    <div className="text-xs text-gray-400">SECONDS</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      ${draftState.highestBid?.amount || 1}
                    </div>
                    <div className="text-sm text-gray-400">
                      {draftState.highestBid?.teamName || 'Starting bid'}
                    </div>
                  </div>
                  
                  {canBid && (
                    <>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(parseInt(e.target.value) || 1)}
                          min={(draftState.highestBid?.amount || 0) + 1}
                          max={userTeam?.budget || 200}
                          className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-white"
                        />
                      </div>
                      
                      <button
                        onClick={() => handleBid(bidAmount)}
                        disabled={bidAmount <= (draftState.highestBid?.amount || 0) || bidAmount > (userTeam?.budget || 0)}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-full font-bold transition-colors"
                      >
                        BID ${bidAmount}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Player List */}
          <div className={`bg-gray-800 rounded-lg ${
            !isPlayerPoolCollapsed ? 'fixed inset-x-4 bottom-4 top-80 z-50 shadow-2xl' : ''
          }`}>
            {/* Player Pool Header with Collapse Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Player Pool</h3>
              <button
                onClick={() => setIsPlayerPoolCollapsed(!isPlayerPoolCollapsed)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                {isPlayerPoolCollapsed ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Filters */}
            <div className={`p-4 border-b border-gray-700 ${isPlayerPoolCollapsed ? 'hidden' : ''}`}>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Find players"
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                {positions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      positionFilter === pos
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pos}
                    {pos !== 'ALL' && (
                      <span className="ml-1 text-xs opacity-75">
                        0/{pos === 'QB' ? '1' : pos === 'K' ? '1' : pos === 'DEF' ? '1' : '2'}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showWatchlist}
                    onChange={(e) => setShowWatchlist(e.target.checked)}
                    className="rounded"
                  />
                  <span>WATCHLIST</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showDrafted}
                    onChange={(e) => setShowDrafted(e.target.checked)}
                    className="rounded"
                  />
                  <span>SHOW DRAFTED</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showRookies}
                    onChange={(e) => setShowRookies(e.target.checked)}
                    className="rounded"
                  />
                  <span>ROOKIES ONLY</span>
                </label>
              </div>
            </div>

            {/* Player Table */}
            <div className={`${isPlayerPoolCollapsed ? 'hidden' : 'overflow-auto h-96'}`}>
              <table className="w-full">
                <thead className="bg-gray-700 text-xs text-gray-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">RK</th>
                    <th className="px-4 py-3 text-left">PLAYER</th>
                    <th className="px-4 py-3 text-center">$PROJ</th>
                    <th className="px-4 py-3 text-center">BYE</th>
                    <th className="px-4 py-3 text-center">PTS</th>
                    <th className="px-4 py-3 text-center">ATT</th>
                    <th className="px-4 py-3 text-center">YDS</th>
                    <th className="px-4 py-3 text-center">TD</th>
                    <th className="px-4 py-3 text-center">TAR</th>
                    <th className="px-4 py-3 text-center">YDS</th>
                    <th className="px-4 py-3 text-center">TD</th>
                    <th className="px-4 py-3 text-center">ATT</th>
                    <th className="px-4 py-3 text-center">YDS</th>
                    <th className="px-4 py-3 text-center">TD</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, index) => (
                    <tr
                      key={player.id}
                      className={`border-b border-gray-700 hover:bg-gray-750 cursor-pointer ${
                        selectedPlayer?.id === player.id ? 'bg-gray-700' : ''
                      }`}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToQueue(player);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium">{player.rank}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {player.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player.name}
                              className="w-8 h-8 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=${player.name.charAt(0)}`;
                              }}
                            />
                          ) : (
                          <img
                            src={`https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=${player.name.charAt(0)}`}
                            alt={player.name}
                            className="w-8 h-8 rounded"
                          />
                          )}
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-400 flex items-center space-x-2">
                              <span>{player.position} • {player.team}</span>
                              {player.injury && (
                                <span className="text-red-400 text-xs">
                                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                                  {player.injury.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">${Math.round(player.adp || 0)}</td>
                      <td className="px-4 py-3 text-center text-sm">{player.byeWeek || '-'}</td>
                      <td className="px-4 py-3 text-center font-medium">{player.projectedPoints}</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3 text-center text-sm">-</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWatchlist(player.id);
                            }}
                            className={`${
                              watchlist.includes(player.id) ? 'text-yellow-400' : 'text-gray-400'
                            } hover:text-yellow-400`}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          {canNominate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNominatePlayer(player);
                              }}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold"
                            >
                              NOMINATE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {[
              { id: 'queue', label: 'QUEUE' },
              { id: 'results', label: 'RESULTS' },
              { id: 'chat', label: 'CHAT' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
                {tab.id === 'chat' && chatMessages.length > 0 && (
                  <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1">
                    {chatMessages.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 h-full">
            {activeTab === 'queue' && (
              <div>
                {queue.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400 mb-2">No players in your queue</p>
                    <p className="text-sm text-gray-500">Add to queue from player list</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-400">{index + 1}</span>
                          {player.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player.name}
                              className="w-8 h-8 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=${player.name.charAt(0)}`;
                              }}
                            />
                          ) : (
                          <img
                            src={`https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=${player.name.charAt(0)}`}
                            alt={player.name}
                            className="w-8 h-8 rounded"
                          />
                          )}
                          <div>
                            <div className="font-medium text-sm">{player.name}</div>
                            <div className="text-xs text-gray-400">{player.position} • {player.team}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {canNominate && (
                            <button
                              onClick={() => handleNominatePlayer(player)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold"
                            >
                              NOMINATE
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFromQueue(player.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div className="space-y-2">
                {draftState.draftedPlayers.slice(-10).reverse().map((draftedPlayer, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{draftedPlayer.player.name}</span>
                      <span className="text-green-400 font-bold">${draftedPlayer.winningBid?.amount}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {draftedPlayer.player.position} • {draftedPlayer.winningBid?.teamName}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-full max-h-96">
                <div className="flex-1 space-y-2 mb-4 overflow-y-auto">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="p-2 bg-gray-700 rounded text-sm">
                      <span className={`font-medium ${
                        msg.username === user?.username ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        {msg.username}:
                      </span>
                      <span className="ml-2">{msg.message}</span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>
                <form onSubmit={handleSendChatMessage} className="flex space-x-2 mt-auto">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendChatMessage(e);
                      }
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nomination Modal */}
      {showNominationModal && playerToNominate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4">Nominate Player</h3>
            <div className="flex items-center space-x-4 mb-4">
              {playerToNominate.photoUrl ? (
                <img
                  src={playerToNominate.photoUrl}
                  alt={playerToNominate.name}
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://via.placeholder.com/64x64/3B82F6/FFFFFF?text=${playerToNominate.name.charAt(0)}`;
                  }}
                />
              ) : (
                <img
                  src={`https://via.placeholder.com/64x64/3B82F6/FFFFFF?text=${playerToNominate.name.charAt(0)}`}
                  alt={playerToNominate.name}
                  className="w-16 h-16 rounded-lg"
                />
              )}
              <div>
                <h4 className="font-bold">{playerToNominate.name}</h4>
                <p className="text-gray-400">{playerToNominate.position} • {playerToNominate.team}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Starting Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={userTeam?.budget || 200}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Your budget: ${userTeam?.budget || 0}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmNomination}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Nominate for ${startingPrice}
              </button>
              <button
                onClick={() => {
                  setShowNominationModal(false);
                  setPlayerToNominate(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
                  </div>
        </div>
      )}
    </div>
  );
};

export default SleeperDraftBoard;