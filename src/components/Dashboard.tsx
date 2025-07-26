import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useDraftData } from '../hooks/useDraftData';
import DraftBoard from './DraftBoard';
import PlayerList from './PlayerList';
import TeamRoster from './TeamRoster';
import DraftHistory from './DraftHistory';
import CommissionerControls from './CommissionerControls';
import { LogOut, Home, Users, List, Settings, History, Crown } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { players, teams, draftState, loading, nominatePlayer, placeBid } = useDraftData();
  const [activeTab, setActiveTab] = useState<'draft' | 'players' | 'rosters' | 'history' | 'commissioner' | 'settings'>('draft');

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

  const userTeam = teams.find(team => team.ownerId === user?.id);
  const canNominate = draftState.currentNominator === userTeam?.id && !draftState.isActive;

  const handlePlaceBid = (amount: number) => {
    if (user && userTeam) {
      placeBid(amount, user.id, user.username, userTeam.name);
    }
  };

  const tabs = [
    { id: 'draft', label: 'Draft Board', icon: Home },
    { id: 'players', label: 'Players', icon: List },
    { id: 'rosters', label: 'Rosters', icon: Users },
    { id: 'history', label: 'Draft History', icon: History },
    ...(user?.role === 'commissioner' ? [{ id: 'commissioner', label: 'Commissioner', icon: Crown }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Fantasy Draft</h1>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {user?.role.toUpperCase()}
              </span>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium text-gray-800">{user?.username}</p>
                <p className="text-sm text-gray-600">{userTeam?.name}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'draft' && (
          <DraftBoard
            draftState={draftState}
            teams={teams}
            onPlaceBid={handlePlaceBid}
            userTeamId={userTeam?.id || ''}
          />
        )}

        {activeTab === 'players' && (
          <PlayerList
            players={players}
            onNominatePlayer={nominatePlayer}
            canNominate={canNominate}
            draftedPlayerIds={draftState.draftedPlayers.map(dp => dp.player.id)}
          />
        )}

        {activeTab === 'rosters' && (
          <TeamRoster
            teams={teams}
            currentUserTeamId={userTeam?.id || ''}
          />
        )}

        {activeTab === 'history' && (
          <DraftHistory />
        )}

        {activeTab === 'commissioner' && user?.role === 'commissioner' && (
          <CommissionerControls
            draftState={draftState}
          />
        )}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Draft Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teams
                  </label>
                  <p className="text-lg font-semibold">12</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget per Team
                  </label>
                  <p className="text-lg font-semibold">$200</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Draft Rounds
                  </label>
                  <p className="text-lg font-semibold">15</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Timer
                  </label>
                  <p className="text-lg font-semibold">60 seconds</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sleeper League ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Sleeper League ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;