const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const poemContainer = document.getElementById('poem-container');
const bgm = document.getElementById('bgm');

let width, height;
let particles = [];
let fireworks = [];
let sparks = [];
let stars = [];
let meteors = [];
let scrollingMessages = [];
let currentPhase = 0; // 0: Idle, 1: Poem, 2: Question, 3: Countdown, 4: 2026
let countdownValue = 10;
let textScale = 1;

// Configuration
const POEM_LINE_DELAY = 1500; // ms between lines
const TOTAL_POEM_TIME = 15000; // Total time to read before switching
const TEXT_COLOR = '#ffcc00'; // Gold
const PARTICLE_DENSITY = 4; // Lower is more dense

const BLESSINGS = [
    "一切都是新的开始",
    "我想和你说新年好，说许多年",
    "璀璨的烟火中, 愿你感受新年的美好, 快乐常伴",
    "愿你眼里有光, 心中有爱",
    "愿你历经风雨, 仍觉世间美好",
    "往事随风, 新岁待你笑靥如花",
    "愿你相信时光的笔, 美好回忆永相伴",
    "时光流转, 每一刻都是宝藏",
    "要陪在值得的人身边一年又一年，十年又十年",
    "新年愿望：大吉大利，有钱有你",
    "新年快乐，打开前置，看到了吗，我爱的你",
    "给你一整首情书，关于你温暖名字",
    "辞旧迎新，爱之所爱"
];

// Resize handling
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    // Recalculate text scale based on width
    textScale = Math.min(width / 800, 1);
    
    // Re-init scrolling messages to fit new height
    if (currentPhase === 4) {
        initScrollingMessages();
    }
}
window.addEventListener('resize', resize);
resize();

// --- Classes ---

class ScrollingTrack {
    constructor(y, speed) {
        this.y = y;
        this.speed = speed;
        this.messages = []; // Array of {x, text, width}
        
        // Initial population
        this.addMessage(width + Math.random() * 200);
    }

    addMessage(x) {
        // Pick random text for THIS message
        // Ensure it's different from the last one in this track if possible
        let text;
        const lastMsg = this.messages[this.messages.length - 1];
        let attempts = 0;
        
        do {
            text = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
            attempts++;
        } while (lastMsg && text === lastMsg.text && attempts < 5);
        
        // Measure
        ctx.save();
        ctx.font = `bold ${32 * textScale}px "Ma Shan Zheng", cursive`; // Increased font size to 32
        const textWidth = ctx.measureText(text).width;
        ctx.restore();
        
        this.messages.push({ x: x, text: text, width: textWidth });
    }

    update() {
        // Move all messages
        this.messages.forEach(msg => {
            msg.x -= this.speed;
        });

        // Remove off-screen messages (left side)
        if (this.messages.length > 0 && this.messages[0].x < -this.messages[0].width - 100) {
            this.messages.shift();
        }

        // Add new message if gap is sufficient
        const lastMsg = this.messages[this.messages.length - 1];
        if (lastMsg) {
            const tailX = lastMsg.x + lastMsg.width + 60; // 60 for heart + spacing
            if (tailX + 150 < width) {
                this.addMessage(width);
            }
        } else {
            this.addMessage(width);
        }
    }

    draw() {
        this.messages.forEach(msg => {
            ctx.save();
            ctx.font = `bold ${32 * textScale}px "Ma Shan Zheng", cursive`; // Ensure font is set for drawing
            
            // 1. Draw Thicker Stroke (Black Outline) for max visibility
            ctx.lineWidth = 6; // Thicker stroke
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineJoin = 'round';
            ctx.strokeText(msg.text, msg.x, this.y);
            
            // 2. Draw Text (Bright Cyan/White mix)
            ctx.fillStyle = "#E0FFFF"; // Light Cyan
            ctx.shadowColor = "#00FFFF"; // Cyan Glow
            ctx.shadowBlur = 10; 
            ctx.fillText(msg.text, msg.x, this.y);
            
            // 3. Draw Heart (Red)
            const heartX = msg.x + msg.width + 15;
            // Stroke for heart
            ctx.strokeText("❤", heartX, this.y); 
            // Fill for heart
            ctx.fillStyle = "#ff3366";
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 15;
            ctx.fillText("❤", heartX, this.y);
            
            ctx.restore();
        });
    }
}


class Meteor {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width + width; // Start off-screen right
        this.y = Math.random() * height * 0.5; // Top half
        this.len = Math.random() * 80 + 20;
        this.speed = Math.random() * 10 + 5;
        this.size = Math.random() * 2 + 0.5;
        this.angle = Math.PI / 4; // 45 degrees
    }

    update() {
        this.x -= this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);

        if (this.x < -100 || this.y > height + 100) {
            this.reset();
            // Randomly delay reappearance by placing it far away
            this.x += Math.random() * 2000; 
        }
    }

    draw() {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = this.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.len * Math.cos(this.angle), this.y - this.len * Math.sin(this.angle));
        ctx.stroke();
        ctx.restore();
    }
}


