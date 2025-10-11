document.addEventListener('DOMContentLoaded', () => {
    const historyListDiv = document.getElementById('history-list-container'); // Make sure this matches your HTML container ID
    const API_URL = 'https://holdznchill.onrender.com';

    if (!historyListDiv) {
        return;
    }

    async function fetchDetailedHistory() {
        try {
            const response = await fetch(`${API_URL}/detailed-history`);
            if (!response.ok) throw new Error("Network response was not ok.");
            const games = await response.json();
            renderDetailedHistory(games);
        } catch (error) {
            console.error('Error fetching detailed history:', error);
            historyListDiv.innerHTML = `<p class="error-message">Failed to load history.</p>`;
        }
    }

    function showImagePreview(url) {
        const previewWindow = window.open('', '_blank', 'width=600,height=800');
        if (previewWindow) {
            previewWindow.document.write(`<img src="${url}" style="max-width: 100%; height: auto;">`);
            previewWindow.document.title = "Card Preview";
        }
    }

    function renderDetailedHistory(games) {
        if (!games.length) {
            historyListDiv.innerHTML = '<p>No ended games to display.</p>';
            return;
        }
        historyListDiv.innerHTML = '';

        games.forEach(game => {
            const gameDiv = document.createElement('div');
            gameDiv.className = 'history-game';
            const endedDate = new Date(game.ended_at).toLocaleString();

            gameDiv.innerHTML = `<h3>Game ID: ${game.gid}</h3><p>Ended: ${endedDate}</p>`;

            game.players.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'history-player';
                playerDiv.innerHTML = `<strong>Player: ${player.name} (${player.psid})</strong><div class="cards-container"></div>`;

                const cardsContainer = playerDiv.querySelector('.cards-container');
                player.cards.forEach(url => {
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = `${player.name}'s card`;
                    img.className = 'card-thumb';
                    img.style.cursor = 'pointer';
                    img.addEventListener('click', () => showImagePreview(url));
                    cardsContainer.appendChild(img);
                });

                gameDiv.appendChild(playerDiv);
            });

            historyListDiv.appendChild(gameDiv);
        });
    }

    fetchDetailedHistory();
});
