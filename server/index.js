const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    team_id TEXT,
    team_name TEXT,
    team_logo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    team TEXT NOT NULL,
    rank INTEGER NOT NULL,
    projectedPoints REAL,
    adp REAL,
    byeWeek INTEGER,
    isDrafted BOOLEAN DEFAULT 0,
    lastYearPoints REAL,
    sleeperId TEXT,
    age INTEGER,
    experience INTEGER,
    injuryStatus TEXT,
    injuryDescription TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS draft_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    settings TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    budget INTEGER DEFAULT 200,
    players TEXT DEFAULT '[]',
    FOREIGN KEY (room_id) REFERENCES draft_rooms (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    team_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES draft_rooms (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS draft_history (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    league_id TEXT,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    draft_position INTEGER,
    fantasy_points REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Pre-register users (run this once to set up your league)
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES draft_rooms (id)
  )`);
const preRegisteredUsers = [
  { username: 'commissioner', password: 'draft2024', role: 'commissioner', teamName: 'Commissioner Team' },
  { username: 'user1', password: 'password1', role: 'user', teamName: 'Team Alpha' },
  { username: 'user2', password: 'password2', role: 'user', teamName: 'Team Beta' },
  { username: 'user3', password: 'password3', role: 'user', teamName: 'Team Gamma' },
  { username: 'user4', password: 'password4', role: 'user', teamName: 'Team Delta' },
  { username: 'user5', password: 'password5', role: 'user', teamName: 'Team Epsilon' },
  { username: 'user6', password: 'password6', role: 'user', teamName: 'Team Zeta' },
  { username: 'user7', password: 'password7', role: 'user', teamName: 'Team Eta' },
  { username: 'user8', password: 'password8', role: 'user', teamName: 'Team Theta' },
  { username: 'user9', password: 'password9', role: 'user', teamName: 'Team Iota' },
  { username: 'user10', password: 'password10', role: 'user', teamName: 'Team Kappa' },
  { username: 'user11', password: 'password11', role: 'user', teamName: 'Team Lambda' },
];

// Initialize pre-registered users
db.serialize(() => {
  const stmt = db.prepare(`INSERT OR REPLACE INTO users 
    (id, username, password, role, team_id, team_name, team_logo) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  
  preRegisteredUsers.forEach((user, index) => {
    const userId = `user-${index + 1}`;
    const teamId = `team-${index + 1}`;
    stmt.run(
      userId,
      user.username,
      user.password,
      user.role,
      teamId,
      user.teamName,
      'https://via.placeholder.com/100x100/3B82F6/FFFFFF?text=' + user.teamName.charAt(0)
    );
  });
  
  stmt.finalize();
  console.log('Pre-registered users initialized');
  
  // Verify users were created
  db.all('SELECT username, role FROM users', (err, rows) => {
    if (err) {
      console.error('Error checking users:', err);
    } else {
      console.log('Users in database:', rows);
    }
  });
});

// Store active draft rooms and their states
const draftRooms = new Map();
const timers = new Map();

// Enhanced Sleeper API functions with injury and news data
// Sleeper API functions
async function fetchSleeperPlayers() {
  try {
    console.log('Fetching player data from Sleeper API...');
    
    // Fetch all NFL players from Sleeper
    const playersResponse = await axios.get('https://api.sleeper.app/v1/players/nfl');
    const sleeperPlayers = playersResponse.data;
    
    // Filter for relevant fantasy positions and active players
    const relevantPlayers = Object.values(sleeperPlayers)
      .filter(player => 
        player.active && 
        player.fantasy_positions && 
        ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].some(pos => player.fantasy_positions.includes(pos)) &&
        player.team
      )
      .slice(0, 300); // Limit to top 300 players for performance

    console.log(`Processing ${relevantPlayers.length} players from Sleeper...`);

    // Fetch trending players and ADP data
    const trendingResponse = await axios.get('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25');
    const trendingPlayers = trendingResponse.data || [];

    // Fetch injury reports from ESPN (mock for now)
    const injuryReports = await fetchInjuryReports();
    // Store players in database
    const stmt = db.prepare(`INSERT OR REPLACE INTO players 
      (id, name, position, team, rank, projectedPoints, adp, byeWeek, lastYearPoints, sleeperId, age, experience, injuryStatus, injuryDescription, newsUpdates, photoUrl) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    let rank = 1;
    relevantPlayers.forEach((player) => {
      const primaryPosition = player.fantasy_positions ? player.fantasy_positions[0] : 'FLEX';
      const projectedPoints = calculateProjectedPoints(player, primaryPosition);
      const lastYearPoints = player.stats ? (player.stats['2023'] ? calculateFantasyPoints(player.stats['2023']) : null) : null;
      const injuryInfo = injuryReports[player.player_id] || {};
      const photoUrl = `https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`;
      
      stmt.run(
        player.player_id,
        `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.full_name || 'Unknown',
        primaryPosition,
        player.team || 'FA',
        rank++,
        projectedPoints,
        Math.random() * 200 + 10, // Mock ADP for now
        Math.floor(Math.random() * 14) + 1, // Random bye week
        lastYearPoints,
        player.player_id,
        player.age,
        player.years_exp,
        player.injury_status || injuryInfo.status || null,
        player.injury_notes || injuryInfo.description || null,
        injuryInfo.news || null,
        photoUrl
      );
    });

    stmt.finalize();
    console.log(`Loaded ${relevantPlayers.length} players from Sleeper API`);
    return relevantPlayers;

  } catch (error) {
    console.error('Error fetching Sleeper data, falling back to mock data:', error);
    return await createMockPlayerData();
  }
}

// Fetch injury reports (mock implementation)
async function fetchInjuryReports() {
  try {
    // In a real implementation, you'd fetch from ESPN, NFL.com, or another source
    // For now, return mock injury data
    return {
      // Mock injury data
      'sample_player_id': {
        status: 'Questionable',
        description: 'Ankle injury',
        news: 'Expected to play this week'
      }
    };
  } catch (error) {
    console.error('Error fetching injury reports:', error);
    return {};
  }
}
// Calculate projected fantasy points based on position and stats
function calculateProjectedPoints(player, position) {
  if (!player.stats || !player.stats['2023']) {
    // Base projections by position if no stats available
    const baseProjections = {
      'QB': 280,
      'RB': 180,
      'WR': 160,
      'TE': 120,
      'K': 110,
      'DEF': 100
    };
    return baseProjections[position] || 100;
  }

  const stats = player.stats['2023'];
  let points = 0;

  // Standard fantasy scoring
  if (stats.pass_yd) points += stats.pass_yd * 0.04;
  if (stats.pass_td) points += stats.pass_td * 4;
  if (stats.pass_int) points -= stats.pass_int * 2;
  if (stats.rush_yd) points += stats.rush_yd * 0.1;
  if (stats.rush_td) points += stats.rush_td * 6;
  if (stats.rec_yd) points += stats.rec_yd * 0.1;
  if (stats.rec_td) points += stats.rec_td * 6;
  if (stats.rec) points += stats.rec * 1; // PPR

  return Math.round(points * 10) / 10;
}

// Calculate fantasy points from stats
function calculateFantasyPoints(stats) {
  let points = 0;
  if (stats.pass_yd) points += stats.pass_yd * 0.04;
  if (stats.pass_td) points += stats.pass_td * 4;
  if (stats.pass_int) points -= stats.pass_int * 2;
  if (stats.rush_yd) points += stats.rush_yd * 0.1;
  if (stats.rush_td) points += stats.rush_td * 6;
  if (stats.rec_yd) points += stats.rec_yd * 0.1;
  if (stats.rec_td) points += stats.rec_td * 6;
  if (stats.rec) points += stats.rec * 1;
  return Math.round(points * 10) / 10;
}

// Fallback mock data if Sleeper API fails
async function createMockPlayerData() {
  const mockPlayers = [
    { name: 'Josh Allen', position: 'QB', team: 'BUF', rank: 1, projectedPoints: 385.2, adp: 8.5, byeWeek: 12, lastYearPoints: 378.4 },
    { name: 'Lamar Jackson', position: 'QB', team: 'BAL', rank: 2, projectedPoints: 378.4, adp: 12.3, byeWeek: 14, lastYearPoints: 365.8 },
    { name: 'Christian McCaffrey', position: 'RB', team: 'SF', rank: 3, projectedPoints: 298.7, adp: 1.2, byeWeek: 9, lastYearPoints: 285.3 },
    { name: 'Tyreek Hill', position: 'WR', team: 'MIA', rank: 4, projectedPoints: 285.6, adp: 6.2, byeWeek: 6, lastYearPoints: 278.3 },
    { name: 'Travis Kelce', position: 'TE', team: 'KC', rank: 5, projectedPoints: 245.7, adp: 19.3, byeWeek: 10, lastYearPoints: 235.4 }
  ];

  const stmt = db.prepare(`INSERT OR REPLACE INTO players 
    (id, name, position, team, rank, projectedPoints, adp, byeWeek, lastYearPoints, sleeperId, age, experience, photoUrl) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  mockPlayers.forEach((player, index) => {
    const photoUrl = `https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=${player.name.split(' ').map(n => n.charAt(0)).join('')}`;
      stmt.run(
        `player-${index + 1}`,
        player.name,
        player.position,
        player.team,
        player.rank,
        player.projectedPoints,
        player.adp,
        player.byeWeek,
        player.lastYearPoints,
        `sleeper-${index + 1}`,
        25 + Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 15),
        photoUrl
      );
    });

    stmt.finalize();
    return mockPlayers;
}

// Fetch draft history from Sleeper league
async function fetchSleeperDraftHistory(leagueId) {
  try {
    console.log(`Fetching draft history for league ${leagueId}...`);
    
    // Get league info
    const leagueResponse = await axios.get(`https://api.sleeper.app/v1/league/${leagueId}`);
    const league = leagueResponse.data;
    
    // Get drafts for the league
    const draftsResponse = await axios.get(`https://api.sleeper.app/v1/league/${leagueId}/drafts`);
    const drafts = draftsResponse.data;
    
    if (drafts && drafts.length > 0) {
      const draft = drafts[0]; // Get most recent draft
      
      // Get draft picks
      const picksResponse = await axios.get(`https://api.sleeper.app/v1/draft/${draft.draft_id}/picks`);
      const picks = picksResponse.data;
      
      // Store draft history
      const stmt = db.prepare(`INSERT OR REPLACE INTO draft_history 
        (id, year, league_id, player_id, player_name, draft_position, fantasy_points) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
      picks.forEach((pick, index) => {
        stmt.run(
          `${leagueId}-${pick.player_id}-${league.season}`,
          parseInt(league.season),
          leagueId,
          pick.player_id,
          pick.metadata?.first_name && pick.metadata?.last_name 
            ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
            : 'Unknown Player',
          pick.pick_no,
          null // Will be updated with actual fantasy points later
        );
      });
      
      stmt.finalize();
      console.log(`Loaded ${picks.length} draft picks from Sleeper league`);
      return picks;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Sleeper draft history:', error);
    return [];
  }
}

// Initialize player data on server start
fetchSleeperPlayers();

// Schedule daily player data updates
cron.schedule('0 6 * * *', () => {
  console.log('Running daily player data update...');
  fetchSleeperPlayers();
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a draft room
  socket.on('join-room', (roomId, userData) => {
    socket.join(roomId);
    socket.userData = userData;
    console.log(`User ${userData.username} joined room ${roomId}`);
    
    // Send current room state to the user
    if (draftRooms.has(roomId)) {
      socket.emit('room-state', draftRooms.get(roomId));
    }
    
    // Send recent chat messages
    db.all('SELECT * FROM chat_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 50', [roomId], (err, messages) => {
      if (!err && messages) {
        socket.emit('chat-history', messages.reverse());
      }
    });
  });

  // Handle draft start (Commissioner only)
  socket.on('start-draft', (roomId) => {
    if (!socket.userData || socket.userData.role !== 'commissioner') {
      socket.emit('error', 'Only commissioners can start the draft');
      return;
    }

    const roomState = draftRooms.get(roomId) || createDefaultRoomState();
    roomState.draftState.isStarted = true;
    roomState.draftState.isPaused = false;
    
    // Randomly select first nominator for round 1
    const randomTeamIndex = Math.floor(Math.random() * roomState.teams.length);
    roomState.draftState.currentNominator = roomState.teams[randomTeamIndex].id;
    roomState.draftState.nominationOrder = [roomState.teams[randomTeamIndex].id];
    
    console.log(`First nominator: ${roomState.teams[randomTeamIndex].name}`);
    
    draftRooms.set(roomId, roomState);
    io.to(roomId).emit('draft-started', roomState.draftState);
    console.log(`Draft started in room ${roomId} by ${socket.userData.username}`);
  });

  // Handle draft pause/resume (Commissioner only)
  socket.on('toggle-draft-pause', (roomId) => {
    if (!socket.userData || socket.userData.role !== 'commissioner') {
      socket.emit('error', 'Only commissioners can pause/resume the draft');
      return;
    }

    const roomState = draftRooms.get(roomId);
    if (!roomState) return;

    roomState.draftState.isPaused = !roomState.draftState.isPaused;
    
    if (roomState.draftState.isPaused) {
      // Clear any active timers
      if (timers.has(roomId)) {
        clearInterval(timers.get(roomId));
        timers.delete(roomId);
      }
    } else if (roomState.draftState.isActive && roomState.draftState.timeRemaining > 0) {
      // Resume timer if auction is active
      startAuctionTimer(roomId);
    }
    
    draftRooms.set(roomId, roomState);
    io.to(roomId).emit('draft-paused', roomState.draftState);
    console.log(`Draft ${roomState.draftState.isPaused ? 'paused' : 'resumed'} in room ${roomId}`);
  });
  // Handle player nomination
  socket.on('nominate-player', (roomId, player, startingPrice = 1) => {
    const roomState = draftRooms.get(roomId) || createDefaultRoomState();
    
    // Check if draft is started and not paused
    if (!roomState.draftState.isStarted) {
      socket.emit('error', 'Draft has not been started yet');
      return;
    }
    
    if (roomState.draftState.isPaused) {
      socket.emit('error', 'Draft is currently paused');
      return;
    }
    
    // Check if it's the correct team's turn to nominate
    const nominatingTeam = roomState.teams.find(team => team.ownerId === socket.userData.id);
    if (!nominatingTeam || nominatingTeam.id !== roomState.draftState.currentNominator) {
      socket.emit('error', 'It is not your turn to nominate');
      return;
    }
    
    // Validate starting price
    const validStartingPrice = Math.max(1, Math.min(startingPrice, nominatingTeam.budget));
    
    console.log(`Player nominated in room ${roomId}:`, player.name);
    
    roomState.draftState.nominatedPlayer = player;
    roomState.draftState.currentBids = [];
    roomState.draftState.highestBid = {
      id: `starting-bid-${Date.now()}`,
      playerId: player.id,
      userId: socket.userData.id,
      username: socket.userData.username,
      teamName: nominatingTeam.name,
      teamId: nominatingTeam.id,
      amount: validStartingPrice,
      timestamp: Date.now()
    };
    roomState.draftState.timeRemaining = 30; // Enhanced timer - 30 seconds initial
    roomState.draftState.isActive = true;
    roomState.draftState.startingPrice = validStartingPrice;
    
    draftRooms.set(roomId, roomState);
    
    // Start the auction timer
    startAuctionTimer(roomId);
    
    // Broadcast to all users in the room
    io.to(roomId).emit('player-nominated', roomState.draftState);
  });

  // Handle bid placement
  socket.on('place-bid', (roomId, bidData) => {
    const roomState = draftRooms.get(roomId);
    if (!roomState || !roomState.draftState.isActive || roomState.draftState.isPaused) {
      socket.emit('bid-error', 'Bidding is not currently active');
      return;
    }
    
    console.log(`Bid placed in room ${roomId}:`, bidData);
    
    const biddingTeam = roomState.teams.find(team => team.ownerId === bidData.userId);
    if (!biddingTeam) {
      socket.emit('bid-error', 'Team not found');
      return;
    }

    const newBid = {
      id: `bid-${Date.now()}-${socket.id}`,
      playerId: roomState.draftState.nominatedPlayer?.id || '',
      userId: bidData.userId,
      username: bidData.username,
      teamName: bidData.teamName,
      teamId: biddingTeam.id,
      amount: bidData.amount,
      timestamp: Date.now()
    };

    // Validate bid
    const currentHighest = roomState.draftState.highestBid?.amount || 0;
    if (newBid.amount <= currentHighest) {
      socket.emit('bid-error', 'Bid must be higher than current highest bid');
      return;
    }

    // Add bid to room state
    roomState.draftState.currentBids.push(newBid);
    roomState.draftState.highestBid = newBid;
    roomState.draftState.timeRemaining = Math.max(5, roomState.draftState.timeRemaining); // Enhanced timer logic

    draftRooms.set(roomId, roomState);

    // Store bid in database
    const stmt = db.prepare(`INSERT INTO bids 
      (id, room_id, player_id, user_id, username, team_name, amount, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      newBid.id,
      roomId,
      newBid.playerId,
      newBid.userId,
      newBid.username,
      newBid.teamName,
      newBid.amount,
      newBid.timestamp
    );
    stmt.finalize();

    // Restart timer
    startAuctionTimer(roomId);
    
    // Broadcast bid to all users in the room
    io.to(roomId).emit('bid-placed', roomState.draftState);
  });

  // Handle chat messages
  socket.on('send-chat-message', (roomId, message) => {
    if (!socket.userData || !message.trim()) {
      return;
    }
    
    const chatMessage = {
      id: `msg-${Date.now()}-${socket.id}`,
      roomId,
      userId: socket.userData.id,
      username: socket.userData.username,
      message: message.trim(),
      timestamp: Date.now()
    };
    
    // Store in database
    const stmt = db.prepare(`INSERT INTO chat_messages 
      (id, room_id, user_id, username, message, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      chatMessage.id,
      chatMessage.roomId,
      chatMessage.userId,
      chatMessage.username,
      chatMessage.message,
      chatMessage.timestamp
    );
    stmt.finalize();
    
    // Broadcast to room
    io.to(roomId).emit('chat-message', chatMessage);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Enhanced timer management
function startAuctionTimer(roomId) {
  // Clear existing timer
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
  }

  const roomState = draftRooms.get(roomId);
  if (!roomState || !roomState.draftState.isActive || roomState.draftState.isPaused) return;

  const timer = setInterval(() => {
    roomState.draftState.timeRemaining--;
    
    // Enhanced timer alerts
    if (roomState.draftState.timeRemaining === 10) {
      io.to(roomId).emit('timer-warning', { timeRemaining: 10, message: '10 seconds remaining!' });
    } else if (roomState.draftState.timeRemaining === 5) {
      io.to(roomId).emit('timer-warning', { timeRemaining: 5, message: '5 seconds remaining!' });
    }
    
    if (roomState.draftState.timeRemaining <= 0) {
      // Time's up - complete the sale
      completeSale(roomId);
      clearInterval(timer);
      timers.delete(roomId);
    } else {
      // Broadcast time update
      io.to(roomId).emit('timer-update', roomState.draftState.timeRemaining);
    }
  }, 1000);

  timers.set(roomId, timer);
}

function completeSale(roomId) {
  const roomState = draftRooms.get(roomId);
  if (!roomState || !roomState.draftState.nominatedPlayer) return;

  const { nominatedPlayer, highestBid } = roomState.draftState;

  if (highestBid) {
    // Find winning team and update their roster and budget
    const winningTeam = roomState.teams.find(team => team.ownerId === highestBid.userId);
    if (winningTeam) {
      winningTeam.players.push(nominatedPlayer);
      winningTeam.budget -= highestBid.amount;

      // Add to drafted players
      roomState.draftState.draftedPlayers.push({
        player: nominatedPlayer,
        winningBid: highestBid,
        round: roomState.draftState.currentRound
      });

      // Set next nominator to the winning team
      roomState.draftState.currentNominator = winningTeam.id;
      
      // Check if round is complete (all teams have nominated)
      if (roomState.draftState.nominationOrder.length >= roomState.teams.length) {
        roomState.draftState.currentRound++;
        roomState.draftState.nominationOrder = [];
        // Winner of last auction starts next round
      }
    }
  }

  // Reset auction state
  roomState.draftState.nominatedPlayer = null;
  roomState.draftState.currentBids = [];
  roomState.draftState.highestBid = null;
  roomState.draftState.timeRemaining = 0;
  roomState.draftState.isActive = false;
  roomState.draftState.startingPrice = 1;

  draftRooms.set(roomId, roomState);

  // Broadcast sale completion
  io.to(roomId).emit('sale-completed', roomState);
}

function createDefaultRoomState() {
  const teams = [];
  const teamNames = [
    'Thunder Bolts', 'Fire Dragons', 'Ice Wolves', 'Golden Eagles',
    'Silver Hawks', 'Red Lions', 'Blue Sharks', 'Green Vipers',
    'Purple Ravens', 'Orange Tigers', 'Yellow Hornets', 'Black Panthers'
  ];

  teamNames.forEach((name, index) => {
    teams.push({
      id: `team-${index + 1}`,
      name,
      ownerId: `user-${index + 1}`,
      budget: 200,
      players: []
    });
  });

  return {
    teams,
    draftState: {
      currentRound: 1,
      currentNominator: 'team-1',
      nominatedPlayer: null,
      currentBids: [],
      highestBid: null,
      timeRemaining: 0,
      isActive: false,
      draftedPlayers: [],
      isPaused: false,
      isStarted: false,
      startingPrice: 1,
      nominationOrder: []
    }
  };
}

// API Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password });
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
// Schedule hourly injury updates
cron.schedule('0 * * * *', () => {
  console.log('Running hourly injury update...');
  fetchSleeperPlayers();
});
    
    if (user) {
      console.log('User found:', user);
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        teamId: user.team_id,
        teamName: user.team_name,
        teamLogo: user.team_logo
      });
    } else {
      console.log('No user found with credentials:', { username, password });
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.put('/api/users/:userId/team', (req, res) => {
  const { userId } = req.params;
  const { teamName, teamLogo } = req.body;
  
  db.run('UPDATE users SET team_name = ?, team_logo = ? WHERE id = ?', 
    [teamName, teamLogo, userId], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.get('/api/players', (req, res) => {
  db.all(`SELECT *, 
    CASE 
      WHEN injuryStatus IS NOT NULL THEN json_object('status', injuryStatus, 'description', injuryDescription, 'news', newsUpdates)
      ELSE NULL 
    END as injury
    FROM players ORDER BY rank ASC`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse injury JSON for each player
    const playersWithInjury = rows.map(player => ({
      ...player,
      injury: player.injury ? JSON.parse(player.injury) : null
    }));
    
    res.json(playersWithInjury);
  });
});

app.get('/api/draft-history/:leagueId?', (req, res) => {
  const leagueId = req.params.leagueId;
  
  if (leagueId) {
    // Fetch specific league history
    fetchSleeperDraftHistory(leagueId).then(history => {
      res.json(history);
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  } else {
    // Get stored draft history
    db.all('SELECT * FROM draft_history ORDER BY year DESC, draft_position ASC', (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
  }
});

app.post('/api/update-sleeper-data', (req, res) => {
  const { leagueId } = req.body;
  
  if (leagueId) {
    fetchSleeperDraftHistory(leagueId);
  }
  
  fetchSleeperPlayers().then(() => {
    res.json({ success: true, message: 'Player data updated successfully' });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const roomState = draftRooms.get(roomId) || createDefaultRoomState();
  draftRooms.set(roomId, roomState);
  res.json(roomState);
});

app.post('/api/room/:roomId/join', (req, res) => {
  const roomId = req.params.roomId;
  const { userId, username, teamName } = req.body;
  
  let roomState = draftRooms.get(roomId);
  if (!roomState) {
    roomState = createDefaultRoomState();
    draftRooms.set(roomId, roomState);
  }

  // Find or create team for user
  let userTeam = roomState.teams.find(team => team.ownerId === userId);
  if (!userTeam) {
    userTeam = roomState.teams.find(team => !team.ownerId || team.ownerId === `user-${roomState.teams.indexOf(team) + 1}`);
    if (userTeam) {
      userTeam.ownerId = userId;
      userTeam.name = teamName;
    }
  }

  res.json(roomState);
});

// Get chat messages for a room
app.get('/api/room/:roomId/chat', (req, res) => {
  const roomId = req.params.roomId;
  
  db.all('SELECT * FROM chat_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 100', [roomId], (err, messages) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(messages.reverse());
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Fantasy Football Auction Draft Server Started!');
  console.log('API endpoints available at:');
  console.log(`- POST http://localhost:${PORT}/api/auth/login`);
  console.log(`- GET http://localhost:${PORT}/api/players`);
});