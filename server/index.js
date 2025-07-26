import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import sqlite3 from 'sqlite3';
import cron from 'node-cron';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Add root route to prevent "Cannot GET /" error
app.get('/', (req, res) => {
  res.json({
    message: 'Fantasy Football Auction Draft API',
    version: '1.0.0',
    endpoints: {
      players: '/api/players',
      login: '/api/auth/login',
      room: '/api/room/:roomId'
    }
  });
});

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

  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES draft_rooms (id)
  )`);
});

// Pre-register users
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
});

// Store active draft rooms and their states
const draftRooms = new Map();
const timers = new Map();

// Mock player data
async function createMockPlayerData() {
  const mockPlayers = [
    { name: 'Josh Allen', position: 'QB', team: 'BUF', rank: 1, projectedPoints: 385.2, adp: 8.5, byeWeek: 12, lastYearPoints: 378.4 },
    { name: 'Lamar Jackson', position: 'QB', team: 'BAL', rank: 2, projectedPoints: 378.4, adp: 12.3, byeWeek: 14, lastYearPoints: 365.8 },
    { name: 'Christian McCaffrey', position: 'RB', team: 'SF', rank: 3, projectedPoints: 298.7, adp: 1.2, byeWeek: 9, lastYearPoints: 285.3 },
    { name: 'Tyreek Hill', position: 'WR', team: 'MIA', rank: 4, projectedPoints: 285.6, adp: 6.2, byeWeek: 6, lastYearPoints: 278.3 },
    { name: 'Travis Kelce', position: 'TE', team: 'KC', rank: 5, projectedPoints: 245.7, adp: 19.3, byeWeek: 10, lastYearPoints: 235.4 },
    { name: 'Justin Jefferson', position: 'WR', team: 'MIN', rank: 6, projectedPoints: 279.8, adp: 5.2, byeWeek: 6, lastYearPoints: 268.4 },
    { name: 'Cooper Kupp', position: 'WR', team: 'LAR', rank: 7, projectedPoints: 265.3, adp: 4.8, byeWeek: 6, lastYearPoints: 245.8 },
    { name: 'Derrick Henry', position: 'RB', team: 'BAL', rank: 8, projectedPoints: 245.6, adp: 3.8, byeWeek: 14, lastYearPoints: 228.9 },
    { name: 'Davante Adams', position: 'WR', team: 'LV', rank: 9, projectedPoints: 258.7, adp: 4.4, byeWeek: 10, lastYearPoints: 242.1 },
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', rank: 10, projectedPoints: 235.4, adp: 4.1, byeWeek: 5, lastYearPoints: 218.7 },
    { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', rank: 11, projectedPoints: 252.8, adp: 4.6, byeWeek: 7, lastYearPoints: 238.9 },
    { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', rank: 12, projectedPoints: 248.3, adp: 4.3, byeWeek: 12, lastYearPoints: 231.6 },
    { name: 'Nick Chubb', position: 'RB', team: 'CLE', rank: 13, projectedPoints: 228.9, adp: 3.9, byeWeek: 10, lastYearPoints: 205.4 },
    { name: 'Stefon Diggs', position: 'WR', team: 'HOU', rank: 14, projectedPoints: 242.1, adp: 4.0, byeWeek: 14, lastYearPoints: 225.8 },
    { name: 'Mark Andrews', position: 'TE', team: 'BAL', rank: 15, projectedPoints: 198.7, adp: 3.2, byeWeek: 14, lastYearPoints: 185.3 },
    { name: 'Aaron Jones', position: 'RB', team: 'MIN', rank: 16, projectedPoints: 218.4, adp: 3.6, byeWeek: 6, lastYearPoints: 198.7 },
    { name: 'Mike Evans', position: 'WR', team: 'TB', rank: 17, projectedPoints: 235.6, adp: 3.7, byeWeek: 11, lastYearPoints: 218.9 },
    { name: 'Alvin Kamara', position: 'RB', team: 'NO', rank: 18, projectedPoints: 212.8, adp: 3.4, byeWeek: 12, lastYearPoints: 195.4 },
    { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', rank: 19, projectedPoints: 228.7, adp: 3.3, byeWeek: 5, lastYearPoints: 212.3 },
    { name: 'Puka Nacua', position: 'WR', team: 'LAR', rank: 20, projectedPoints: 221.4, adp: 3.1, byeWeek: 6, lastYearPoints: 198.6 },
    { name: 'Dak Prescott', position: 'QB', team: 'DAL', rank: 21, projectedPoints: 320.5, adp: 5.5, byeWeek: 7, lastYearPoints: 305.2 },
    { name: 'Ezekiel Elliott', position: 'RB', team: 'DAL', rank: 22, projectedPoints: 195.3, adp: 7.5, byeWeek: 7, lastYearPoints: 180.4 },
    { name: 'Amari Cooper', position: 'WR', team: 'CLE', rank: 23, projectedPoints: 210.7, adp: 6.8, byeWeek: 10, lastYearPoints: 195.8 },
    { name: 'George Kittle', position: 'TE', team: 'SF', rank: 24, projectedPoints: 175.2, adp: 8.5, byeWeek: 9, lastYearPoints: 160.5 },
    { name: 'Russell Wilson', position: 'QB', team: 'PIT', rank: 25, projectedPoints: 295.8, adp: 9.5, byeWeek: 9, lastYearPoints: 280.3 }
  ];

  const stmt = db.prepare(`INSERT OR REPLACE INTO players 
    (id, name, position, team, rank, projectedPoints, adp, byeWeek, lastYearPoints, sleeperId, age, experience) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  mockPlayers.forEach((player, index) => {
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
      Math.floor(Math.random() * 15)
    );
  });

  stmt.finalize();
  console.log(`Loaded ${mockPlayers.length} mock players`);
  return mockPlayers;
}

