document.addEventListener('DOMContentLoaded', () => {
    const devLog = document.getElementById('dev-log');
    const log = (message) => {
        if (devLog) {
            const timestamp = new Date().toLocaleTimeString();
            devLog.textContent = `[${timestamp}] ${message}`;
            console.log(`[${timestamp}] ${message}`);
        }
    };
    log('App starting...');

    const mainActionBtn = document.getElementById('main-action-btn');
    // This check ensures the script only runs on the card creation page
    if (!mainActionBtn) { 
        return; 
    }

    // --- Element Selectors ---
    const resetButton = document.getElementById('reset-button');
    const canvas = document.getElementById('bingo-canvas');
    const ctx = canvas.getContext('2d');
    const canvasPlaceholder = document.getElementById('canvas-placeholder');
    const imageUploadInput = document.getElementById('image-upload-input');
    const canvasContainer = document.getElementById('canvas-container');
    const uploadButton = document.getElementById('upload-button');
    const ballSizeSlider = document.getElementById('ball-size-slider');
    const playerNameInput = document.getElementById('player-name-input');
    const nameSizeSlider = document.getElementById('name-size-slider');
    const dateSizeSlider = document.getElementById('date-size-slider');
    
    // --- Application State ---
    const state = { 
        uploadedImage: null, 
        balls: [], 
        playerNamePlaceholder: null,
        dateTimePlaceholder: null,
        isDragging: false, 
        selectedElement: null, 
        devicePixelRatio: window.devicePixelRatio || 1 
    };
    let creationStep = 'CREATE_GAME';

    // --- Classes for Canvas Objects ---
    class BingoBall {
        constructor(x, y, radius) { this.x = x; this.y = y; this.radius = radius; this.type = 'ball'; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = '#e74c3c'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5; ctx.fill(); ctx.shadowBlur = 0; ctx.closePath(); }
        isPointInside(px, py) { const dx = px - this.x; const dy = py - this.y; return dx * dx + dy * dy < this.radius * this.radius; }
    }
    class TextPlaceholder {
        constructor(x, y, text, fontSize, type) { this.x = x; this.y = y; this.text = text; this.fontSize = fontSize; this.type = type; this.width=0; this.height=0; }
        draw() { 
            ctx.font = `bold ${this.fontSize}px Montserrat`; 
            ctx.fillStyle = '#ecf0f1'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle'; 
            ctx.shadowColor = 'rgba(0,0,0,0.7)'; 
            ctx.shadowBlur = 5; 
            const lines = this.text.split('\n'); 
            const lineHeight = this.fontSize * 1.2; 
            const totalHeight = lines.length * lineHeight; 
            const startY = this.y - totalHeight / 2 + lineHeight / 2; 
            lines.forEach((line, i) => ctx.fillText(line, this.x, startY + (i * lineHeight))); 
            ctx.shadowBlur = 0; 
            this.width = ctx.measureText(lines[0] || '').width; 
            this.height = totalHeight; 
        }
        isPointInside(px, py) { 
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            return px >= this.x - halfWidth && px <= this.x + halfWidth && py >= this.y - halfHeight && py <= this.y + halfHeight; 
        }
    }
    
    // --- Canvas Drawing Logic ---
    const drawCanvas = () => {
        const dpr = state.devicePixelRatio;
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        if(canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
            canvas.width = cssWidth * dpr;
            canvas.height = cssHeight * dpr;
            ctx.scale(dpr, dpr);
        }
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        if (state.uploadedImage) {
            if(canvasPlaceholder) canvasPlaceholder.style.display = 'none';
            const imgAspectRatio = state.uploadedImage.width / state.uploadedImage.height;
            const canvasAspectRatio = cssWidth / cssHeight;
            let imgDrawWidth = (imgAspectRatio > canvasAspectRatio) ? cssWidth : cssHeight * imgAspectRatio;
            let imgDrawHeight = (imgAspectRatio > canvasAspectRatio) ? cssWidth / imgAspectRatio : cssHeight;
            let imgDrawX = (cssWidth - imgDrawWidth) / 2;
            let imgDrawY = (cssHeight - imgDrawHeight) / 2;
            ctx.drawImage(state.uploadedImage, imgDrawX, imgDrawY, imgDrawWidth, imgDrawHeight);
        } else {
            if(canvasPlaceholder) canvasPlaceholder.style.display = 'flex';
        }
        state.balls.forEach(ball => ball.draw());
        if (state.playerNamePlaceholder) state.playerNamePlaceholder.draw();
        if (state.dateTimePlaceholder) state.dateTimePlaceholder.draw();
    };
    
    // --- Placeholder Creation & Updates ---
    const updatePlayerNamePlaceholder = () => {
        const text = playerNameInput.value || "Player Name";
        const fontSize = parseFloat(nameSizeSlider.value);
        if (!state.playerNamePlaceholder) {
            state.playerNamePlaceholder = new TextPlaceholder(canvas.clientWidth / 2, canvas.clientHeight * 0.85, text, fontSize, 'player-name');
        } else {
            state.playerNamePlaceholder.text = text;
            state.playerNamePlaceholder.fontSize = fontSize;
        }
        drawCanvas();
    };

    const updateDateTimePlaceholder = () => {
        const now = new Date();
        const hour = now.getHours();
        let greeting;
        if (hour < 12) {
            greeting = "Good Morning";
        } else if (hour < 18) {
            greeting = "Good Afternoon";
        } else {
            greeting = "Good Evening";
        }
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const dateTimeText = `${greeting}\n${dateString}`;
        const fontSize = parseFloat(dateSizeSlider.value);
        if (!state.dateTimePlaceholder) {
            state.dateTimePlaceholder = new TextPlaceholder(canvas.clientWidth / 2, canvas.clientHeight * 0.15, dateTimeText, fontSize, 'date-time');
        } else {
            state.dateTimePlaceholder.text = dateTimeText;
            state.dateTimePlaceholder.fontSize = fontSize;
        }
        drawCanvas();
    };

    // --- Event Handlers & API Calls ---
    const getPointerPos = (event) => { /* ... unchanged ... */ };
    const handleCanvasStart = (event) => { /* ... unchanged ... */ };
    const handleCanvasMove = (event) => { /* ... unchanged ... */ };
    const handleCanvasEnd = () => { /* ... unchanged ... */ };
    const handleImageUpload = (e) => { /* ... unchanged ... */ };
    const updateBallCount = (count) => { /* ... unchanged ... */ };
    mainActionBtn.addEventListener('click', async () => { /* ... unchanged ... */ });
    const handleReset = () => { /* ... unchanged ... */ };

    // --- Attach Event Listeners ---
    resetButton.addEventListener('click', handleReset);
    uploadButton.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', handleImageUpload);
    playerNameInput.addEventListener('input', updatePlayerNamePlaceholder);
    nameSizeSlider.addEventListener('input', updatePlayerNamePlaceholder);
    dateSizeSlider.addEventListener('input', updateDateTimePlaceholder);
    ballSizeSlider.addEventListener('input', (e) => { const newRadius = parseFloat(e.target.value); state.balls.forEach(ball => ball.radius = newRadius); drawCanvas(); });
    document.querySelectorAll('.segmented-control').forEach(container => { /* ... unchanged ... */ });
    canvas.addEventListener('mousedown', handleCanvasStart);
    // ... other canvas event listeners
    window.addEventListener('resize', drawCanvas);
    
    // --- Initial Page Load ---
    drawCanvas();
    updatePlayerNamePlaceholder();
    updateDateTimePlaceholder();
    // Default to 3 balls selected as in your screenshot
    const initialBallButton = document.querySelector('.control-button[data-value="3"]');
    if(initialBallButton) {
        initialBallButton.click();
    } else {
        updateBallCount(5); // Fallback
    }
});
