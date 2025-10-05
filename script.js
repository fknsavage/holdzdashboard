// Load the Express.js framework and other libraries
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const { createCanvas, loadImage } = require('canvas');
const cors = require('cors');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
    console.error("Environment variables not set.");
    process.exit(1);
}

let games = {};

const bingoPool = {
    'B': Array.from({length: 15}, (_, i) => i + 1),
    'I': Array.from({length: 15}, (_, i) => i + 16),
    'N': Array.from({length: 15}, (_, i) => i + 31),
    'G': Array.from({length: 15}, (_, i) => i + 46),
    'O': Array.from({length: 15}, (_, i) => i + 61)
};
const columns = ['B', 'I', 'N', 'G', 'O'];

const GREETING_RESPONSES = [
    "Hey there! We currently have these games open:",
    "Hi! Here are the active games:",
    "Hello! Ready to play? Here's what's open:"
];

const NO_ACTIVE_GAMES_MSG = "There are no active games right now. Please check back later!";
const GAME_FULL_MSG = "Sorry, that game is full! Please try another game or check back later.";
const INVALID_GAME_ID_MSG = "Sorry, that game ID is not valid. Please check the ID and try again.";
const JOIN_INSTRUCTION_MSG = "To join, please type 'join [Your Name] [Game ID]'";
const GAME_OVER_MSG = (winnerName) => `Congratulations, ${winnerName} is the winner! Hope you all had a blast!`;

app.use(cors({ origin: 'https://holdzdashboard.pages.dev' }));
app.use(bodyParser.json({ limit: '50mb' }));

app.post('/create-game', (req, res) => {
    const template = req.body;
    const gameId = template.id;

    if (games[gameId] && games[gameId].status === 'active') {
        return res.status(409).send({ message: `Game with ID "${gameId}" already exists and is active.` });
    }

    games[gameId] = {
        template,
        players: [],
        status: 'active'
    };
    console.log(`Game template created and saved: ${gameId}`);
    res.status(200).send({ message: `Game ${gameId} created successfully.` });
});

app.post('/end-game', (req, res) => {
    const { gameId, winnerName, players } = req.body;

    if (!games[gameId]) {
        return res.status(404).send({ message: `Game with ID "${gameId}" not found.` });
    }

    games[gameId].status = 'inactive';
    console.log(`Game ${gameId} marked as inactive. Winner: ${winnerName}`);

    players.forEach(player => {
        callSendApi(player.psid, { "text": GAME_OVER_MSG(winnerName) });
    });

    res.status(200).send({ message: `Game ${gameId} ended and players notified.` });
});

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhookEvent = entry.messaging[0];
            let senderPsid = webhookEvent.sender.id;

            if (webhookEvent.message) {
                handleMessage(senderPsid, webhookEvent.message);
            } else if (webhookEvent.postback) {
                handlePostback(senderPsid, webhookEvent.postback);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

function handleMessage(senderPsid, receivedMessage) {
    let messageText = receivedMessage.text;
    if (!messageText) return;

    if (messageText.toLowerCase().startsWith('join')) {
        const parts = messageText.split(' ');
        if (parts.length < 3) {
            callSendApi(senderPsid, { "text": JOIN_INSTRUCTION_MSG });
            return;
        }
        const playerName = parts[1];
        const gameId = parts[2];
        if (games[gameId]) {
            if (games[gameId].players.length >= games[gameId].template.playerLimit) {
                callSendApi(senderPsid, { "text": GAME_FULL_MSG });
            } else {
                games[gameId].players.push({ psid: senderPsid, name: playerName });
                generateCard(senderPsid, games[gameId].template, playerName);
            }
        } else {
            callSendApi(senderPsid, { "text": INVALID_GAME_ID_MSG });
        }
    } else {
        listActiveGames(senderPsid);
    }
}

function handlePostback(senderPsid, postback) {
    const payload = postback.payload;
    if (payload.startsWith('JOIN_GAME_')) {
        const gameId = payload.split('_')[2];
        callSendApi(senderPsid, { "text": `Great! What is your name for Game ${gameId}? (Type 'Join [Your Name] ${gameId}')` });
    }
}

function listActiveGames(senderPsid) {
    const activeGames = Object.values(games).filter(g => g.status === 'active');
    if (activeGames.length === 0) {
        callSendApi(senderPsid, { "text": NO_ACTIVE_GAMES_MSG });
        return;
    }

    const randomGreeting = GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];

    const gameListText = activeGames.map(game => {
        const slotsLeft = game.template.playerLimit - game.players.length;
        return `Game ID: ${game.template.id}\nPlayers: ${game.players.length}/${game.template.playerLimit}\nSlots Left: ${slotsLeft}`;
    }).join('\n\n');

    callSendApi(senderPsid, { "text": `${randomGreeting}\n\n${gameListText}` });
}

async function generateCard(senderPsid, template, playerName) {
    try {
        const baseImage = await loadImage(Buffer.from(template.baseImage, 'base64'));

        const canvas = createCanvas(baseImage.width, baseImage.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(baseImage, 0, 0, baseImage.width, baseImage.height);

        const shuffledNumbers = {};
        for (const col of columns) {
            shuffledNumbers[col] = shuffleArray(bingoPool[col].slice());
        }

        template.ballPositions.forEach(ball => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.closePath();

            ctx.fillStyle = 'white';
            ctx.font = `${ball.radius}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const number = getRandomNumberFromPool(shuffledNumbers[ball.column]);
            ctx.fillText(number, ball.x, ball.y);
        });

        template.nameShapes.forEach(shape => {
            ctx.fillStyle = shape.color;
            ctx.font = `${shape.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(playerName, shape.x, shape.y);
        });

        const buffer = canvas.toBuffer('image/png');
        callSendApiWithImage(senderPsid, buffer);

    } catch (error) {
        console.error("Error generating card:", error);
        callSendApi(senderPsid, { "text": "Sorry, I couldn't generate your card. Please try again." });
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getRandomNumberFromPool(pool) {
    if (pool.length === 0) return null;
    return pool.pop();
}

function callSendApi(senderPsid, response) {
    let requestBody = {
        "recipient": {
            "id": senderPsid
        },
        "message": response
    };

    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": requestBody
    }, (err, res, body) => {
        if (!err) {
            console.log('Message sent!');
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

function callSendApiWithImage(senderPsid, imageBuffer) {
    const messageData = {
        "attachment": {
            "type": "image",
            "payload": {}
        }
    };

    const formData = {
        recipient: JSON.stringify({
            id: senderPsid
        }),
        message: JSON.stringify(messageData),
        filedata: {
            value: imageBuffer,
            options: {
                filename: 'card.png',
                contentType: 'image/png'
            }
        }
    };

    request.post({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        formData: formData
    }, (err, res, body) => {
        if (!err) {
            console.log('Image sent successfully!');
        } else {
            console.error('Unable to send image:', err);
        }
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
