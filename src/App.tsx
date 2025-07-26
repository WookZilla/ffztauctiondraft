import React from 'react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import MainDashboard from './components/MainDashboard';
import SleeperDraftBoard from './components/SleeperDraftBoard';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'draft'>('dashboard');

  if (!user) {
    return <Login />;
  }

  if (currentView === 'draft') {
    return (
      <ErrorBoundary>
        <SleeperDraftBoard onBackToDashboard={() => setCurrentView('dashboard')} />
      </ErrorBoundary>
    );
  }

  return <MainDashboard onEnterDraft={() => setCurrentView('draft')} />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;