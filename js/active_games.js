const gamesContainer = document.getElementById('games-container');
const playerCardsModal = document.getElementById('player-cards-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCardsContainer = document.getElementById('modal-cards-container');
const devLog = document.getElementById('dev-log');

const API_URL = 'https://holdznchill.onrender.com';

// Centralized logging function
const log = (message) => {
    if (devLog) {
        const timestamp = new Date().toLocaleTimeString();
        devLog.textContent = `[${timestamp}] ${message}`;
    }
    console.log(message);
};

function createGameCardHTML(game) {
    const totalSlotsTaken = (game.players || []).length;
    let playerListHtml = game.players && game.players.length > 0 ?
        game.players.map(player => `
            <li class="player-item" data-player-psid="${player.psid}">
                <span>${player.name} | PIN: <strong>${player.pin}</strong> (${player.card_count} cards)</span>
                <div class="player-actions">
                    <button class="action-button secondary-button view-cards-btn">View</button>
                    <button class="action-button secondary-button remove-player-btn">Remove</button>
                </div>
            </li>
        `).join('') : '<li>No players have joined yet.</li>';

    return `
        <div class="game-card" id="game-card-${game.gid}">
            <div class="game-card-header">
                <h3 class="game-id">Game ID: ${game.gid}</h3>
                <span class="status-badge status-active">Active</span>
            </div>
            <p><strong>Players:</strong> ${totalSlotsTaken} / ${game.max_players}</p>
            <p><strong>Cards per Player:</strong> ${game.cards_per_player}</p>
            <div class="url-input-group">
                <input type="text" id="fb-url-input-${game.gid}" placeholder="Paste Facebook Live URL" value="${game.live_url || ''}">
                <button class="set-url-btn">Set URL</button>
            </div>
            <div class="card-actions">
                <button class="action-button send-alert-btn">Send Alert</button>
                <button class="action-button end-game-btn">End Game</button>
            </div>
            <h4>Player List:</h4>
            <ul class="player-list">${playerListHtml}</ul>
        </div>
    `;
}

function attachEventListeners(element, game) {
    // Demo buttons
    element.querySelector('.set-url-btn')?.addEventListener('click', () => {
        log(`Set URL for game ${game.gid}`);
        alert('Feature not yet implemented.');
    });
    element.querySelector('.send-alert-btn')?.addEventListener('click', () => {
        log(`Send alert for game ${game.gid}`);
        alert('Feature not yet implemented.');
    });

    // Functional buttons
    element.querySelector('.end-game-btn')?.addEventListener('click', () => endGame(game.gid));

    element.querySelectorAll('.player-item').forEach(item => {
        const psid = item.dataset.playerPsid;
        const player = game.players.find(p => p.psid === psid);

        item.querySelector('.view-cards-btn')?.addEventListener('click', () => {
            if (player) openCardsModal(player);
        });
        item.querySelector('.remove-player-btn')?.addEventListener('click', () => {
            if (player) removePlayer(game.gid, player);
        });
    });
}

function renderGames(games) {
    log('Rendering games...');
    if (!games || games.length === 0) {
        gamesContainer.innerHTML = `<div class="game-card"><p>No active games are currently running.</p></div>`;
        return;
    }
    
    gamesContainer.innerHTML = ''; // Clear previous content
    games.forEach(game => {
        const gameCardHTML = createGameCardHTML(game);
        const gameCardElement = document.createElement('div');
        gameCardElement.innerHTML = gameCardHTML;
        
        attachEventListeners(gameCardElement, game);
        gamesContainer.appendChild(gameCardElement.firstElementChild);
    });
    log('Render complete.');
}

async function fetchActiveGames() {
    log('Fetching active games...');
    try {
        const response = await fetch(`${API_URL}/api/games/active`);
        if (!response.ok) throw new Error(`Server Error: ${response.status}`);
        const data = await response.json();
        log('Successfully fetched and parsed data.');
        renderGames(data);
    } catch (error) {
        log(`Error fetching games: ${error.message}`);
        gamesContainer.innerHTML = `<div class="game-card"><p style="color: var(--danger-color);">Failed to load games: ${error.message}</p></div>`;
    }
}

function openCardsModal(player) {
    modalCardsContainer.innerHTML = (player.cards && player.cards.length > 0)
        ? player.cards.map(cardUrl => `<div class="modal-card"><img src="${cardUrl}" alt="Player Card"></div>`).join('')
        : '<p>No card images found for this player.</p>';
    playerCardsModal.classList.add('open');
}

function closeModal() {
    playerCardsModal.classList.remove('open');
}

async function endGame(gid) {
    log(`Attempting to end game: ${gid}`);
    // Implement end game logic here...
    alert(`Ending game ${gid} - logic not implemented yet.`);
}

async function removePlayer(gid, player) {
    log(`Attempting to remove player: ${player.name}`);
    if (confirm(`Are you sure you want to remove ${player.name} (PIN: ${player.pin}) from game ${gid}?`)) {
        // Implement remove player logic here...
        alert(`Removing player ${player.name} - logic not implemented yet.`);
    }
}

// Initial Load
modalCloseBtn?.addEventListener('click', closeModal);
fetchActiveGames();