// Initialize player data
createMockPlayerData();

// Initialize default room
const initializeDefaultRoom = () => {
  const ROOM_ID = 'main-draft-room';
  if (!draftRooms.has(ROOM_ID)) {
    const defaultRoom = createDefaultRoomState();
    draftRooms.set(ROOM_ID, defaultRoom);
    console.log('Default draft room initialized');
  }
};

initializeDefaultRoom();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a draft room
  socket.on('join-room', (roomId, userData) => {
    socket.join(roomId);
    socket.userData = userData;
    console.log(`User ${userData.username} joined room ${roomId}`);
    
    if (!draftRooms.has(roomId)) {
      draftRooms.set(roomId, createDefaultRoomState());
    }
    
    const roomState = draftRooms.get(roomId);
    const userTeam = roomState.teams.find(team => team.ownerId === userData.id);
    if (userTeam && userData.teamName) {
      userTeam.name = userData.teamName;
    }
    
    socket.emit('room-state', roomState);
    io.to(roomId).emit('room-updated', roomState);
    
    db.all('SELECT * FROM chat_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 50', [roomId], (err, messages) => {
      if (!err && messages) {
        socket.emit('chat-history', messages.reverse());
      }
    });
  });

  // Handle draft start
  socket.on('start-draft', (roomId) => {
    console.log(`Start draft request from ${socket.userData?.username} (role: ${socket.userData?.role})`);
    
    if (!socket.userData || socket.userData.role !== 'commissioner') {
      socket.emit('error', 'Only commissioners can start the draft');
      return;
    }

    const roomState = draftRooms.get(roomId) || createDefaultRoomState();
    
    if (roomState.draftState.isStarted) {
      socket.emit('error', 'Draft has already been started');
      return;
    }
    
    roomState.draftState.isStarted = true;
    roomState.draftState.isPaused = false;
    
    const randomTeamIndex = Math.floor(Math.random() * roomState.teams.length);
    roomState.draftState.currentNominator = roomState.teams[randomTeamIndex].id;
    roomState.draftState.nominationOrder = [roomState.teams[randomTeamIndex].id];
    
    console.log(`First nominator: ${roomState.teams[randomTeamIndex].name}`);
    
    draftRooms.set(roomId, roomState);
    io.to(roomId).emit('draft-started', roomState.draftState);
    io.to(roomId).emit('room-updated', roomState);
    console.log(`Draft started in room ${roomId} by ${socket.userData.username}`);
  });

  // Handle player nomination
  socket.on('nominate-player', (roomId, player, startingPrice = 1) => {
    const roomState = draftRooms.get(roomId) || createDefaultRoomState();
    
    if (!roomState.draftState.isStarted || roomState.draftState.isPaused) {
      socket.emit('error', 'Draft is not active');
      return;
    }
    
    const nominatingTeam = roomState.teams.find(team => team.ownerId === socket.userData.id);
    if (!nominatingTeam || nominatingTeam.id !== roomState.draftState.currentNominator) {
      socket.emit('error', 'It is not your turn to nominate');
      return;
    }
    
    const validStartingPrice = Math.max(1, Math.min(startingPrice, nominatingTeam.budget));
    
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
    roomState.draftState.timeRemaining = 30;
    roomState.draftState.isActive = true;
    roomState.draftState.startingPrice = validStartingPrice;
    
    draftRooms.set(roomId, roomState);
    startAuctionTimer(roomId);
    io.to(roomId).emit('player-nominated', roomState.draftState);
  });

  // Handle bid placement
  socket.on('place-bid', (roomId, bidData) => {
    const roomState = draftRooms.get(roomId);
    if (!roomState || !roomState.draftState.isActive || roomState.draftState.isPaused) {
      socket.emit('bid-error', 'Bidding is not currently active');
      return;
    }
    
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

    const currentHighest = roomState.draftState.highestBid?.amount || 0;
    if (newBid.amount <= currentHighest) {
      socket.emit('bid-error', 'Bid must be higher than current highest bid');
      return;
    }

    roomState.draftState.currentBids.push(newBid);
    roomState.draftState.highestBid = newBid;
    roomState.draftState.timeRemaining = Math.max(5, roomState.draftState.timeRemaining);

    draftRooms.set(roomId, roomState);
    startAuctionTimer(roomId);
    io.to(roomId).emit('bid-placed', roomState.draftState);
  });

  // Handle chat messages
  socket.on('send-chat-message', (roomId, message) => {
    console.log(`Chat message from ${socket.userData?.username}: ${message}`);
    
    if (!socket.userData || !message.trim()) {
      socket.emit('error', 'Cannot send empty message or user not authenticated');
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
    
    const stmt = db.prepare(`INSERT INTO chat_messages 
      (id, room_id, user_id, username, message, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      chatMessage.id,
      chatMessage.roomId,
      chatMessage.userId,
      chatMessage.username,
      chatMessage.message,
      chatMessage.timestamp,
      (err) => {
        if (err) {
          console.error('Error storing chat message:', err);
          socket.emit('error', 'Failed to store message');
          return;
        }
        
        io.to(roomId).emit('chat-message', chatMessage);
      }
    );
    stmt.finalize();
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Timer management
function startAuctionTimer(roomId) {
  if (timers.has(roomId)) {
    clearInterval(timers.get(roomId));
  }

  const roomState = draftRooms.get(roomId);
  if (!roomState || !roomState.draftState.isActive || roomState.draftState.isPaused) return;

  const timer = setInterval(() => {
    roomState.draftState.timeRemaining--;
    
    if (roomState.draftState.timeRemaining === 10) {
      io.to(roomId).emit('timer-warning', { timeRemaining: 10, message: '10 seconds remaining!' });
    } else if (roomState.draftState.timeRemaining === 5) {
      io.to(roomId).emit('timer-warning', { timeRemaining: 5, message: '5 seconds remaining!' });
    }
    
    if (roomState.draftState.timeRemaining <= 0) {
      completeSale(roomId);
      clearInterval(timer);
      timers.delete(roomId);
    } else {
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
    const winningTeam = roomState.teams.find(team => team.ownerId === highestBid.userId);
    if (winningTeam) {
      winningTeam.players.push(nominatedPlayer);
      winningTeam.budget -= highestBid.amount;

      roomState.draftState.draftedPlayers.push({
        player: nominatedPlayer,
        winningBid: highestBid,
        round: roomState.draftState.currentRound
      });

      roomState.draftState.currentNominator = winningTeam.id;
      
      if (roomState.draftState.nominationOrder.length >= roomState.teams.length) {
        roomState.draftState.currentRound++;
        roomState.draftState.nominationOrder = [];
      }
    }
  }

  roomState.draftState.nominatedPlayer = null;
  roomState.draftState.currentBids = [];
  roomState.draftState.highestBid = null;
  roomState.draftState.timeRemaining = 0;
  roomState.draftState.isActive = false;
  roomState.draftState.startingPrice = 1;

  draftRooms.set(roomId, roomState);
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
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        teamId: user.team_id,
        teamName: user.team_name,
        teamLogo: user.team_logo
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.get('/api/players', (req, res) => {
  db.all('SELECT * FROM players ORDER BY rank ASC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const roomState = draftRooms.get(roomId) || createDefaultRoomState();
  draftRooms.set(roomId, roomState);
  res.json(roomState);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Fantasy Football Auction Draft Server Started!');
});