class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5;
        this.opacity = Math.random();
        this.speed = Math.random() * 0.05;
    }
    update() {
        this.opacity += (Math.random() - 0.5) * 0.1;
        if (this.opacity < 0) this.opacity = 0;
        if (this.opacity > 1) this.opacity = 1;
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.tx = x; // Target X
        this.ty = y; // Target Y
        this.vx = 0;
        this.vy = 0;
        this.color = `hsl(${Math.random() * 60 + 30}, 100%, 70%)`; // Gold/Warm hues
        this.friction = 0.92;
        this.ease = 0.05;
    }

    update() {
        // Move towards target
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        
        this.x += dx * this.ease;
        this.y += dy * this.ease;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 2, 2);
    }
}

class Firework {
    constructor() {
        this.x = Math.random() * width;
        this.y = height;
        this.ty = Math.random() * (height / 2);
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = -(Math.random() * 8 + 12); // Higher initial velocity
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.done = false;
        this.history = [];
    }

    update() {
        this.history.push({x: this.x, y: this.y});
        if(this.history.length > 5) this.history.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.25; // Stronger Gravity

        // If reached peak or starts falling or reached target height
        if (this.vy >= 0 || this.y <= this.ty) {
            this.explode();
            this.done = true;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        if(this.history.length > 0) {
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for(let i=1; i<this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }
    }

    explode() {
        const particleCount = 100 + Math.random() * 100;
        const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
        for (let i = 0; i < particleCount; i++) {
            sparks.push(new Spark(this.x, this.y, color));
        }
    }
}

class Spark {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2; // Faster explosion
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        // Vary color slightly
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.01;
        this.history = [];
        this.friction = 0.96;
        this.gravity = 0.15;
    }

    update() {
        this.history.push({x: this.x, y: this.y});
        if(this.history.length > 6) this.history.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; 
        this.vx *= this.friction; 
        this.vy *= this.friction;
        this.alpha -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail for sparks
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if(this.history.length > 0) {
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for(let i=1; i<this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// --- Logic ---

function initStars() {
    for (let i = 0; i < 200; i++) {
        stars.push(new Star());
    }
    // Init Meteors
    for (let i = 0; i < 15; i++) { // Increased from 4 to 15
        meteors.push(new Meteor());
    }
}

// Text to Particles
function createTextParticles(text, fontSize = 60) {
    // 1. Setup offscreen canvas
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = width;
    offCanvas.height = height;

    // 2. Draw text
    offCtx.fillStyle = 'white';
    offCtx.font = `bold ${fontSize * textScale}px "Ma Shan Zheng", cursive`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    
    // Handle multi-line text (split by \n)
    const lines = text.split('\n');
    const lineHeight = fontSize * textScale * 1.5;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, i) => {
        offCtx.fillText(line, width / 2, startY + i * lineHeight);
    });

    // 3. Scan pixels
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    
    const newTargets = [];

    // Skip steps for performance
    for (let y = 0; y < height; y += PARTICLE_DENSITY) {
        for (let x = 0; x < width; x += PARTICLE_DENSITY) {
            const index = (y * width + x) * 4;
            if (data[index + 3] > 128) { // If pixel is opaque
                newTargets.push({ x, y });
            }
        }
    }

    // 4. Map to existing particles or create new ones
    // Strategy: Reuse existing particles, create new if needed, hide excess
    
    // If we need more particles
    if (newTargets.length > particles.length) {
        const numToAdd = newTargets.length - particles.length;
        for (let i = 0; i < numToAdd; i++) {
            particles.push(new Particle(width/2, height/2)); // Start from center
        }
    }
    
    // Update targets
    // First, scatter them slightly? No, just move to target for the "assemble" effect.
    // To get the "disappear to aggregate" effect:
    // We could randomize current x,y first? 
    // Let's just update targets. The movement from previous shape to new shape 
    // IS the aggregation.
    
    for (let i = 0; i < particles.length; i++) {
        if (i < newTargets.length) {
            particles[i].tx = newTargets[i].x;
            particles[i].ty = newTargets[i].y;
            // Add a little randomness to speed for organic feel
            particles[i].ease = 0.03 + Math.random() * 0.05;
        } else {
            // Excess particles: send off screen or hide
            particles[i].tx = Math.random() * width;
            particles[i].ty = Math.random() * height * 2; // Below screen
        }
    }
}

// --- Timeline ---

function startPoem() {
    currentPhase = 1;
    startScreen.style.opacity = 0;
    setTimeout(() => { startScreen.style.display = 'none'; }, 1000);
    poemContainer.classList.remove('hidden');
    
    const lines = document.querySelectorAll('.poem-line');
    lines.forEach((line, index) => {
        setTimeout(() => {
            line.classList.add('fade-in-up');
        }, index * POEM_LINE_DELAY);
    });

    // Schedule next phase
    setTimeout(startQuestionPhase, TOTAL_POEM_TIME);
}

function startQuestionPhase() {
    currentPhase = 2;
    // Fade out poem
    poemContainer.classList.add('fade-out');
    setTimeout(() => { poemContainer.style.display = 'none'; }, 1000);

    // Init text particles
    createTextParticles("亲爱的\n让我们一起迎接新的一年吧", 60);

    // Schedule Countdown
    setTimeout(startCountdown, 6000);
}

function startCountdown() {
    currentPhase = 3;
    let count = 10;
    
    // Initial number
    createTextParticles(count.toString(), 300); // Increased size from 150 to 300

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            createTextParticles(count.toString(), 300); // Increased size from 150 to 300
        } else {
            clearInterval(interval);
            startSpherePhase();
        }
    }, 1000);
}

