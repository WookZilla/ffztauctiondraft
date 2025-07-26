import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Play, Pause, RotateCcw, Settings, Users, RefreshCw } from 'lucide-react';
import { DraftState } from '../types';

interface CommissionerControlsProps {
  draftState: DraftState;
}

const CommissionerControls: React.FC<CommissionerControlsProps> = ({ draftState }) => {
  const { socket } = useSocket();
  const [sleeperLeagueId, setSleeperLeagueId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const ROOM_ID = 'main-draft-room';

  const handleStartDraft = () => {
    if (socket) {
      socket.emit('start-draft', ROOM_ID);
    }
  };

  const handleTogglePause = () => {
    if (socket) {
      socket.emit('toggle-draft-pause', ROOM_ID);
    }
  };

  const handleUpdatePlayerData = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('http://localhost:3001/api/update-sleeper-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leagueId: sleeperLeagueId }),
      });
      
      if (response.ok) {
        alert('Player data updated successfully!');
      } else {
        alert('Failed to update player data');
      }
    } catch (error) {
      console.error('Error updating player data:', error);
      alert('Error updating player data');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Draft Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-500" />
          Draft Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Draft Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Draft Status</h4>
            <div className="space-y-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                draftState.isStarted 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  draftState.isStarted ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
                <span>{draftState.isStarted ? 'STARTED' : 'NOT STARTED'}</span>
              </div>
              
              {draftState.isStarted && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                  draftState.isPaused 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    draftState.isPaused ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <span>{draftState.isPaused ? 'PAUSED' : 'ACTIVE'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Draft Actions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Actions</h4>
            <div className="space-y-2">
              {!draftState.isStarted ? (
                <button
                  onClick={handleStartDraft}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Draft
                </button>
              ) : (
                <button
                  onClick={handleTogglePause}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center ${
                    draftState.isPaused
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  {draftState.isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume Draft
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Draft
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Draft Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Progress</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Round:</span>
                <span className="font-semibold">{draftState.currentRound}/15</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Players Drafted:</span>
                <span className="font-semibold">{draftState.draftedPlayers.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(draftState.draftedPlayers.length / 180) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Data Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <RefreshCw className="w-6 h-6 mr-2 text-green-500" />
          Player Data Management
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sleeper League ID (Optional)
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={sleeperLeagueId}
                onChange={(e) => setSleeperLeagueId(e.target.value)}
                placeholder="Enter Sleeper League ID for historical data"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleUpdatePlayerData}
                disabled={isUpdating}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Data
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Updates player rankings, projections, and injury status from Sleeper API. 
              Include League ID to import historical fantasy points.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Data Sources</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Player rankings and projections from Sleeper API</li>
              <li>• Real-time injury status and updates</li>
              <li>• Historical fantasy points from previous seasons</li>
              <li>• Average Draft Position (ADP) data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* League Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Users className="w-6 h-6 mr-2 text-purple-500" />
          League Settings
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Teams</p>
            <p className="text-xl font-bold text-gray-800">12</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Budget</p>
            <p className="text-xl font-bold text-green-600">$200</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Rounds</p>
            <p className="text-xl font-bold text-blue-600">15</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Timer</p>
            <p className="text-xl font-bold text-purple-600">60s</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionerControls;