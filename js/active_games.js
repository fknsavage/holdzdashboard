document.addEventListener('DOMContentLoaded', () => {
    const devLog = document.getElementById('dev-log');
    const copyLogBtn = document.getElementById('copy-log-btn');
    const logHistory = [];

    const log = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        if(devLog) devLog.textContent = logMessage;
        logHistory.push(logMessage);
        console.log(logMessage);
    };

    if (copyLogBtn) {
        copyLogBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(logHistory.join('\n')).then(() => log('Log copied!'));
        });
    }
    log('App starting...');

    const gameInfoDiv = document.getElementById('game-info');
    const playerCardsModal = document.getElementById('player-cards-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const API_URL = 'https://holdznchill.onrender.com';

    if (!gameInfoDiv) return;

    function renderActiveGame(data) {
        log('Rendering game data...');
        if (data && data.gstatus === 'active') {
            const totalSlotsTaken = (data.players || []).reduce((sum, player) => sum + (player.cards_count || 0), 0);
            let playerListHtml = data.players && data.players.length > 0 ? 
                data.players.map(player => `
                    <li class="player-item">
                        <div class="player-info">
                            <span>${player.name} | PIN: <strong>${player.pin}</strong> (${player.cards_count} cards)</span>
                        </div>
                        <div class="player-actions">
                            <button class="action-button secondary-button view-cards-btn" data-player-psid="${player.psid}">View</button>
                            <button class="action-button secondary-button remove-player-btn" data-player-psid="${player.psid}" data-player-name="${player.name}">Remove</button>
                        </div>
                    </li>
                `).join('') : '<li>No players have joined yet.</li>';

            gameInfoDiv.innerHTML = `
                <div class="game-card" id="game-card-${data.gid}">
                    <div class="game-card-header">
                        <h3 class="game-id">Game ID: ${data.gid}</h3>
                        <span class="status-badge status-active">Active</span>
                    </div>
                    <p><strong>Slots Taken:</strong> ${totalSlotsTaken} / ${data.maxp}</p>
                    <p><strong>Slots per User:</strong> ${data.cards}</p>
                    <div class="url-input-group">
                        <label for="fb-url-input-${data.gid}" class="sr-only">Facebook Live URL</label>
                        <input type="text" id="fb-url-input-${data.gid}" placeholder="Paste Facebook Live URL" value="${data.live_url || ''}">
                        <button id="save-url-btn-${data.gid}">Set URL</button>
                    </div>
                    <div class="card-actions">
                        <button class="action-button secondary-button" id="preview-cards-btn-${data.gid}">Preview All</button>
                        <button class="action-button secondary-button" id="send-live-alert-btn-${data.gid}">Send Alert</button>
                        <button class="action-button end-game" id="end-game-btn-${data.gid}">End Game</button>
                    </div>
                    <h4>Players:</h4>
                    <ul class="player-list">${playerListHtml}</ul>
                </div>
            `;
            
            attachGameCardEventListeners(data);

        } else {
            gameInfoDiv.innerHTML = `<div class="game-card"><p>No active games are currently running.</p></div>`;
        }
        log('Render complete.');
    }

    function attachGameCardEventListeners(data) {
        document.getElementById(`save-url-btn-${data.gid}`)?.addEventListener('click', () => setLiveUrl(data.gid));
        document.getElementById(`send-live-alert-btn-${data.gid}`)?.addEventListener('click', () => sendLiveAlert(data.gid));
        
        const endGameBtn = document.getElementById(`end-game-btn-${data.gid}`);
        const previewCardsBtn = document.getElementById(`preview-cards-btn-${data.gid}`);

        if (data.players && data.players.length > 0) {
            endGameBtn?.addEventListener('click', () => endGame(data.gid));
            previewCardsBtn?.addEventListener('click', () => openCardsModal(data.gid, data.players));
            
            document.querySelectorAll('.view-cards-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const player = data.players.find(p => p.psid === button.dataset.playerPsid);
                    if(player) openCardsModal(data.gid, [player]);
                });
            });
            document.querySelectorAll('.remove-player-btn').forEach(button => {
                button.addEventListener('click', (e) => removePlayer(e, data.gid, button.dataset.playerPsid, button.dataset.playerName));
            });
        } else {
            if(endGameBtn) endGameBtn.disabled = true;
            if(previewCardsBtn) previewCardsBtn.disabled = true;
        }
    }

    async function fetchActiveGame() {
        log('Fetching active game...');
        try {
            const response = await fetch(`${API_URL}/active-game`);
            log(`Server responded with status: ${response.status}`);
            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
            const data = await response.json();
            log('Successfully fetched and parsed data.');
            renderActiveGame(data);
        } catch (error) {
            log(`Error fetching game: ${error.message}`);
            gameInfoDiv.innerHTML = `<div class="game-card" style="border-color: red;"><p class="error-message">Failed to load: ${error.message}</p></div>`;
        }
    }
    
    function openCardsModal(gid, players) {
        const modalCardsContainer = document.getElementById('modal-cards-container');
        const downloadCardsBtn = document.getElementById('download-cards-btn');
        document.getElementById('modal-game-id').textContent = gid;
        modalCardsContainer.innerHTML = players.map(player => `
            <div class="modal-card">
                <h4>${player.name} (${player.cards_count} cards)</h4>
                ${(player.cards && player.cards.length > 0) ? player.cards.map(cardUrl => `<img src="${cardUrl.startsWith('http') ? cardUrl : API_URL + cardUrl}" alt="Card">`).join('') : '<p>No card images.</p>'}
            </div>
        `).join('');
        downloadCardsBtn.onclick = () => alert("Download feature not yet implemented.");
        playerCardsModal.hidden = false;
        document.getElementById('modal-close-btn').focus();
    }

    function closeModal() {
        if (playerCardsModal) playerCardsModal.hidden = true;
    }
    modalCloseBtn?.addEventListener('click', closeModal);
    playerCardsModal?.addEventListener('click', (e) => {
        if(e.target === playerCardsModal) closeModal();
    });

    async function endGame(gid) {
        log(`Attempting to end game: ${gid}`);
        const winnerName = prompt('Enter the winner\'s name:');
        if (winnerName && confirm(`End game ${gid} with winner ${winnerName}?`)) {
            try {
                const response = await fetch(`${API_URL}/end-game/${gid}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ winnerName })
                });
                if (!response.ok) throw new Error((await response.json()).message || 'Failed to end game.');
                alert('Game ended successfully.');
                window.location.reload(); 
            } catch (error) {
                log(`Error ending game: ${error.message}`);
                alert(`Error: ${error.message}`);
            }
        }
    }

    async function removePlayer(e, gid, psid, playerName) {
        log(`Attempting to remove player: ${playerName}`);
        e.stopPropagation();
        if (confirm(`Remove player ${playerName} from game ${gid}?`)) {
            try {
                const response = await fetch(`${API_URL}/remove-player/${gid}/${psid}`, { method: 'DELETE' });
                if (!response.ok) throw new Error((await response.json()).message || 'Failed to remove player.');
                alert('Player removed successfully.');
                window.location.reload();
            } catch (error) {
                log(`Error removing player: ${error.message}`);
                alert(`Error: ${error.message}`);
            }
        }
    }

    async function setLiveUrl(gid) {
        log('Set URL button clicked.');
        alert('This feature requires a backend endpoint which is not yet built.');
    }

    async function sendLiveAlert(gid) {
        log('Send Alert button clicked.');
        alert('This feature requires a backend endpoint which is not yet built.');
    }

    fetchActiveGame();
});