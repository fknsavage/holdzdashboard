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

// THIS FUNCTION HAS BEEN SIMPLIFIED
async function endGame(gid) {
    log(`Attempting to end game: ${gid}`);
    if (confirm(`Are you sure you want to end game ${gid}? This cannot be undone.`)) {
        try {
            const response = await fetch(`${API_URL}/end-game/${gid}`, {
                method: 'POST', // No body is needed
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to end game.');
            
            alert('Game ended successfully!');
            fetchActiveGames(); // Refresh the list of active games
        } catch (error) {
            log(`Error ending game: ${error.message}`);
            alert(`Error: ${error.message}`);
        }
    }
}

async function removePlayer(gid, player) {
    log(`Attempting to remove player: ${player.name}`);
    if (confirm(`Are you sure you want to remove ${player.name} (PIN: ${player.pin}) from game ${gid}?`)) {
        try {
            const response = await fetch(`${API_URL}/remove-player/${gid}/${player.psid}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to remove player.');
            
            alert('Player removed successfully!');
            fetchActiveGames(); // Refresh the list of active games
        } catch (error) {
            log(`Error removing player: ${error.message}`);
            alert(`Error: ${error.message}`);
        }
    }
}

function attachEventListeners(element, game) {
    element.querySelector('.set-url-btn')?.addEventListener('click', (e) => handleSetUrl(e.target));
    element.querySelector('.send-alert-btn')?.addEventListener('click', () => {
        log(`Send alert for game ${game.gid}`);
        alert('Feature not yet implemented.');
    });
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

function openCardsModal(player) {
    const cardContent = player.cards.map(url => `<img src="${url}" alt="Card" style="max-width: 100%; margin-bottom: 10px;">`).join('');
    modalCardsContainer.innerHTML = `<h3>Cards for ${player.name}</h3>${cardContent}`;
    playerCardsModal.classList.add('open');
}

function closeModal() {
    if (playerCardsModal) playerCardsModal.classList.remove('open');
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    fetchActiveGames();
});
