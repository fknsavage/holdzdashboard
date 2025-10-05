document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-menu');
    const imageUpload = document.getElementById('image-upload');
    const imageCanvas = document.getElementById('image-canvas');
    const ballCountSelect = document.getElementById('ball-count');
    const generateBallsBtn = document.getElementById('generate-balls-btn');
    const ballSizeSlider = document.getElementById('ball-size');
    const resetBtn = document.getElementById('reset-btn');
    const addNameShapeBtn = document.getElementById('add-name-shape-btn');
    const textColorSlider = document.getElementById('text-color-slider');
    const textSizeSlider = document.getElementById('text-size-slider');
    const playerNameInput = document.getElementById('player-name-input');
    const playerLimitSelect = document.getElementById('player-limit');
    const customGameIdInput = document.getElementById('custom-game-id');
    const maxCardsSelect = document.getElementById('max-cards-per-player');
    const createGameBtn = document.getElementById('create-game-btn');
    const loadingMessage = document.getElementById('loading-message');

    const ctx = imageCanvas.getContext('2d');
    let balls = [];
    let nameShapes = [];
    let draggedObject = null;
    let offsetX, offsetY;
    let currentImage = null;
    let isEditing = true;

    // Toggle the navigation menu
    hamburgerMenu.addEventListener('click', () => {
        navMenu.classList.toggle('open');
    });

    // Handle image upload and draw on canvas
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImage = new Image();
                currentImage.onload = () => {
                    imageCanvas.width = currentImage.width;
                    imageCanvas.height = currentImage.height;
                    drawCanvas();
                };
                currentImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Bingo number pools
    const bingoPool = {
        'B': Array.from({length: 15}, (_, i) => i + 1),
        'I': Array.from({length: 15}, (_, i) => i + 16),
        'N': Array.from({length: 15}, (_, i) => i + 31),
        'G': Array.from({length: 15}, (_, i) => i + 46),
        'O': Array.from({length: 15}, (_, i) => i + 61)
    };
    const columns = ['B', 'I', 'N', 'G', 'O'];

    // Function to generate a random number from a pool
    const getRandomNumber = (pool) => {
        if (pool.length === 0) return null;
        const index = Math.floor(Math.random() * pool.length);
        const number = pool[index];
        pool.splice(index, 1);
        return number;
    };

    // Generate balls button click
    generateBallsBtn.addEventListener('click', () => {
        if (!isEditing) return;
        const ballCount = parseInt(ballCountSelect.value, 10);
        balls = [];
        const tempPools = JSON.parse(JSON.stringify(bingoPool));
        const initialRadius = parseInt(ballSizeSlider.value, 10);
        const startX = 50;
        const startY = 50;
        const spacing = initialRadius * 2 + 10;

        for (let i = 0; i < ballCount; i++) {
            let number = null;
            let column = null;
            
            while (number === null) {
                const randomColumn = columns[Math.floor(Math.random() * columns.length)];
                if (tempPools[randomColumn].length > 0) {
                    number = getRandomNumber(tempPools[randomColumn]);
                    column = randomColumn;
                }
            }
            balls.push({
                x: startX + (i % 5) * spacing,
                y: startY + Math.floor(i / 5) * spacing,
                radius: initialRadius,
                number: number,
                column: column,
                type: 'ball'
            });
        }
        drawCanvas();
    });

    // Add Name Shape button click
    addNameShapeBtn.addEventListener('click', () => {
        if (!isEditing) return;
        const playerName = playerNameInput.value || 'Player Name';
        const textColor = textColorSlider.value === '1' ? 'black' : 'white';
        const textSize = parseInt(textSizeSlider.value, 10);
        nameShapes.push({
            x: imageCanvas.width / 2,
            y: imageCanvas.height / 2,
            width: 150,
            height: 40,
            name: playerName,
            color: textColor,
            size: textSize,
            type: 'nameShape'
        });
        drawCanvas();
    });

    // Handle ball size change from slider
    ballSizeSlider.addEventListener('input', () => {
        if (!isEditing) return;
        const newRadius = parseInt(ballSizeSlider.value, 10);
        balls.forEach(ball => {
            ball.radius = newRadius;
        });
        drawCanvas();
    });
    
    // Handle text color change from slider
    textColorSlider.addEventListener('input', () => {
        if (!isEditing) return;
        const newColor = textColorSlider.value === '1' ? 'black' : 'white';
        nameShapes.forEach(shape => {
            shape.color = newColor;
        });
        drawCanvas();
    });

    // Handle text size change from slider
    textSizeSlider.addEventListener('input', () => {
        if (!isEditing) return;
        const newSize = parseInt(textSizeSlider.value, 10);
        nameShapes.forEach(shape => {
            shape.size = newSize;
        });
        drawCanvas();
    });

    // Handle player name input change
    playerNameInput.addEventListener('input', () => {
        if (!isEditing) return;
        nameShapes.forEach(shape => {
            shape.name = playerNameInput.value || 'Player Name';
        });
        drawCanvas();
    });

    // Reset button functionality
    resetBtn.addEventListener('click', () => {
        balls = [];
        nameShapes = [];
        currentImage = null;
        imageUpload.value = '';
        isEditing = true;
        setControlsState(true);
        drawCanvas();
    });

    // --- New Functionality: Create Game ---
    createGameBtn.addEventListener('click', () => {
        createGame();
    });

    const createGame = async () => {
        const gameId = customGameIdInput.value.trim();
        if (!gameId) {
            alert('Please enter a custom game ID!');
            return;
        }

        if (!currentImage) {
            alert('Please upload a background image first!');
            return;
        }

        if (balls.length === 0 && nameShapes.length === 0) {
            alert('Please add some balls or a name shape to the canvas!');
            return;
        }

        const base64Image = imageCanvas.toDataURL('image/png').split(',')[1];
        const playerLimit = parseInt(playerLimitSelect.value, 10);
        const maxCardsPerPlayer = parseInt(maxCardsSelect.value, 10);
        
        const gameTemplate = {
            id: gameId,
            baseImage: base64Image,
            ballPositions: balls.map(b => ({ x: b.x, y: b.y, radius: b.radius, column: b.column })),
            nameShapes: nameShapes.map(s => ({ x: s.x, y: s.y, width: s.width, height: s.height, name: s.name, color: s.color, size: s.size })),
            playerLimit: playerLimit,
            maxCardsPerPlayer: maxCardsPerPlayer
        };

        try {
            // Show loading message and disable button
            createGameBtn.disabled = true;
            loadingMessage.style.display = 'block';

            const response = await fetch('https://holdznchill.onrender.com/create-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gameTemplate)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create game on server.');
            }

            const result = await response.json();
            console.log('Server response:', result);
            alert(`Game with ID "${gameId}" has been created! Awaiting players from Facebook Messenger.`);

            const newGame = {
                id: gameId,
                status: 'active',
                playerLimit: playerLimit,
                maxCardsPerPlayer: maxCardsPerPlayer,
                players: []
            };
            let games = JSON.parse(localStorage.getItem('games') || '[]');
            games.push(newGame);
            localStorage.setItem('games', JSON.stringify(games));

        } catch (error) {
            console.error('Error creating game:', error);
            alert(`An error occurred while creating the game: ${error.message}. Please try again.`);
        } finally {
            // Hide loading message and re-enable button
            createGameBtn.disabled = false;
            loadingMessage.style.display = 'none';
        }
    };

    // Main drawing function
    const drawCanvas = () => {
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        if (currentImage) {
            ctx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);
        }
        drawBalls();
        drawNameShapes();
    };

    // Function to draw all balls
    const drawBalls = () => {
        balls.forEach(ball => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.closePath();
            
            ctx.fillStyle = 'white';
            ctx.font = `${ball.radius}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ball.number, ball.x, ball.y);
        });
    };
    
    // Function to draw all name shapes
    const drawNameShapes = () => {
        nameShapes.forEach(shape => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(shape.x - shape.width / 2, shape.y - shape.height / 2, shape.width, shape.height);
            
            ctx.fillStyle = shape.color;
            ctx.font = `${shape.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(shape.name, shape.x, shape.y);
        });
    };

    // Mouse and Touch Events for Drag-and-Drop
    const getMousePos = (canvas, event) => {
        const rect = imageCanvas.getBoundingClientRect();
        const scaleX = imageCanvas.width / rect.width;
        const scaleY = imageCanvas.height / rect.height;
        let clientX, clientY;
        
        if (event.touches) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e) => {
        if (!isEditing) return;
        const pos = getMousePos(imageCanvas, e);
        
        for (let i = nameShapes.length - 1; i >= 0; i--) {
            const shape = nameShapes[i];
            if (pos.x > shape.x - shape.width / 2 && pos.x < shape.x + shape.width / 2 &&
                pos.y > shape.y - shape.height / 2 && pos.y < shape.y + shape.height / 2) {
                draggedObject = shape;
                offsetX = pos.x - shape.x;
                offsetY = pos.y - shape.y;
                
                nameShapes.splice(i, 1);
                nameShapes.push(draggedObject);
                
                drawCanvas();
                return;
            }
        }
        
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            const distance = Math.sqrt((pos.x - ball.x)**2 + (pos.y - ball.y)**2);
            if (distance < ball.radius) {
                draggedObject = ball;
                offsetX = pos.x - ball.x;
                offsetY = pos.y - ball.y;
                
                balls.splice(i, 1);
                balls.push(draggedObject);
                
                drawCanvas();
                return;
            }
        }
    };

    const handleMouseMove = (e) => {
        if (!draggedObject || !isEditing) return;
        const pos = getMousePos(imageCanvas, e);
        draggedObject.x = pos.x - offsetX;
        draggedObject.y = pos.y - offsetY;
        drawCanvas();
    };

    const handleMouseUp = () => {
        draggedObject = null;
    };

    imageCanvas.addEventListener('mousedown', handleMouseDown);
    imageCanvas.addEventListener('mousemove', handleMouseMove);
    imageCanvas.addEventListener('mouseup', handleMouseUp);
    imageCanvas.addEventListener('mouseleave', handleMouseUp);

    imageCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMouseDown(e);
    }, { passive: false });

    imageCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleMouseMove(e);
    }, { passive: false });

    imageCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleMouseUp();
    });
});