function startSpherePhase() {
    // Phase 3.5: Sphere
    // Don't change currentPhase yet, or maybe introduce a new one?
    // Let's keep it drawing particles.
    
    // Create sphere targets
    const radius = Math.min(width, height) * 0.3;
    const newTargets = [];
    const sphereParticleCount = 800; // Enough to look dense
    
    for (let i = 0; i < sphereParticleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / sphereParticleCount);
        const theta = Math.sqrt(sphereParticleCount * Math.PI) * phi;
        
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        // z = radius * Math.cos(phi); // Just for 3D feel if we wanted rotation
        
        newTargets.push({
            x: width / 2 + x,
            y: height / 2 + y
        });
    }

    // Assign to particles
    if (newTargets.length > particles.length) {
        const numToAdd = newTargets.length - particles.length;
        for (let i = 0; i < numToAdd; i++) {
            particles.push(new Particle(width/2, height/2));
        }
    }

    for (let i = 0; i < particles.length; i++) {
        if (i < newTargets.length) {
            particles[i].tx = newTargets[i].x;
            particles[i].ty = newTargets[i].y;
            particles[i].ease = 0.05; // Smooth transition
        } else {
            // Hide excess
            particles[i].tx = width / 2;
            particles[i].ty = height / 2;
        }
    }

    // Hold sphere for 3 seconds, then explode to text
    setTimeout(startCelebration, 3000);
}

function initScrollingMessages() {
    scrollingMessages = [];
    const centerY = height / 2;
    // Safe zone around center
    const safeZone = 220 * textScale; 
    
    // Calculate available tracks based on font size + padding
    const fontSize = 32 * textScale; // Updated font size
    const trackHeight = fontSize * 1.8; // 1.8 line height for ample spacing
    
    const validY = [];

    // Top Tracks
    // From y=50 to centerY-safeZone
    let currentY = 80;
    while (currentY < centerY - safeZone) {
        validY.push(currentY);
        currentY += trackHeight;
    }

    // Bottom Tracks
    // From centerY+safeZone to height-50
    currentY = centerY + safeZone + 50;
    while (currentY < height - 50) {
        validY.push(currentY);
        currentY += trackHeight;
    }

    // Create messages for each track
    validY.forEach(y => {
        const speed = 0.8 + Math.random() * 1.0;
        scrollingMessages.push(new ScrollingTrack(y, speed));
    });
}

function startCelebration() {
    currentPhase = 4;
    createTextParticles("你好 2026", 120);
    initScrollingMessages();
}

// --- Animation Loop ---

function animate() {
    requestAnimationFrame(animate);

    // Clear canvas
    // For fireworks, we want trails, but for text assembly we want clean.
    // Compromise: Full clear, but Sparks draw with their own alpha/trails logic.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Slight trail for everything
    ctx.fillRect(0, 0, width, height);

    // Draw Stars (Background)
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Draw Meteors
    meteors.forEach(meteor => {
        meteor.update();
        meteor.draw();
    });

    // Draw Text Particles (Phases 2, 3, 4)
    if (currentPhase >= 2) {
        particles.forEach(p => {
            p.update();
            p.draw();
        });
    }
    
    // Draw Scrolling Text (Phase 4)
    if (currentPhase === 4) {
        ctx.save();
        ctx.font = `bold ${28 * textScale}px "Ma Shan Zheng", cursive`; // Increased font size
        ctx.fillStyle = "rgba(135, 206, 235, 1)"; // Fully opaque for clarity
        ctx.shadowColor = "rgba(0, 255, 255, 0.5)"; // Reduced blur spread for sharpness
        ctx.shadowBlur = 4;
        
        scrollingMessages.forEach(msg => {
            msg.update();
            msg.draw();
        });
        
        ctx.restore();
    }

    // Draw Fireworks (Phase 4)
    if (currentPhase === 4) {
        // Randomly launch fireworks
        if (Math.random() < 0.08) { // Increased chance
            fireworks.push(new Firework());
        }

        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update();
            fireworks[i].draw();
            if (fireworks[i].done) {
                fireworks.splice(i, 1);
            }
        }

        for (let i = sparks.length - 1; i >= 0; i--) {
            sparks[i].update();
            sparks[i].draw();
            if (sparks[i].alpha <= 0) {
                sparks.splice(i, 1);
            }
        }
    }
}

// --- Interactions ---

startBtn.addEventListener('click', () => {
    // Play Audio
    bgm.play().catch(e => console.log("Audio play failed (interaction required)", e));
    
    // Init Visuals
    initStars();
    animate();
    
    // Start Sequence
    startPoem();
});
