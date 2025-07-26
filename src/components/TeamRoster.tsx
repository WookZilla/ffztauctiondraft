import React, { useState } from 'react';
import { Users, TrendingUp, DollarSign, Eye } from 'lucide-react';
import { Team, Player } from '../types';

interface TeamRosterProps {
  teams: Team[];
  currentUserTeamId: string;
}

const TeamRoster: React.FC<TeamRosterProps> = ({ teams, currentUserTeamId }) => {
  const [selectedTeamId, setSelectedTeamId] = useState(currentUserTeamId);

  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  const userTeam = teams.find(team => team.id === currentUserTeamId);

  const getPositionPlayers = (position: string) => {
    return selectedTeam?.players.filter(player => player.position === position) || [];
  };

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  return (
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
                {team.name} {team.id === currentUserTeamId ? '(You)' : ''}
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
          <div className="space-y-4">
            {positions.map(position => {
              const positionPlayers = getPositionPlayers(position);
              return (
                <div key={position} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 flex items-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
                        {position}
                      </span>
                      ({positionPlayers.length})
                    </h4>
                  </div>

                  {positionPlayers.length > 0 ? (
                    <div className="space-y-2">
                      {positionPlayers.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{player.name}</p>
                            <p className="text-sm text-gray-600">{player.team}</p>
                          </div>
                          <div className="text-right">
                            {player.projectedPoints && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                {player.projectedPoints} pts
                              </p>
                            )}
                            <p className="text-xs text-gray-500">Rank #{player.rank}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No {position} players drafted</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default TeamRoster;