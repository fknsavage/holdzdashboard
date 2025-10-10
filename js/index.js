document.addEventListener('DOMContentLoaded', () => {
    const devLog = document.getElementById('dev-log');
    const log = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        if(devLog) devLog.textContent = `[${timestamp}] ${message}`;
        console.log(`[${timestamp}] ${message}`);
    };
    log('App starting...');

    const mainActionBtn = document.getElementById('main-action-btn');
    if (!mainActionBtn) return; // Exit if not on the creator page

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
    
    const state = { uploadedImage: null, balls: [], textPlaceholder: null, dateTimePlaceholder: null, isDragging: false, selectedElement: null, devicePixelRatio: window.devicePixelRatio || 1 };
    let creationStep = 'CREATE_GAME';

    class BingoBall {
        constructor(x, y, radius) { this.x = x; this.y = y; this.radius = radius; this.type = 'ball'; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = '#e74c3c'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5; ctx.fill(); ctx.shadowBlur = 0; ctx.closePath(); }
        isPointInside(x, y) { const dx = x - this.x; const dy = y - this.y; return dx * dx + dy * dy < this.radius * this.radius; }
    }
    class TextPlaceholder {
        constructor(x, y, text, fontSize, type) { this.x = x; this.y = y; this.text = text; this.fontSize = fontSize; this.type = type; this.width=0; this.height=0; }
        draw() { ctx.font = `bold ${this.fontSize}px Montserrat`; ctx.fillStyle = '#ecf0f1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5; const lines = this.text.split('\n'); let lineHeight = this.fontSize * 1.2; let totalHeight = lines.length * lineHeight; let startY = this.y - totalHeight / 2 + lineHeight / 2; lines.forEach((line, i) => ctx.fillText(line, this.x, startY + i * lineHeight)); ctx.shadowBlur = 0; this.width = ctx.measureText(lines[0] || '').width; this.height = totalHeight; }
        isPointInside(x, y) { return x >= this.x - this.width / 2 && x <= this.x + this.width / 2 && y >= this.y - this.height / 2 && y <= this.y + this.height / 2; }
    }
    
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
            canvasPlaceholder.classList.add('hidden');
            const imgAspectRatio = state.uploadedImage.width / state.uploadedImage.height;
            const canvasAspectRatio = cssWidth / cssHeight;
            let imgDrawWidth = (imgAspectRatio > canvasAspectRatio) ? cssWidth : cssHeight * imgAspectRatio;
            let imgDrawHeight = (imgAspectRatio > canvasAspectRatio) ? cssWidth / imgAspectRatio : cssHeight;
            let imgDrawX = (cssWidth - imgDrawWidth) / 2;
            let imgDrawY = (cssHeight - imgDrawHeight) / 2;
            ctx.drawImage(state.uploadedImage, imgDrawX, imgDrawY, imgDrawWidth, imgDrawHeight);
        } else {
            canvasPlaceholder.classList.remove('hidden');
        }
        state.balls.forEach(ball => ball.draw());
        if (state.textPlaceholder) state.textPlaceholder.draw();
        if (state.dateTimePlaceholder) state.dateTimePlaceholder.draw();
    };
    
    const getPointerPos = (event) => { const rect = canvas.getBoundingClientRect(); const clientX = event.clientX || event.touches[0].clientX; const clientY = event.clientY || event.touches[0].clientY; return { x: clientX - rect.left, y: clientY - rect.top, }; };
    const handleCanvasStart = (event) => { event.preventDefault(); const pos = getPointerPos(event); const allElements = [state.dateTimePlaceholder, state.textPlaceholder, ...state.balls].filter(Boolean); state.selectedElement = allElements.find(el => el.isPointInside(pos.x, pos.y)); if (state.selectedElement) { state.isDragging = true; canvasContainer.style.cursor = 'grabbing'; } };
    const handleCanvasMove = (event) => { event.preventDefault(); if (state.isDragging && state.selectedElement) { const pos = getPointerPos(event); state.selectedElement.x = pos.x; state.selectedElement.y = pos.y; drawCanvas(); } };
    const handleCanvasEnd = () => { state.isDragging = false; state.selectedElement = null; canvasContainer.style.cursor = 'grab'; };
    const handleImageUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const img = new Image(); img.onload = () => { state.uploadedImage = img; drawCanvas(); }; img.src = event.target.result; }; reader.readAsDataURL(file); };
    const updateBallCount = (count) => { state.balls = []; const radius = parseFloat(ballSizeSlider.value); const startX = canvas.clientWidth / 2; const startY = canvas.clientHeight / 2; for (let i = 0; i < count; i++) { state.balls.push(new BingoBall(startX + (i * (radius * 2.5) - (count * (radius * 1.25))), startY, radius)); } drawCanvas(); };
    
    const updateTextPlaceholder = () => {
        const text = playerNameInput.value || "Player Name";
        const fontSize = parseFloat(nameSizeSlider.value);
        if (!state.textPlaceholder) {
            state.textPlaceholder = new TextPlaceholder(canvas.clientWidth / 2, canvas.clientHeight * 0.8, text, fontSize, 'player-name');
        } else {
            state.textPlaceholder.text = text;
            state.textPlaceholder.fontSize = fontSize;
        }
        drawCanvas();
    };
    const updateDateTimePlaceholder = () => {
        const now = new Date();
        const dateTimeText = now.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
        const fontSize = parseFloat(dateSizeSlider.value);
        if (!state.dateTimePlaceholder) {
            state.dateTimePlaceholder = new TextPlaceholder(canvas.clientWidth / 2, canvas.clientHeight * 0.1, dateTimeText, fontSize, 'date-time');
        } else {
            state.dateTimePlaceholder.text = dateTimeText;
            state.dateTimePlaceholder.fontSize = fontSize;
        }
        drawCanvas();
    };

    mainActionBtn.addEventListener('click', async () => {
        mainActionBtn.disabled = true;
        const gid = document.getElementById('game-id-input').value;

        if (creationStep === 'CREATE_GAME') {
            log('Step 1: Create Game clicked.');
            mainActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            const maxp = document.getElementById('max-players-selector').querySelector('.control-button.active').dataset.value;
            const cards = document.getElementById('cards-per-user-selector').querySelector('.control-button.active').dataset.value;
            if (!gid || gid.trim() === '') { alert("Please enter a unique Game ID."); mainActionBtn.disabled = false; mainActionBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Game'; return; }
            try {
                const response = await fetch('https://holdznchill.onrender.com/create-game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gid, maxp, cards, gstatus: 'active' }) });
                if (!response.ok) throw new Error((await response.json()).message);
                alert('Step 1 OK: Game created! Ready for Step 2.');
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Template';
                creationStep = 'UPLOAD_TEMPLATE';
            } catch (error) {
                alert('Game creation failed: ' + error.message);
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Game';
            }
        } else if (creationStep === 'UPLOAD_TEMPLATE') {
            log('Step 2: Upload Template clicked.');
            mainActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            if (!state.uploadedImage) { alert('Please upload a background image first.'); mainActionBtn.disabled = false; mainActionBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Template'; return; }
            
            const templateData = {
                backgroundImage: state.uploadedImage.src,
                balls: state.balls.map(b => ({ x: b.x / canvas.clientWidth, y: b.y / canvas.clientHeight, radius: b.radius })),
                playerNamePlaceholder: { x: state.textPlaceholder.x / canvas.clientWidth, y: state.textPlaceholder.y / canvas.clientHeight, fontSize: state.textPlaceholder.fontSize },
                dateTimePlaceholder: { x: state.dateTimePlaceholder.x / canvas.clientWidth, y: state.dateTimePlaceholder.y / canvas.clientHeight, fontSize: state.dateTimePlaceholder.fontSize }
            };

            try {
                const response = await fetch('https://holdznchill.onrender.com/upload-template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gid, templateData }) });
                if (!response.ok) throw new Error((await response.json()).message);
                alert('Step 2 OK: Template uploaded successfully!');
                mainActionBtn.innerHTML = '<i class="fas fa-check"></i> Game Active!';
                creationStep = 'COMPLETE';
            } catch (error) {
                alert('Template upload failed: ' + error.message);
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Template';
            }
        }
    });

    const handleReset = () => {
        log('Resetting.');
        state.balls = []; state.uploadedImage = null; state.textPlaceholder = null; state.dateTimePlaceholder = null;
        document.getElementById('game-id-input').value = '';
        mainActionBtn.disabled = false;
        mainActionBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Game';
        creationStep = 'CREATE_GAME';
        playerNameInput.value = '';
        drawCanvas();
        updateTextPlaceholder();
        updateDateTimePlaceholder();
    };

    resetButton.addEventListener('click', handleReset);
    uploadButton.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', handleImageUpload);
    
    playerNameInput.addEventListener('input', updateTextPlaceholder);
    nameSizeSlider.addEventListener('input', updateTextPlaceholder);
    dateSizeSlider.addEventListener('input', updateDateTimePlaceholder);
    ballSizeSlider.addEventListener('input', (e) => {
        const newRadius = parseFloat(e.target.value);
        state.balls.forEach(ball => ball.radius = newRadius);
        drawCanvas();
    });
    
    document.querySelectorAll('.segmented-control').forEach(container => {
        container.addEventListener('click', (e) => {
            const button = e.target.closest('.control-button');
            if (!button) return;
            container.querySelectorAll('.control-button').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-checked', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-checked', 'true');
            if (container.id === 'ball-count-selector') {
                updateBallCount(parseInt(button.dataset.value));
            }
        });
    });

    canvas.addEventListener('mousedown', handleCanvasStart);
    canvas.addEventListener('mousemove', handleCanvasMove);
    canvas.addEventListener('mouseup', handleCanvasEnd);
    canvas.addEventListener('mouseleave', handleCanvasEnd);
    canvas.addEventListener('touchstart', handleCanvasStart, { passive: false });
    canvas.addEventListener('touchmove', handleCanvasMove, { passive: false });
    canvas.addEventListener('touchend', handleCanvasEnd);
    
    window.addEventListener('resize', drawCanvas);
    drawCanvas();
    updateTextPlaceholder();
    updateDateTimePlaceholder();
    updateBallCount(5); // Initialize with 5 balls
});