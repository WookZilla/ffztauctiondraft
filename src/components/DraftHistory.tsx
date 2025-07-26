import React, { useState, useEffect } from 'react';
import { History, Trophy, TrendingUp, Calendar, User } from 'lucide-react';

interface DraftHistoryEntry {
  id: string;
  year: number;
  league_id: string;
  player_id: string;
  player_name: string;
  draft_position: number;
  fantasy_points: number | null;
}

const DraftHistory: React.FC = () => {
  const [draftHistory, setDraftHistory] = useState<DraftHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [sleeperLeagueId, setSleeperLeagueId] = useState('');

  useEffect(() => {
    fetchDraftHistory();
  }, []);

  const fetchDraftHistory = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/draft-history');
      const data = await response.json();
      setDraftHistory(data);
    } catch (error) {
      console.error('Error fetching draft history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSleeperHistory = async () => {
    if (!sleeperLeagueId.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/draft-history/${sleeperLeagueId}`);
      const data = await response.json();
      await fetchDraftHistory(); // Refresh the local data
    } catch (error) {
      console.error('Error fetching Sleeper history:', error);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from(new Set(draftHistory.map(entry => entry.year))).sort((a, b) => b - a);
  
  const filteredHistory = selectedYear === 'all' 
    ? draftHistory 
    : draftHistory.filter(entry => entry.year === selectedYear);

  const groupedByYear = filteredHistory.reduce((acc, entry) => {
    if (!acc[entry.year]) {
      acc[entry.year] = [];
    }
    acc[entry.year].push(entry);
    return acc;
  }, {} as Record<number, DraftHistoryEntry[]>);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading draft history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <History className="w-6 h-6 mr-2 text-purple-500" />
          Draft History
        </h3>
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sleeper Integration */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-3">Import from Sleeper</h4>
        <div className="flex space-x-3">
          <input
            type="text"
            value={sleeperLeagueId}
            onChange={(e) => setSleeperLeagueId(e.target.value)}
            placeholder="Enter Sleeper League ID"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={fetchSleeperHistory}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Import History
          </button>
        </div>
        <p className="text-sm text-blue-600 mt-2">
          Enter your Sleeper league ID to import previous draft history and fantasy points
        </p>
      </div>

      {/* Draft History Display */}
      {Object.keys(groupedByYear).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No draft history available</p>
          <p className="text-sm">Import your Sleeper league history to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByYear)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, entries]) => (
              <div key={year} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {year} Season
                  </h4>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {entries.length} picks
                  </span>
                </div>

                <div className="grid gap-3">
                  {entries
                    .sort((a, b) => a.draft_position - b.draft_position)
                    .slice(0, 20) // Show top 20 picks
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold min-w-[3rem] text-center">
                            #{entry.draft_position}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{entry.player_name}</p>
                            <p className="text-sm text-gray-600">Pick {entry.draft_position}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {entry.fantasy_points && (
                            <p className="text-sm text-green-600 flex items-center">
                              <TrendingUp className="w-4 h-4 mr-1" />
                              {entry.fantasy_points} pts
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {entries.length > 20 && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500">
                      Showing top 20 of {entries.length} picks
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default DraftHistory;