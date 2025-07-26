# Fantasy Football Auction Draft Application

A modern, real-time fantasy football auction draft application built with React, TypeScript, and Tailwind CSS.

## 🏈 Features

- **Real-time Auction Draft**: Live bidding with WebSocket connections
- **Sleeper-style Interface**: Professional draft board with collapsible player pool
- **Commissioner Controls**: Start/pause draft functionality
- **Team Management**: Roster tracking and budget management
- **Player Database**: Integration with Sleeper API for current player data
- **Draft History**: Track previous drafts and performance
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fantasy-football-draft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Start the backend server** (in a separate terminal)
   ```bash
   npm run server
   ```

5. **Run both frontend and backend together**
   ```bash
   npm run dev:full
   ```

## 🎮 Demo Credentials

### Commissioner Account
- **Username**: `commissioner`
- **Password**: `draft2024`

### User Accounts
- **Username**: `user1` - `user11`
- **Password**: `password1` - `password11`

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite (in-memory for demo)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Netlify

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Login.tsx       # Authentication
│   ├── MainDashboard.tsx # Main dashboard
│   ├── SleeperDraftBoard.tsx # Main draft interface
│   ├── DraftBoard.tsx  # Auction controls
│   ├── PlayerList.tsx  # Available players
│   ├── TeamRoster.tsx  # Team management
│   └── ...
├── context/            # React context providers
│   ├── AuthContext.tsx # Authentication state
│   └── SocketContext.tsx # WebSocket connection
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── ...

server/
├── index.js           # Express server with Socket.io
└── ...
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3001
```

### Netlify Deployment
The project includes a `netlify.toml` file for proper deployment configuration.

## 🎯 Key Features

### Draft Interface
- **Real-time bidding** with live updates
- **Player search and filtering** by position, team, etc.
- **Queue management** for draft strategy
- **Team roster grids** showing all 12 teams
- **Collapsible player pool** for better screen space

### Commissioner Tools
- **Start/Pause draft** controls in gear menu
- **Player data updates** from Sleeper API
- **Draft history management**
- **League settings** configuration

### Player Management
- **Live player data** from Sleeper API
- **Injury status** and updates
- **Projected points** and rankings
- **Historical performance** data

## 🚀 Deployment

### Automatic Deployment with Netlify + GitHub

1. **Push your code to GitHub**
2. **Connect your Netlify site to the GitHub repository**
3. **Set build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Every push to main branch automatically deploys**

### Manual Deployment

```bash
npm run build
# Upload the 'dist' folder to your hosting provider
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for fantasy football enthusiasts**