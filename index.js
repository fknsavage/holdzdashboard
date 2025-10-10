const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 10000;

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Nodemailer Config
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors({ origin: ['https://holdzdashboard.pages.dev', 'https://holdznchilllounge.pages.dev', 'http://localhost:9898'] }));
app.use(express.json({ limit: '50mb' }));

// Database Schema Setup
const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS games (
                gid VARCHAR(255) PRIMARY KEY, maxp INTEGER NOT NULL, cards INTEGER NOT NULL, gstatus VARCHAR(50) NOT NULL,
                template_url TEXT, winner VARCHAR(255), ended_at TIMESTAMP
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY, game_gid VARCHAR(255) REFERENCES games(gid) ON DELETE CASCADE, psid VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL, cards_count INTEGER NOT NULL, pin VARCHAR(4) NOT NULL, cards TEXT[], UNIQUE(game_gid, psid)
            );
        `);
        console.log('Database tables are ready.');
    } catch (error) {
        console.error("Database setup failed:", error);
    } finally {
        client.release();
    }
};

// Card Generation (Cloudinary)
const generateCardImage = (playerName, cardNum, templatePublicId) => {
    return cloudinary.url(templatePublicId, {
        transformation: [{
            overlay: { font_family: "Montserrat", font_size: 80, font_weight: "bold", text: playerName.replace(/ /g, '%20') },
            color: "#FFFFFF", effect: "shadow", gravity: "south", y: 100
        }]
    });
};

// API Endpoints
app.get('/', (req, res) => res.status(200).send('Holdz N Chill API is running!'));

app.get('/active-game', async (req, res) => {
    const client = await pool.connect();
    try {
        const gameResult = await client.query("SELECT * FROM games WHERE gstatus = 'active' LIMIT 1");
        if (gameResult.rows.length === 0) return res.status(200).json({ gstatus: 'inactive' });
        const activeGame = gameResult.rows[0];
        const playersResult = await client.query("SELECT * FROM players WHERE game_gid = $1", [activeGame.gid]);
        activeGame.players = playersResult.rows;
        res.status(200).json(activeGame);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch active game.' });
    } finally {
        client.release();
    }
});

app.post('/create-game', async (req, res) => {
    const { gid, maxp, cards, gstatus } = req.body;
    const client = await pool.connect();
    try {
        const existingGame = await client.query("SELECT gid FROM games WHERE gstatus = 'active' LIMIT 1");
        if (existingGame.rows.length > 0) return res.status(409).json({ message: `An active game (${existingGame.rows[0].gid}) is already running.` });
        await client.query("INSERT INTO games (gid, maxp, cards, gstatus) VALUES ($1, $2, $3, $4)", [gid, parseInt(maxp), parseInt(cards), gstatus]);
        res.status(200).json({ message: 'Game created successfully.' });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ message: `Game ID ${gid} has been used before.` });
        res.status(500).json({ message: 'Failed to create game.' });
    } finally {
        client.release();
    }
});

app.post('/upload-template', async (req, res) => {
    const { gid, templateImage } = req.body;
    if (!gid || !templateImage) return res.status(400).json({ message: 'Game ID and template are required.' });
    const client = await pool.connect();
    try {
        const uploadResult = await cloudinary.uploader.upload(templateImage, { public_id: `${gid}-template`, overwrite: true, resource_type: "image" });
        await client.query("UPDATE games SET template_url = $1 WHERE gid = $2", [uploadResult.public_id, gid]);
        res.status(200).json({ message: 'Template uploaded successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upload template image.' });
    } finally {
        client.release();
    }
});

app.post('/join-game', async (req, res) => {
    const { psid, name, cards_count } = req.body;
    const client = await pool.connect();
    try {
        const gameResult = await client.query("SELECT * FROM games WHERE gstatus = 'active' LIMIT 1");
        if (gameResult.rows.length === 0) return res.status(404).json({ message: 'No active game.' });
        const activeGame = gameResult.rows[0];
        if (!activeGame.template_url) return res.status(500).json({ message: 'Game is not ready. Template missing.' });
        const playersResult = await client.query("SELECT psid, cards_count FROM players WHERE game_gid = $1", [activeGame.gid]);
        if (playersResult.rows.find(p => p.psid === psid)) return res.status(409).json({ message: 'Already joined.' });
        const totalSlotsTaken = playersResult.rows.reduce((sum, p) => sum + p.cards_count, 0);
        if ((totalSlotsTaken + cards_count) > activeGame.maxp) return res.status(403).json({ message: 'Not enough slots left.' });

        const playerCards = [];
        for (let i = 1; i <= cards_count; i++) {
            const cardUrl = generateCardImage(name, i, activeGame.template_url);
            playerCards.push(cardUrl);
        }
        const playerPin = Math.floor(1000 + Math.random() * 9000).toString();
        await client.query("INSERT INTO players (game_gid, psid, name, cards_count, pin, cards) VALUES ($1, $2, $3, $4, $5, $6)", [activeGame.gid, psid, name, cards_count, playerPin, playerCards]);
        res.status(200).json({ message: 'Player joined successfully.', pin: playerPin, cards: playerCards });
    } catch (error) {
        res.status(500).json({ message: 'Failed to join game.' });
    } finally {
        client.release();
    }
});

app.get('/validate-pin/:pin', async (req, res) => {
    const { pin } = req.params;
    const client = await pool.connect();
    try {
        const result = await client.query("SELECT * FROM players WHERE pin = $1", [pin]);
        if (result.rows.length > 0) res.status(200).json({ success: true, player: result.rows[0] });
        else res.status(404).json({ success: false, message: 'Invalid PIN.' });
    } catch (error) {
        res.status(500).json({ message: 'Database error during PIN validation.' });
    } finally {
        client.release();
    }
});

// ... (Other endpoints like /history-api, /end-game, /remove-player can be added back here if needed)

// Server Start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    setupDatabase().catch(console.error);
});