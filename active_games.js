document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-menu');
    const gamesList = document.getElementById('games-list');
    const noGamesMessage = document.getElementById('no-games');

    hamburgerMenu.addEventListener('click', () => {
        navMenu.classList.toggle('open');
    });

    const getGames = () => {
        return JSON.parse(localStorage.getItem('games') || '[]');
    };

    const renderGames = () => {
        const games = getGames();
        gamesList.innerHTML = '';

        const activeGames = games.filter(game => game.status === 'active');
        if (activeGames.length === 0) {
            noGamesMessage.style.display = 'block';
            return;
        } else {
            noGamesMessage.style.display = 'none';
        }

        activeGames.forEach(game => {
            const li = document.createElement('li');
            li.className = 'game-item';

            const gameInfo = document.createElement('div');
            gameInfo.className = 'game-info';
            gameInfo.textContent = `Game ID: ${game.id}`;

            const gameDetails = document.createElement('div');
            gameDetails.className = 'game-details';
            gameDetails.innerHTML = `
                Players: <strong>${game.players.length}</strong> / <strong>${game.playerLimit}</strong><br>
                Slots Left: <strong>${game.playerLimit - game.players.length}</strong>
            `;

            const gameActions = document.createElement('div');
            gameActions.className = 'game-actions';
            const playedButton = document.createElement('button');
            playedButton.textContent = 'Mark as Played';
            playedButton.addEventListener('click', () => {
                handleMarkAsPlayed(game.id, game.players);
            });
            gameActions.appendChild(playedButton);

            li.appendChild(gameInfo);
            li.appendChild(gameDetails);
            li.appendChild(gameActions);
            gamesList.appendChild(li);
        });
    };

    const handleMarkAsPlayed = async (gameId, players) => {
        const winnerName = prompt("Enter the name of the winner:");
        if (winnerName === null || winnerName.trim() === '') {
            alert("Please enter a winner's name to send the congratulations message.");
            return;
        }

        const message = `Congratulations, ${winnerName} is the winner! Hope you all had a blast!`;

        try {
            const response = await fetch('https://holdznchill.onrender.com/end-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameId, winnerName, players })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to end game on server.');
            }

            const result = await response.json();
            console.log('Server response:', result);
            alert(`Game ${gameId} has been marked as played, and messages have been sent.`);

            let games = getGames();
            games = games.map(g => {
                if (g.id === gameId) {
                    g.status = 'inactive';
                }
                return g;
            });
            localStorage.setItem('games', JSON.stringify(games));
            renderGames();

        } catch (error) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to end game on server.');
            }

            const result = await response.json();
            console.log('Server response:', result);
            alert(`Game ${gameId} has been marked as played, and messages have been sent.`);

            let games = getGames();
            games = games.map(g => {
                if (g.id === gameId) {
                    g.status = 'inactive';
                }
                return g;
            });
            localStorage.setItem('games', JSON.stringify(games));
            renderGames();

        } catch (error) {
            console.error('Error ending game:', error);
            alert(`An error occurred while ending the game: ${error.message}. Please try again.`);
        }
    };

    renderGames();
});
