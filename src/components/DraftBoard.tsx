import React, { useState, useEffect } from 'react';
import { Clock, Trophy, DollarSign, Users } from 'lucide-react';
import { Player, Bid, DraftState, Team } from '../types';

interface DraftBoardProps {
  draftState: DraftState;
  teams: Team[];
  onPlaceBid: (amount: number) => void;
  userTeamId: string;
}

const DraftBoard: React.FC<DraftBoardProps> = ({
  draftState,
  teams,
  onPlaceBid,
  userTeamId,
}) => {
  const [bidAmount, setBidAmount] = useState<number>(1);
  const [timeDisplay, setTimeDisplay] = useState<string>('--:--');

  useEffect(() => {
    if (draftState.timeRemaining > 0) {
      const minutes = Math.floor(draftState.timeRemaining / 60);
      const seconds = draftState.timeRemaining % 60;
      setTimeDisplay(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [draftState.timeRemaining]);

  useEffect(() => {
    if (draftState.highestBid) {
      setBidAmount(draftState.highestBid.amount + 1);
    }
  }, [draftState.highestBid]);

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bidAmount > (draftState.highestBid?.amount || 0)) {
      onPlaceBid(bidAmount);
    }
  };

  const userTeam = teams.find(team => team.id === userTeamId);
  const canBid = userTeam && bidAmount <= userTeam.budget && draftState.isActive;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Draft Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Trophy className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Round {draftState.currentRound}/15</h2>
            <p className="text-gray-600">Auction Draft in Progress</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-5 h-5 text-red-500" />
            <span className={`text-2xl font-mono font-bold ${
              draftState.timeRemaining <= 10 ? 'text-red-500' : 'text-gray-800'
            }`}>
              {timeDisplay}
            </span>
          </div>
          <p className="text-sm text-gray-500">Time Remaining</p>
        </div>
      </div>

      {/* Nominated Player */}
      {draftState.nominatedPlayer && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
          <div className="text-center">
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
          </div>

          {/* Current Bid Display */}
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

          {!canBid && draftState.isActive && (
            <div className="text-center py-3">
              <p className="text-gray-600">
                {!userTeam || bidAmount > userTeam.budget 
                  ? 'Insufficient budget' 
                  : 'Waiting for next nomination...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Bids */}
      {draftState.currentBids.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Recent Bids</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {draftState.currentBids.slice(-5).reverse().map((bid, index) => (
              <div key={bid.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{bid.teamName}</span>
                <span className="text-green-600 font-bold">${bid.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Budgets */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Team Budgets
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`p-3 rounded-lg border ${
                team.id === userTeamId 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <p className="font-medium text-sm truncate">{team.name}</p>
              <p className="text-lg font-bold text-green-600">${team.budget}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DraftBoard;