import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Trophy, Users, LogOut, Upload } from 'lucide-react';

interface MainDashboardProps {
  onEnterDraft: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onEnterDraft }) => {
  const { user, logout, updateTeam } = useAuth();
  const [teamName, setTeamName] = useState(user?.teamName || '');
  const [teamLogo, setTeamLogo] = useState(user?.teamLogo || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;
    
    setIsSaving(true);
    const success = await updateTeam(teamName, teamLogo);
    if (success) {
      setIsEditing(false);
    } else {
      alert('Failed to update team information');
    }
    setIsSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTeamLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium text-gray-800">{user?.username}</p>
                <p className="text-sm text-gray-600">{user?.teamName}</p>
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Settings className="w-6 h-6 mr-2 text-blue-500" />
                Team Settings
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Edit Team
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Team Logo */}
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={teamLogo || `https://via.placeholder.com/120x120/3B82F6/FFFFFF?text=${teamName.charAt(0)}`}
                    alt="Team Logo"
                    className="w-24 h-24 rounded-full border-4 border-gray-200 object-cover"
                  />
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your team name"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-800 bg-gray-50 px-4 py-3 rounded-lg">
                    {user?.teamName}
                  </p>
                )}
              </div>

              {isEditing && (
                <div className="flex space-x-3">
                  <button
                    onClick={handleSaveTeam}
                    disabled={isSaving || !teamName.trim()}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setTeamName(user?.teamName || '');
                      setTeamLogo(user?.teamLogo || '');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Draft Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
              Draft Actions
            </h2>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Ready to Draft?
                </h3>
                <p className="text-gray-600 mb-4">
                  Join the live auction draft with your league mates
                </p>
                <button
                  onClick={onEnterDraft}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Enter Draft Room
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm text-gray-600">Teams</p>
                  <p className="text-xl font-bold text-gray-800">12</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm text-gray-600">Rounds</p>
                  <p className="text-xl font-bold text-gray-800">15</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* League Information */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">League Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">12-Team League</h3>
              <p className="text-sm text-gray-600">Auction Draft Format</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">$200 Budget</h3>
              <p className="text-sm text-gray-600">Per Team Salary Cap</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Settings className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">15 Rounds</h3>
              <p className="text-sm text-gray-600">Live Auction Format</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainDashboard;