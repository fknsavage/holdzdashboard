document.addEventListener("DOMContentLoaded", () => {
    const mainActionBtn = document.getElementById("main-action-btn");
    if (!mainActionBtn) return;

    const devLog = document.getElementById("dev-log");
    const log = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        if (devLog) devLog.textContent = `[${timestamp}] ${message}`;
        console.log(`[${timestamp}] ${message}`);
    };

    log("App starting...");

    // --- Element Selectors ---
    const resetButton = document.getElementById("reset-button");
    const canvas = document.getElementById("bingo-canvas");
    const ctx = canvas.getContext("2d");
    const canvasPlaceholder = document.getElementById("canvas-placeholder");
    const canvasContainer = document.getElementById("canvas-container");
    const templateGallery = document.getElementById("templateGallery");
    const uploadButton = document.getElementById("upload-button");
    const imageUploadInput = document.getElementById("image-upload-input");
    const ballSizeSlider = document.getElementById("ball-size-slider");
    const playerNameInput = document.getElementById("player-name-input");
    const nameSizeSlider = document.getElementById("name-size-slider");
    const dateSizeSlider = document.getElementById("date-size-slider");

    // --- Application State ---
    const state = {
        selectedTemplateUrl: null,
        uploadedImage: null,
        balls: [],
        playerNamePlaceholder: null,
        dateTimePlaceholder: null,
        isDragging: false,
        selectedElement: null,
        devicePixelRatio: window.devicePixelRatio || 1
    };

    let creationStep = "CREATEGAME";

    // --- Classes for Canvas Objects ---
    class BingoBall {
        constructor(x, y, radius) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.type = "ball";
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = "#e74c3c";
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();
        }
        isPointInside(px, py) {
            const dx = px - this.x;
            const dy = py - this.y;
            return dx * dx + dy * dy <= this.radius * this.radius;
        }
    }

    class TextPlaceholder {
        constructor(x, y, text, fontSize, type) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.fontSize = fontSize;
            this.type = type;
            this.width = 0;
            this.height = 0;
        }
        draw() {
            ctx.font = `bold ${this.fontSize}px Montserrat`;
            ctx.fillStyle = "#ecf0f1";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.7)";
            ctx.shadowBlur = 5;

            const lines = this.text.split("\n");
            const lineHeight = this.fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;
            const startY = this.y - (totalHeight / 2) + (lineHeight / 2);

            lines.forEach((line, i) => {
                ctx.fillText(line, this.x, startY + i * lineHeight);
            });
            ctx.shadowBlur = 0;

            this.width = lines.length === 0 ? 0 : Math.max(...lines.map(line => ctx.measureText(line).width));
            this.height = totalHeight;
        }
        isPointInside(px, py) {
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            return (
                px >= this.x - halfWidth &&
                px <= this.x + halfWidth &&
                py >= this.y - halfHeight &&
                py <= this.y + halfHeight
            );
        }
    }

    // --- Template Gallery Loader ---
    async function loadTemplates() {
        if (!templateGallery) return;
        templateGallery.innerHTML = '';
        try {
            const response = await fetch("/assets/templates.json");
            if (!response.ok) throw new Error("Template list could not be loaded.");
            const templates = await response.json();
            templates.forEach(url => {
                const img = document.createElement("img");
                img.src = url;
                img.className = "gallery-template-thumb";
                img.style.width = "78px";
                img.style.height = "78px";
                img.style.margin = "6px";
                img.style.borderRadius = "12px";
                img.style.cursor = "pointer";
                img.onclick = function () {
                    state.selectedTemplateUrl = url;
                    document.querySelectorAll(".gallery-template-thumb").forEach(i => i.style.border = "");
                    img.style.border = "3px solid #3461f6";
                    state.uploadedImage = new window.Image();
                    state.uploadedImage.onload = () => drawCanvas();
                    state.uploadedImage.src = url;
                };
                templateGallery.appendChild(img);
            });
        } catch(e) {
            templateGallery.innerHTML = '<div style="color: red;">Failed to load templates.</div>';
        }
    }

    // --- Canvas Drawing Logic ---
    const drawCanvas = () => {
        const dpr = state.devicePixelRatio;
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
            canvas.width = cssWidth * dpr;
            canvas.height = cssHeight * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        // Draw uploaded or selected template image
        if (state.uploadedImage) {
            if (canvasPlaceholder) canvasPlaceholder.style.display = "none";
            const imgAspectRatio = state.uploadedImage.width / state.uploadedImage.height;
            const canvasAspectRatio = cssWidth / cssHeight;
            let imgDrawWidth, imgDrawHeight, imgDrawX, imgDrawY;

            if (imgAspectRatio > canvasAspectRatio) {
                imgDrawWidth = cssWidth;
                imgDrawHeight = cssWidth / imgAspectRatio;
                imgDrawX = 0;
                imgDrawY = (cssHeight - imgDrawHeight) / 2;
            } else {
                imgDrawHeight = cssHeight;
                imgDrawWidth = cssHeight * imgAspectRatio;
                imgDrawY = 0;
                imgDrawX = (cssWidth - imgDrawWidth) / 2;
            }
            ctx.drawImage(state.uploadedImage, imgDrawX, imgDrawY, imgDrawWidth, imgDrawHeight);
        } else if (canvasPlaceholder) {
            canvasPlaceholder.style.display = "flex";
        }

        // Draw balls and placeholders
        state.balls.forEach((ball) => ball.draw());
        if (state.playerNamePlaceholder) state.playerNamePlaceholder.draw();
        if (state.dateTimePlaceholder) state.dateTimePlaceholder.draw();
    };

    // --- Player Name Placeholder ---
    const updatePlayerNamePlaceholder = () => {
        const text = playerNameInput.value || "Player Name";
        const fontSize = parseFloat(nameSizeSlider.value);
        if (!state.playerNamePlaceholder) {
            state.playerNamePlaceholder = new TextPlaceholder(
                canvas.clientWidth / 2,
                canvas.clientHeight * 0.85,
                text,
                fontSize,
                "player-name"
            );
        } else {
            state.playerNamePlaceholder.text = text;
            state.playerNamePlaceholder.fontSize = fontSize;
        }
        drawCanvas();
    };

    // --- Date/Time Placeholder ---
    const updateDateTimePlaceholder = () => {
        const now = new Date();
        const hour = now.getHours();
        let greeting = "Good Evening";
        if (hour < 12) {
            greeting = "Good Morning";
        } else if (hour < 18) {
            greeting = "Good Afternoon";
        }
        const dateString = now.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
        });
        const dateTimeText = `${greeting}\n${dateString}`;
        const fontSize = parseFloat(dateSizeSlider.value);
        if (!state.dateTimePlaceholder) {
            state.dateTimePlaceholder = new TextPlaceholder(
                canvas.clientWidth / 2,
                canvas.clientHeight * 0.15,
                dateTimeText,
                fontSize,
                "date-time"
            );
        } else {
            state.dateTimePlaceholder.text = dateTimeText;
            state.dateTimePlaceholder.fontSize = fontSize;
        }
        drawCanvas();
    };

    // --- Canvas Interaction Helpers ---
    const getPointerPos = (event) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = event.clientX !== undefined ? event.clientX : event.touches[0].clientX;
        const clientY = event.clientY !== undefined ? event.clientY : event.touches[0].clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleCanvasStart = (event) => {
        event.preventDefault();
        const pos = getPointerPos(event);
        const allElements = [
            state.dateTimePlaceholder,
            state.playerNamePlaceholder,
            ...state.balls
        ].filter(Boolean);

        state.selectedElement = allElements.find((el) => el.isPointInside(pos.x, pos.y));
        if (state.selectedElement) {
            state.isDragging = true;
            canvasContainer.style.cursor = "grabbing";
        }
    };

    const handleCanvasMove = (event) => {
        event.preventDefault();
        if (state.isDragging && state.selectedElement) {
            const pos = getPointerPos(event);
            state.selectedElement.x = pos.x;
            state.selectedElement.y = pos.y;
            drawCanvas();
        }
    };

    const handleCanvasEnd = () => {
        state.isDragging = false;
        state.selectedElement = null;
        canvasContainer.style.cursor = "grab";
    };

    // --- Image Upload Handler ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state.uploadedImage = img;
                drawCanvas();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // --- Ball Count/Size Logic ---
    const updateBallCount = (count) => {
        state.balls = [];
        const radius = parseFloat(ballSizeSlider.value);
        const startX = canvas.clientWidth / 2;
        const startY = canvas.clientHeight / 2;
        const totalWidth = (count - 1) * radius * 2.5;
        for (let i = 0; i < count; i++) {
            const ballX = startX - totalWidth / 2 + i * radius * 2.5;
            state.balls.push(new BingoBall(ballX, startY, radius));
        }
        drawCanvas();
    };

    // --- Reset Handler ---
    const handleReset = () => {
        log("Resetting canvas and form.");
        state.balls = [];
        state.uploadedImage = null;
        state.selectedTemplateUrl = null;
        document.getElementById("game-id-input").value = "";
        playerNameInput.value = "";
        mainActionBtn.disabled = false;
        mainActionBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Game';
        creationStep = "CREATEGAME";
        if (templateGallery) templateGallery.innerHTML = '';
        updatePlayerNamePlaceholder();
        updateDateTimePlaceholder();
        const initialBallButton = document.querySelector(".control-button[data-value='3']");
        if (initialBallButton) initialBallButton.click();
        else updateBallCount(5);
        drawCanvas();
    };

    // --- Main Action Button Handler ---
    mainActionBtn.addEventListener("click", async () => {
        mainActionBtn.disabled = true;
        const gid = document.getElementById("game-id-input").value;
        if (creationStep === "CREATEGAME") {
            log("Step 1: Create Game clicked.");
            mainActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            const maxp = document.getElementById("max-players-selector").querySelector(".control-button.active").dataset.value;
            const cards = document.getElementById("cards-per-user-selector").querySelector(".control-button.active").dataset.value;
            if (!gid || !gid.trim()) {
                alert("Please enter a unique Game ID.");
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Game';
                return;
            }
            try {
                const response = await fetch("https://holdznchill.onrender.com/create-game", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gid, maxp, cards, gstatus: "active" })
                });
                if (!response.ok) throw new Error((await response.json()).message);
                alert("Step 1 OK: Game created! Ready for Step 2.");
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Template';
                creationStep = "UPLOADTEMPLATE";
                loadTemplates(); // Load the gallery after game created!
            } catch (error) {
                alert("Game creation failed: " + error.message);
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Game';
            }
        } else if (creationStep === "UPLOADTEMPLATE") {
            log("Step 2: Upload Template clicked.");
            mainActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            if (!state.selectedTemplateUrl) {
                alert("Please select a template from the gallery below!");
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Template';
                return;
            }
            const templateData = {
                backgroundImage: state.selectedTemplateUrl,
                balls: state.balls.map(b => ({ x: b.x / canvas.clientWidth, y: b.y / canvas.clientHeight, radius: b.radius })),
                playerNamePlaceholder: {
                    x: state.playerNamePlaceholder.x / canvas.clientWidth,
                    y: state.playerNamePlaceholder.y / canvas.clientHeight,
                    fontSize: state.playerNamePlaceholder.fontSize
                },
                dateTimePlaceholder: {
                    x: state.dateTimePlaceholder.x / canvas.clientWidth,
                    y: state.dateTimePlaceholder.y / canvas.clientHeight,
                    fontSize: state.dateTimePlaceholder.fontSize
                }
            };
            // Debugging: Alert-based network trace
            alert("About to send template to backend...");
            fetch("https://holdznchill.onrender.com/upload-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gid, templateData })
            })
            .then(response => {
                alert("Status: " + response.status);
                return response.json();
            })
            .then(data => {
                alert("Backend response: " + JSON.stringify(data));
                mainActionBtn.innerHTML = '<i class="fas fa-check"></i> Game Active!';
                creationStep = "COMPLETE";
            })
            .catch(err => {
                alert("Error: " + err.message);
                mainActionBtn.disabled = false;
                mainActionBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Template';
            });
        }
    });

    // --- Event Listeners ---
    resetButton.addEventListener("click", handleReset);
    uploadButton.addEventListener("click", () => imageUploadInput.click());
    imageUploadInput.addEventListener("change", handleImageUpload);
    playerNameInput.addEventListener("input", updatePlayerNamePlaceholder);
    nameSizeSlider.addEventListener("input", updatePlayerNamePlaceholder);
    dateSizeSlider.addEventListener("input", updateDateTimePlaceholder);
    ballSizeSlider.addEventListener("input", (e) => {
        const newRadius = parseFloat(e.target.value);
        state.balls.forEach(ball => ball.radius = newRadius);
        drawCanvas();
    });

    // Segmented Controls
    document.querySelectorAll(".segmented-control").forEach((container) => {
        container.addEventListener("click", (e) => {
            const button = e.target.closest(".control-button");
            if (!button) return;
            container.querySelectorAll(".control-button").forEach(btn => {
                btn.classList.remove("active");
                btn.setAttribute("aria-checked", "false");
            });
            button.classList.add("active");
            button.setAttribute("aria-checked", "true");
            if (container.id === "ball-count-selector") updateBallCount(parseInt(button.dataset.value));
            drawCanvas();
        });
    });

    canvas.addEventListener("mousedown", handleCanvasStart);
    canvas.addEventListener("mousemove", handleCanvasMove);
    canvas.addEventListener("mouseup", handleCanvasEnd);
    canvas.addEventListener("mouseleave", handleCanvasEnd);
    canvas.addEventListener("touchstart", handleCanvasStart, { passive: false });
    canvas.addEventListener("touchmove", handleCanvasMove, { passive: false });
    canvas.addEventListener("touchend", handleCanvasEnd);
    window.addEventListener("resize", drawCanvas);

    drawCanvas();
    updatePlayerNamePlaceholder();
    updateDateTimePlaceholder();

    // Initialize with default ball count
    const initialBallButton = document.querySelector(".control-button[data-value='3']");
    if (initialBallButton) initialBallButton.click();
    else updateBallCount(5);
});
