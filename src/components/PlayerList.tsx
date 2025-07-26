import React, { useState } from 'react';
import { Search, Filter, Star, TrendingUp } from 'lucide-react';
import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  onNominatePlayer: (player: Player) => void;
  canNominate: boolean;
  draftedPlayerIds: string[];
}

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  onNominatePlayer,
  canNominate,
  draftedPlayerIds,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const teams = ['ALL', ...Array.from(new Set(players.map(p => p.team))).sort()];

  const filteredPlayers = players
    .filter(player => !draftedPlayerIds.includes(player.id))
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
      const matchesTeam = teamFilter === 'ALL' || player.team === teamFilter;
      return matchesSearch && matchesPosition && matchesTeam;
    })
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Star className="w-6 h-6 mr-2 text-yellow-500" />
          Available Players
        </h3>
        <div className="text-sm text-gray-600">
          {filteredPlayers.length} players available
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos === 'ALL' ? 'All Positions' : pos}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {teams.map(team => (
                <option key={team} value={team}>{team === 'ALL' ? 'All Teams' : team}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold min-w-[3rem] text-center">
                #{player.rank}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{player.name}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded">{player.position}</span>
                  <span>{player.team}</span>
                  {player.projectedPoints && (
                    <span className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {player.projectedPoints} pts
                    </span>
                  )}
                </div>
                {player.lastYearPoints && (
                  <span className="text-xs text-gray-500">
                    Last: {player.lastYearPoints} pts
                  </span>
                )}
                {player.injury && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                    {player.injury.status}
                  </span>
                )}
              </div>
            </div>

            {canNominate && (
              <button
                onClick={() => onNominatePlayer(player)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Nominate
              </button>
            )}
          </div>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No players found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default PlayerList;