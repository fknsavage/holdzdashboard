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

async function fetchActiveGames() {
    log('Fetching active games...');
    try {
        const response = await fetch(`${API_URL}/api/games/active`);
        if (!response.ok) throw new Error(`Server Error: ${response.status}`);
        const data = await response.json();
        renderGames(data);
    } catch (error) {
        log(`Error fetching games: ${error.message}`);
        if (gamesContainer) {
            gamesContainer.innerHTML = `<div class="game-card"><p style="color: var(--danger-color);">Failed to load games: ${error.message}</p></div>`;
        }
    }
}

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
            <p><strong>Players:</strong> ${totalSlotsTaken} / ${game.maxp}</p>
            <p><strong>Cards per Player:</strong> ${game.cards_per_player}</p>
            <div class="url-input-group">
                <input type="text" id="fb-url-input-${game.gid}" placeholder="Paste Facebook Live URL" value="${game.live_url || ''}">
                <button class="set-url-btn" data-game-id="${game.gid}">Set URL</button>
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

async function handleSetUrl(button) {
    const gid = button.dataset.gameId;
    const urlInput = document.getElementById(`fb-url-input-${gid}`);
    const liveUrl = urlInput.value.trim();
    if (!liveUrl) {
        alert('Please enter a URL.');
        return;
    }
    const originalButtonText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    try {
        const response = await fetch(`${API_URL}/api/games/${gid}/url`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ liveUrl })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to save URL.');
        }
        log(`URL for game ${gid} saved successfully.`);
        button.innerHTML = 'Saved!';
        setTimeout(() => { button.innerHTML = originalButtonText; }, 2000);
    } catch (error) {
        console.error('Error setting URL:', error);
        alert(`Error: ${error.message}`);
        button.innerHTML = originalButtonText;
    } finally {
        button.disabled = false;
    }
}

function attachEventListeners(element, game) {
    element.querySelector('.set-url-btn')?.addEventListener('click', (e) => handleSetUrl(e.target));
    element.querySelector('.send-alert-btn')?.addEventListener('click', () => {
        log(`Send alert for game ${game.gid}`);
        alert('Feature not yet implemented.');
    });
    // Add other event listeners here if needed
}

function renderGames(games) {
    if (!gamesContainer) return;
    log('Rendering games...');
    if (!games || games.length === 0) {
        gamesContainer.innerHTML = `<div class="game-card"><p>No active games are currently running.</p></div>`;
        return;
    }
    gamesContainer.innerHTML = ''; 
    games.forEach(game => {
        const gameCardWrapper = document.createElement('div');
        gameCardWrapper.innerHTML = createGameCardHTML(game).trim();
        const gameCardElement = gameCardWrapper.firstChild;
        attachEventListeners(gameCardElement, game);
        gamesContainer.appendChild(gameCardElement);
    });
    log('Render complete.');
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (playerCardsModal) playerCardsModal.classList.remove('open');
        });
    }
    fetchActiveGames();
});
