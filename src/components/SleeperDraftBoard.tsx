import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useDraftData } from '../hooks/useDraftData';
import { Clock, Plus, Search, MessageCircle, Settings, ArrowLeft, Star, TrendingUp, ChevronUp, ChevronDown, Play, Pause, MoreVertical } from 'lucide-react';
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

  const userTeam = teams.find(team => team.ownerId === user?.id);
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const ROOM_ID = 'main-draft-room';

  // Filter players based on current filters
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    const matchesWatchlist = !showWatchlist || watchlist.includes(player.id);
    const matchesDrafted = !showDrafted || draftState.draftedPlayers.some(dp => dp.player.id === player.id);
    const matchesRookies = !showRookies || (player.experience && player.experience <= 1);
    
    return matchesSearch && matchesPosition && matchesWatchlist && !matchesDrafted && !matchesRookies;
  }).slice(0, 20);

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

  const handleBid = (amount: number) => {
    if (user && userTeam && selectedPlayer) {
      placeBid(amount, user.id, user.username, userTeam.name);
    }
  };

  const handleStartDraft = () => {
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
          {selectedPlayer && (
            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={`https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${selectedPlayer.name.charAt(0)}`}
                  alt={selectedPlayer.name}
                  className="w-20 h-20 rounded-lg"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedPlayer.name}</h2>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <span>{selectedPlayer.position}</span>
                    <span>•</span>
                    <span>{selectedPlayer.team}</span>
                    <span>•</span>
                    <span>Proj ${selectedPlayer.projectedPoints}</span>
                  </div>
                  
                  {/* Player Stats */}
                  <div className="grid grid-cols-5 gap-4 mt-3 text-center">
                    <div>
                      <div className="text-sm text-gray-400">POINTS</div>
                      <div className="font-bold">{selectedPlayer.projectedPoints}</div>
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
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      ${draftState.highestBid?.amount || 1}
                    </div>
                    <div className="text-sm text-gray-400">
                      {draftState.highestBid?.teamName || 'Starting bid'}
                    </div>
                  </div>
                  
                  <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={() => handleBid((draftState.highestBid?.amount || 0) + 1)}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full font-bold transition-colors"
                  >
                    OFFER ${(draftState.highestBid?.amount || 0) + 1}
                  </button>
                  
                  <button className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-full font-bold transition-colors">
                    PASS
                  </button>
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
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={`https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=${player.name.charAt(0)}`}
                            alt={player.name}
                            className="w-8 h-8 rounded"
                          />
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-400">{player.position} • {player.team}</div>
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
                          <img
                            src={`https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=${player.name.charAt(0)}`}
                            alt={player.name}
                            className="w-8 h-8 rounded"
                          />
                          <div>
                            <div className="font-medium text-sm">{player.name}</div>
                            <div className="text-xs text-gray-400">{player.position} • {player.team}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromQueue(player.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          ×
                        </button>
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
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-2 mb-4">
                  <div className="p-2 bg-gray-700 rounded text-sm">
                    <span className="text-blue-400 font-medium">Commissioner:</span> Draft starting soon!
                  </div>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors">
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SleeperDraftBoard;