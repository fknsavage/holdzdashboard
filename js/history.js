document.addEventListener('DOMContentLoaded', () => {
    const historyListDiv = document.getElementById('history-list');
    const API_URL = 'https://holdznchill.onrender.com';

    // Guard clause in case we're not on the history page
    if (!historyListDiv) {
        return;
    }

    async function fetchHistory() {
        try {
            const response = await fetch(`${API_URL}/history`);
            if (!response.ok) {
                // Create a more specific error message from the server response if possible
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Network response was not ok. Status: ${response.status}`);
            }
            const history = await response.json();
            renderHistory(history);

        } catch (error) {
            console.error('Error fetching history:', error);
            historyListDiv.innerHTML = `<p class="error-message">Failed to load history: ${error.message}</p>`;
        }
    }
    
    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyListDiv.innerHTML = `<p class="loading-message">No games in history yet.</p>`;
            return;
        }

        // Use reverse() on a copy to not mutate the original, and create HTML elements
        historyListDiv.innerHTML = ''; // Clear loading message
        [...history].reverse().forEach(game => {
            const gameElement = document.createElement('div');
            gameElement.className = 'history-item';
            
            const endedDate = new Date(game.endedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });

            gameElement.innerHTML = `
                <p><strong>Game ID:</strong> ${game.gid}</p>
                <p><strong>Winner:</strong> ${game.winner}</p>
                <p><strong>Ended:</strong> ${endedDate}</p>
            `;
            historyListDiv.appendChild(gameElement);
        });
    }

    fetchHistory();
});