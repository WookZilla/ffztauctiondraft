import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDraftData } from '../hooks/useDraftData';
import { Clock, Trophy, DollarSign, Users, Star, TrendingUp, ArrowLeft, Eye } from 'lucide-react';
import { Player, Team } from '../types';

interface EnhancedDraftBoardProps {
  onBackToDashboard: () => void;
}

const EnhancedDraftBoard: React.FC<EnhancedDraftBoardProps> = ({ onBackToDashboard }) => {
  const { user } = useAuth();
  const { players, teams, draftState, loading, nominatePlayer, placeBid } = useDraftData();
  const [selectedTeamId, setSelectedTeamId] = useState(user?.teamId || '');
  const [bidAmount, setBidAmount] = useState<number>(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading draft data...</p>
        </div>
      </div>
    );
  }

  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  const userTeam = teams.find(team => team.id === user?.teamId);
  const availablePlayers = players
    .filter(player => !draftState.draftedPlayers.some(dp => dp.player.id === player.id))
    .slice(0, 20);

  const canNominate = draftState.currentNominator === userTeam?.id && !draftState.isActive;
  const canBid = userTeam && bidAmount <= userTeam.budget && draftState.isActive;

  const handlePlaceBid = (amount: number) => {
    if (user && userTeam) {
      placeBid(amount, user.id, user.username, userTeam.name);
    }
  };

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bidAmount > (draftState.highestBid?.amount || 0)) {
      handlePlaceBid(bidAmount);
    }
  };

  const getPositionPlayers = (position: string) => {
    return selectedTeam?.players.filter(player => player.position === position) || [];
  };

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToDashboard}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Draft Board</h1>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Round {draftState.currentRound}/15
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium text-gray-800">{user?.username}</p>
                <p className="text-sm text-gray-600">{userTeam?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Auction */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Auction */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                  Current Auction
                </h2>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-red-500" />
                  <span className={`text-xl font-mono font-bold ${
                    draftState.timeRemaining <= 10 ? 'text-red-500' : 'text-gray-800'
                  }`}>
                    {Math.floor(draftState.timeRemaining / 60)}:{(draftState.timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {draftState.nominatedPlayer ? (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {draftState.nominatedPlayer.name}
                    </h3>
                    <div className="flex justify-center items-center space-x-4 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                        {draftState.nominatedPlayer.position}
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-semibold">
                        {draftState.nominatedPlayer.team}
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold">
                        Rank #{draftState.nominatedPlayer.rank}
                      </span>
                    </div>
                    <div className="flex justify-center space-x-6 text-sm text-gray-600">
                      {draftState.nominatedPlayer.projectedPoints && (
                        <span className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {draftState.nominatedPlayer.projectedPoints} proj pts
                        </span>
                      )}
                      {draftState.nominatedPlayer.lastYearPoints && (
                        <span>Last year: {draftState.nominatedPlayer.lastYearPoints} pts</span>
                      )}
                    </div>
                  </div>

                  {/* Current Bid */}
                  {draftState.highestBid ? (
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Highest Bid</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${draftState.highestBid.amount}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Leading Team</p>
                          <p className="font-bold text-gray-800">{draftState.highestBid.teamName}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-4 mb-4 text-center">
                      <p className="text-lg text-gray-600">No bids yet - Starting at $1</p>
                    </div>
                  )}

                  {/* Bidding Form */}
                  {canBid && (
                    <form onSubmit={handleBidSubmit} className="flex space-x-3">
                      <div className="flex-1">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(parseInt(e.target.value) || 1)}
                            min={(draftState.highestBid?.amount || 0) + 1}
                            max={userTeam?.budget || 200}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter bid amount"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Place Bid
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Waiting for player nomination...</p>
                  {canNominate && (
                    <p className="text-blue-600 font-semibold mt-2">It's your turn to nominate!</p>
                  )}
                </div>
              )}
            </div>

            {/* Team Rosters */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <Users className="w-6 h-6 mr-2 text-blue-500" />
                  Team Rosters
                </h3>
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-gray-500" />
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} {team.id === user?.teamId ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedTeam && (
                <>
                  {/* Team Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Players</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedTeam.players.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Remaining Budget</p>
                      <p className="text-2xl font-bold text-green-600">${selectedTeam.budget}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Projected Points</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedTeam.players.reduce((sum, p) => sum + (p.projectedPoints || 0), 0).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Roster by Position */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {positions.map(position => {
                      const positionPlayers = getPositionPlayers(position);
                      return (
                        <div key={position} className="border border-gray-200 rounded-lg p-3">
                          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                              {position}
                            </span>
                            ({positionPlayers.length})
                          </h4>
                          {positionPlayers.length > 0 ? (
                            <div className="space-y-1">
                              {positionPlayers.map(player => (
                                <div key={player.id} className="text-sm">
                                  <p className="font-medium text-gray-800">{player.name}</p>
                                  <p className="text-xs text-gray-600">{player.team}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Empty</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Available Players */}
          <div className="space-y-6">
            {/* Top Available Players */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Star className="w-6 h-6 mr-2 text-yellow-500" />
                Top 20 Available
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          #{player.rank}
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {player.position}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800 text-sm">{player.name}</h4>
                      <p className="text-xs text-gray-600">{player.team}</p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        {player.projectedPoints && (
                          <span className="flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {player.projectedPoints}
                          </span>
                        )}
                        {player.lastYearPoints && (
                          <span>Last: {player.lastYearPoints}</span>
                        )}
                      </div>
                    </div>
                    {canNominate && (
                      <button
                        onClick={() => nominatePlayer(player)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                      >
                        Nominate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Team Budgets */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                Team Budgets
              </h3>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`flex justify-between items-center p-2 rounded ${
                      team.id === user?.teamId 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-sm truncate">{team.name}</span>
                    <span className="text-sm font-bold text-green-600">${team.budget}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDraftBoard;