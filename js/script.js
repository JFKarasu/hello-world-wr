const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const poemContainer = document.getElementById('poem-container');
const todoContainer = document.getElementById('todo-container');
const todoCenterText = document.getElementById('todo-center-text');
const skipBtn = document.getElementById('skip-btn');
const bgm = document.getElementById('bgm');
const fireworksBgm = document.getElementById('fireworks-bgm');

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

// --- Constellation Data ---
// Coordinates are relative (0-1) to screen width/height
const ARIES = {
    name: "Aries",
    stars: [
        {x: 0.15, y: 0.60}, // Left Bottom
        {x: 0.25, y: 0.50}, // Middle
        {x: 0.35, y: 0.40}, // Top Right
        {x: 0.38, y: 0.43}  // Hook Tip
    ],
    lines: [[0, 1], [1, 2], [2, 3]]
};

const CANCER = {
    name: "Cancer",
    stars: [
        {x: 0.68, y: 0.48}, // Left
        {x: 0.75, y: 0.45}, // Junction
        {x: 0.82, y: 0.55}, // Right
        {x: 0.73, y: 0.35}  // Top
    ],
    lines: [[0, 1], [1, 2], [1, 3]]
};

// --- Countdown Logic ---
// 目标时间：2026年除夕（2026年2月16日）的24点，即2026年2月17日0点
// 注意：JavaScript中月份是从0开始的，所以2月是1
const TARGET_DATE = new Date(2026, 1, 17, 0, 0, 0).getTime();
const SPHERE_TARGET_DATE = TARGET_DATE - 17000; // 17 seconds before target to allow for 4s text + 2.5s transition + 10s final countdown

function updateCountdown() {
    const currentTime = new Date().getTime();
    const distance = TARGET_DATE - currentTime;
    
    // Auto-Jump Check (Global)
    // If within 15 seconds of target (and not already in countdown sequence)
    // We force jump to ensure the final countdown happens.
    // 15000ms is exactly enough for 4s text + 10s countdown + 1s buffer.
    // We check a small window to trigger it once.
    // User requested: Only jump if in Wish Sphere phase (1.5)
    if (distance <= 15000 && distance > 14000 && currentPhase === 1.5) {
        forceJumpToCountdown();
    }

    if (currentPhase !== 0) return; // Stop updating DOM if not in idle phase
    
    const countdownContainer = document.getElementById('countdown-container');
    const startBtn = document.getElementById('start-btn');
    const timerElement = document.getElementById('countdown-timer');

    // 10 minutes in milliseconds
    const TEN_MINUTES = 10 * 60 * 1000;
    
    // We want the countdown to reach 0 when the button appears (10 mins before target).
    // So we display the time remaining until (TARGET_DATE - 10 minutes).
    // This removes the "extra 10 minutes" from the display.
    const timeUntilStart = distance - TEN_MINUTES;

    // Show button if time is within 10 minutes or already passed
    if (distance < TEN_MINUTES) {
        countdownContainer.style.display = 'none';
        startBtn.classList.remove('hidden');
    } else {
        countdownContainer.style.display = 'block';
        startBtn.classList.add('hidden');
        
        // Calculate based on timeUntilStart instead of distance
        const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilStart % (1000 * 60)) / 1000);
        
        timerElement.innerText = `${days.toString().padStart(2, '0')}天 ${hours.toString().padStart(2, '0')}时 ${minutes.toString().padStart(2, '0')}分 ${seconds.toString().padStart(2, '0')}秒`;
    }
}

// Update countdown every second
setInterval(updateCountdown, 1000);
updateCountdown(); // Initial call

// Configuration
const POEM_LINE_DELAY = 1500; // ms between lines
const TOTAL_POEM_TIME = 15000; // Total time to read before switching
const TEXT_COLOR = '#ffcc00'; // Gold
const PARTICLE_DENSITY = 4; // Lower is more dense

const BLESSINGS = [
    "一切都是新的开始",
    "我想和你说新年好，说许多年",
    "陪你走过每一个春夏秋冬",
    "愿你永远像小仙女一样，美丽又可爱！",
    "璀璨的烟火中, 愿你感受新年的美好, 快乐常伴",
    "你是我平淡生活里，最温柔的意外",
    "愿你眼里有光, 心中有爱",
    "愿你历经风雨, 仍觉世间美好",
    "往事随风, 新岁待你笑靥如花",
    "愿你相信时光的笔, 美好回忆永相伴",
    "时光流转, 每一刻都是宝藏",
    "不用迎合别人，做自己就好",
    "要陪在值得的人身边一年又一年，十年又十年",
    "你的成长，无需别人定义，自己认可就好",
    "每一次心跳，都是对你的思念",
    "新年愿望：大吉大利，有钱有你",
    "与你相遇，是最美好的安排",
    "新年快乐，打开前置，看到了吗，我爱的你",
    "给你一整首情书，关于你温暖名字",
    "你笑起来，我的世界就亮了",
    "希望你的梦想，都能被温柔以待",
    "愿你每天醒来，都有阳光和我的爱",
    "每一颗星星都在诉说着我对你的思念",
    "不求朝朝暮暮，只愿岁岁年年",
    "你是我生命中最美的星辰",
    "辞旧迎新，爱之所爱",
    "待你，胜过世间所有温柔",
    "星河滚烫，你是我的人间理想",
    "共赏星河，共赴烟火，不负韶华",
    "愿你被世界温柔以待，慢慢走，我一直都在",
    "风会吹走烦恼，光会照亮前路，你只管好好爱自己",
    "不用逼自己坚强，偶尔脆弱也没关系，我陪着你",
    "愿你眼里的光，永远清澈明亮，不被阴霾遮挡",
    "做我的小太阳，温暖且明亮",
    "远离烦恼，被美好与幸福环绕",
    "偏爱是你，欢喜也是你",
    "所走皆坦途，所遇皆温暖",
    "生活偶尔有风雨，但总会有彩虹，我陪你等天晴",
    "不用急着往前走，停一停也很好，我会守在你身边",
    "你值得所有的美好，慢慢来，一切都会好起来的",
    "不管世界如何，我都会站在你这边",
    "愿你的世界永远有光，永远有温暖的陪伴",
    "每一次坚持，都是向美好靠近，你真的很棒",
    "愿你有勇气面对黑暗，更有能力拥抱光明",
    "偶尔摆烂也没关系，好好休息，才能更好前行",
    "不用追求完美，平凡的日常也藏着很多美好",
    "做自己喜欢的事，见自己喜欢的人，快乐就好",
    "愿风带走你的不开心，愿你每天都轻松一点",
    "愿我的女孩，岁岁年年，平安喜乐，万事胜意",
    "世间万般美好，都不及你眉眼一笑，愿你永远开心自在",
    "你的开心，是我最大的心愿",
    "超喜欢你",
    "想把你揉进身体里面",
    "想要的都拥有，得不到的都释怀",
    "偏爱与温柔，只予你一人",
    "所有努力，皆有回报",
    "马年大吉，愿你 “马” 上有钱，“马” 上有我",
    "你的 2026 “马” 甲，由我来守护",
    "愿我们并驾齐驱，共赴下一场山海",
    "愿生活对你温柔，日子如野马脱缰般自由",
    "新的一年，我的愿望清单第一条是你",
    "新年快乐，这是只属于你的私人祝福",
    "烟火再美，都不及你此刻的笑容",
    "新的一年，依然坚定地走向你",
    "你是我的岁岁平安，也是我的年年有余",
    "无论白驹过隙，我都陪你岁岁年年",
    "2026，愿好运马不停蹄地奔向你",
    "想和你一起看烟花，从今年看到明年",
    "永远有糖吃，永远有人疼",
    "心之所向，皆是你",
    "心动是你，心安也是你",
    "愿你被温柔包围，所有的不开心都烟消云散",
    "每一步前行，都值得被肯定，你真的很努力",
    "愿你放下疲惫，好好休息，一切都会慢慢变好",
    "好好爱自己，比什么都重要",

    
];

// Shared pool for non-repeating random selection
let blessingPool = [];

function getNextBlessing() {
    if (blessingPool.length === 0) {
        // Refill and shuffle
        blessingPool = [...BLESSINGS];
        // Fisher-Yates shuffle
        for (let i = blessingPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [blessingPool[i], blessingPool[j]] = [blessingPool[j], blessingPool[i]];
        }
    }
    return blessingPool.pop();
}

const TODO_ITEMS = [
    "一起露营", "一起看日出", "一起堆雪人", "一起拼乐高", "一起放烟花", "一起做早餐", "一起打羽毛球", "一起吹晚风", "一起去鬼屋", "一起种盆栽",
    "一起滑雪", "一起压马路", "一起养小猫", "一起喂小狗", "一起旅行", "一起做午餐", "一起相拥而眠", "一起手牵手", "一起看樱花", "一起刷碗",
    "一起看电影", "一起等日落", "一起逛公园", "一起吃火锅", "一起逛超市", "一起做晚餐", "一起做手工", "一起跨年", "一起去动物园", "一起拍情侣照",
    "一起骑单车", "一起爬山", "一起听雨声", "一起等日落", "一起散步", "一起吃夜宵", "一起唱歌", "一起看球赛", "一起去海底世界", "一起溜冰",
    "一起踩沙滩", "一起赖被窝", "一起唠家常", "一起煮热汤", "一起捡贝壳", "一起旅游", "一起做爱做的事", "一起去寺庙祈福", "一起摘水果", "一起穿情侣服",
    "一起坐公交", "一起伸懒腰", "一起喝奶茶", "一起写信", "一起看星星", "一起打伞", "一起发疯", "一起抓娃娃", "一起钓鱼", "一起晨跑",
    "一起拆盲盒", "一起做蛋糕", "一起听老歌", "一起逛书店", "一起打游戏", "一起弹钢琴", "一起去游乐园", "一起看恐怖片", "一起挖雨花石", "一起回忆过去",
    "一起挖沙子", "一起窜巷子", "一起跑步", "一起踩水坑", "一起坐船", "一起晒太阳", "一起捡落叶", "一起幻想", "一起练瑜伽", "一起玩狼人杀",
    "一起坐飞机", "一起逛夜市", "一起吐槽", "一起烤肉", "一起走下去", "一起玩剧本杀", "一起吐泡泡", "一起小溪里摸鱼", "一起吹蒲公英", "一起喂鸽子",
    "一起看云朵", "一起闻花香", "一起哭", "一起闹", "一起许愿", "一起过生日", "一起抱抱", "一起蹭头", "一起比心"
];

// Resize handling
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    // Recalculate text scale based on width AND height (for landscape mobile)
    // Base width 800, Base height 600 (approx)
    textScale = Math.min(width / 800, height / 600, 1);
    
    // Reset stars on resize to cover new area
    stars.forEach(star => star.reset());

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
        // Get unique message from pool
        let text = getNextBlessing();
        
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
            // Check hover status via global variable
            if (!msg.isHovered) {
                msg.x -= this.speed;
            }
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
            const heartY = this.y;
            
            // Save heart rect for interaction
            // Approximate height for hit detection: 32px
            msg.heartRect = {
                x: heartX,
                y: heartY - 24 * textScale, // approximate top
                w: 30 * textScale,
                h: 30 * textScale
            };
            
            // Save text rect for hover
            msg.rect = {
                x: msg.x,
                y: this.y - 32 * textScale,
                w: msg.width + 50 * textScale, // include heart area
                h: 40 * textScale
            };

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
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Smaller, more realistic stars
        this.size = Math.random() * 1.2 + 0.1; 
        this.opacity = Math.random() * 0.8 + 0.2;
        // Different twinkle speeds
        this.twinkleSpeed = (Math.random() - 0.5) * 0.02;
    }

    update() {
        this.opacity += this.twinkleSpeed;
        if (this.opacity < 0.2 || this.opacity > 1) {
            this.twinkleSpeed = -this.twinkleSpeed;
        }
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
    // Increase star count for better density
    for (let i = 0; i < 400; i++) {
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
    setTimeout(startTodoPhase, TOTAL_POEM_TIME);
}

// Global state for Todo Phase
let todoItems = []; // Array of { element, x, y, vx, vy, isDragged, isAbsorbed }
let sphereRadius = 0;
let sphereCenter = { x: 0, y: 0 };
let absorbedCount = 0;
let totalTodoItems = 0;
let isSphereActive = false;
let showingInterval;

let isExploding = false;

function startTodoPhase() {
    currentPhase = 1.5;
    todoItems = [];
    sphereRadius = 0;
    absorbedCount = 0;
    isSphereActive = false;
    
    // Check if we should show skip button
    const now = new Date().getTime();
    if (now > SPHERE_TARGET_DATE) {
        skipBtn.classList.remove('hidden');
    } else {
        skipBtn.classList.add('hidden');
        // Check periodically
        const checkSkipInterval = setInterval(() => {
            if (currentPhase !== 1.5) {
                clearInterval(checkSkipInterval);
                return;
            }
            if (new Date().getTime() > SPHERE_TARGET_DATE) {
                skipBtn.classList.remove('hidden');
                clearInterval(checkSkipInterval);
            }
        }, 1000);
    }
    
    // Fade out poem
    poemContainer.classList.add('fade-out');
    setTimeout(() => { poemContainer.style.display = 'none'; }, 1000);

    // Show Todo Container
    todoContainer.classList.remove('hidden');
    todoContainer.style.opacity = 1;

    const centerText = "我想和你做很多事……";
    let charIndex = 0;
    todoCenterText.innerHTML = "";

    function typeWriter() {
        if (charIndex < centerText.length) {
            todoCenterText.innerHTML += centerText.charAt(charIndex);
            charIndex++;
            setTimeout(typeWriter, 200);
        } else {
            startShowingTodoItems();
        }
    }
    typeWriter();
    
    // Init sphere center
    sphereCenter = { x: width / 2, y: height / 2 };
    
    // Start animation loop for todo items
    requestAnimationFrame(updateTodoItems);
}

function startShowingTodoItems() {
    let itemIndex = 0;
    // Create random order
    const shuffledItems = [...TODO_ITEMS].sort(() => Math.random() - 0.5);
    totalTodoItems = shuffledItems.length;
    
    showingInterval = setInterval(() => {
        if (itemIndex >= shuffledItems.length) {
            clearInterval(showingInterval);
            // Don't auto-end phase, wait for interaction
            return;
        }
        createTodoItem(shuffledItems[itemIndex]);
        itemIndex++;
    }, 150);
}

function createTodoItem(text) {
    const div = document.createElement('div');
    div.classList.add('todo-item');
    div.innerText = text;
    
    // Random font size
    const size = 0.8 + Math.random() * 1.0; 
    div.style.fontSize = `${size}rem`;

    // Estimate size
    const fontSizePx = size * 16; 
    const itemWidth = text.length * fontSizePx * 1.1; 
    const itemHeight = fontSizePx * 1.5;

    // Center Exclusion Zone
    const centerW = 12 * 3 * 16 * 1.2; 
    const centerH = 3 * 16 * 2; 
    
    const centerRect = {
        x: sphereCenter.x - centerW / 2,
        y: sphereCenter.y - centerH / 2,
        w: centerW,
        h: centerH
    };

    let x, y;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 100) {
        x = Math.random() * (width - itemWidth); 
        y = Math.random() * (height - itemHeight); 
        
        const currentRect = { x: x, y: y, w: itemWidth, h: itemHeight };

        // 1. Check center collision (only if sphere not active yet)
        if (!isSphereActive && checkCollision(currentRect, centerRect)) {
            valid = false;
            attempts++;
            continue;
        }

        // 2. Check other items collision
        // (Simplified: allow slight overlap for density, or strict?)
        // Let's allow overlap for now to fit all items
        valid = true; 
        attempts++;
    }

    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    todoContainer.appendChild(div);
    
    // Create item object
    const item = {
        element: div,
        x: x,
        y: y,
        w: itemWidth,
        h: itemHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        isDragged: false,
        isAbsorbed: false,
        text: text
    };
    
    todoItems.push(item);
    
    // Add Drag Events
    addDragEvents(item);
}

skipBtn.addEventListener('click', skipTodoPhase);

function skipTodoPhase() {
    if (currentPhase !== 1.5) return;
    
    // Stop adding new items
    if (showingInterval) clearInterval(showingInterval);
    
    // Create remaining items that haven't been shown yet? 
    // The user said "add all labels to sphere". 
    // If they are not created yet, we should probably just create and absorb them?
    // Or just absorb existing ones?
    // "把所有标签添加到球里去" implies all of them.
    // If we haven't finished showing them, we should probably just finish the list?
    // But for simplicity and performance, let's just absorb what is on screen + ensure sphere is created.
    
    // Actually, createSphere checks items.
    // Let's first ensure sphere exists.
    if (!isSphereActive) {
        // Find at least one item to start sphere
        if (todoItems.length > 0) {
            createSphere([todoItems[0]]);
        } else {
             // Edge case: no items yet? Should not happen if waited a bit.
             // If really no items, we force create one?
        }
    }
    
    // Now absorb all unabsorbed items
    // We need to clone the array because absorbItem modifies state, but safe to iterate.
    const unabsorbed = todoItems.filter(i => !i.isAbsorbed);
    unabsorbed.forEach(item => {
        // Force absorb without animation delay if possible?
        // Just call absorbItem
        absorbItem(item);
    });
    
    // If there were items not yet created (shuffledItems), should we care?
    // Maybe just proceed.
    
    // Hide button
    skipBtn.classList.add('hidden');
    
    // The absorbItem loop will trigger startSphereCountdown when absorbedCount >= totalTodoItems
    // BUT totalTodoItems was set to shuffledItems.length.
    // If we stopped early, absorbedCount will never reach totalTodoItems!
    // We must update totalTodoItems to current length.
    totalTodoItems = todoItems.length;
    
    // Now check completion manually in case we are already done
    if (absorbedCount >= totalTodoItems) {
        startSphereCountdown();
    }
}

function addDragEvents(item) {
    const el = item.element;
    let startX, startY;
    
    const onMouseDown = (e) => {
        if (item.isAbsorbed) return;
        item.isDragged = true;
        startX = e.clientX - item.x;
        startY = e.clientY - item.y;
        el.style.zIndex = 1000;
        el.style.cursor = 'grabbing';
    };
    
    const onMouseMove = (eOrTouch) => {
        if (!item.isDragged) return;
        // Check if preventDefault exists (it does on MouseEvent, not on Touch object)
        if (eOrTouch.preventDefault) eOrTouch.preventDefault(); 
        
        // Handle both MouseEvent and Touch object (which has clientX directly)
        const clientX = eOrTouch.clientX;
        const clientY = eOrTouch.clientY;
        
        item.x = clientX - startX;
        item.y = clientY - startY;
        el.style.left = `${item.x}px`;
        el.style.top = `${item.y}px`;
        
        checkDragCollision(item);
    };
    
    const onMouseUp = () => {
        if (!item.isDragged) return;
        item.isDragged = false;
        el.style.zIndex = '';
        el.style.cursor = 'grab';
    };
    
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Touch support
    el.addEventListener('touchstart', (e) => {
        if (item.isAbsorbed) return;
        // e.preventDefault(); // Don't prevent default here to allow click? But we need to prevent scroll
        // Actually style.css has touch-action: none, so scroll is prevented.
        const touch = e.touches[0];
        onMouseDown(touch);
    }, {passive: false});
    
    window.addEventListener('touchmove', (e) => {
        if (!item.isDragged) return;
        e.preventDefault(); // Prevent scroll explicitly
        const touch = e.touches[0];
        onMouseMove(touch);
    }, {passive: false});
    window.addEventListener('touchend', onMouseUp);
}

function checkDragCollision(draggedItem) {
    // Check against other items
    for (let other of todoItems) {
        if (other === draggedItem || other.isAbsorbed) continue;
        
        if (isColliding(draggedItem, other)) {
            // Merge!
            createSphere([draggedItem, other]);
            return;
        }
    }
    
    // Check against sphere
    if (isSphereActive) {
        const dx = (draggedItem.x + draggedItem.w/2) - sphereCenter.x;
        const dy = (draggedItem.y + draggedItem.h/2) - sphereCenter.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < sphereRadius + 50) { // Tolerance
            absorbItem(draggedItem);
        }
    }
}

function isColliding(a, b) {
    return !(
        a.x + a.w < b.x ||
        a.x > b.x + b.w ||
        a.y + a.h < b.y ||
        a.y > b.y + b.h
    );
}

function createSphere(items) {
    if (isSphereActive) return; // Already created
    
    isSphereActive = true;
    sphereRadius = 100; // Initial radius
    
    // Hide center text
    todoCenterText.style.display = 'none';
    
    // Create Sphere Visual (CSS)
    const sphereDiv = document.createElement('div');
    sphereDiv.id = 'todo-sphere';
    sphereDiv.style.width = `${sphereRadius * 2}px`;
    sphereDiv.style.height = `${sphereRadius * 2}px`;
    sphereDiv.style.position = 'absolute';
    sphereDiv.style.left = '50%';
    sphereDiv.style.top = '50%';
    sphereDiv.style.transform = 'translate(-50%, -50%)';
    sphereDiv.style.borderRadius = '50%';
    sphereDiv.style.background = 'radial-gradient(circle, rgba(255,100,100,0.3) 0%, rgba(255,0,0,0.1) 70%, transparent 100%)';
    sphereDiv.style.boxShadow = '0 0 50px rgba(255, 50, 50, 0.4)';
    sphereDiv.style.zIndex = 10; // Lower z-index than unabsorbed items (which default to auto or higher on drag)
    sphereDiv.style.transition = 'width 0.3s, height 0.3s';
    todoContainer.appendChild(sphereDiv);
    
    // Create Countdown element for later
    const sphereCountdown = document.createElement('div');
    sphereCountdown.id = 'sphere-countdown';
    sphereCountdown.style.position = 'absolute';
    sphereCountdown.style.left = `calc(50% + ${sphereRadius + 50}px)`; // Right of sphere
    sphereCountdown.style.top = '50%';
    sphereCountdown.style.transform = 'translateY(-50%)'; // Vertically centered
    sphereCountdown.style.fontFamily = "'Ma Shan Zheng', cursive";
    sphereCountdown.style.fontSize = '1.2rem'; // Smaller font as requested
    sphereCountdown.style.color = '#fff';
    sphereCountdown.style.textShadow = '0 0 10px rgba(255,255,255,0.8)';
    sphereCountdown.style.zIndex = 20;
    sphereCountdown.style.display = 'none';
    sphereCountdown.style.width = 'auto'; 
    sphereCountdown.style.whiteSpace = 'nowrap'; // No wrap
    sphereCountdown.style.textAlign = 'left';
    todoContainer.appendChild(sphereCountdown);
    
    items.forEach(item => absorbItem(item));
}

function absorbItem(item) {
    if (item.isAbsorbed) return;
    item.isAbsorbed = true;
    item.isDragged = false;
    absorbedCount++;
    
    // Update visual style
    item.element.style.transition = 'all 0.5s ease';
    item.element.classList.add('absorbed');
    // Ensure absorbed items are inside/above sphere but controlled
    item.element.style.zIndex = 15; 
    
    // Increase sphere size
    // Calculate new radius based on volume? Or just linear?
    // Volume of sphere ~ N items. Radius ~ cbrt(N)
    // Let's use a smoother growth
    const targetRadius = 150 + Math.sqrt(absorbedCount) * 25; // Base 150, grow with sqrt
    
    // Cap radius for mobile/small screens
    // Keep diameter within 80% of the smallest screen dimension
    const maxRadius = Math.min(width, height) * 0.4;
    sphereRadius = Math.min(targetRadius, maxRadius);
    
    const sphereDiv = document.getElementById('todo-sphere');
    const sphereCountdown = document.getElementById('sphere-countdown');
    
    if (sphereDiv) {
        sphereDiv.style.width = `${sphereRadius * 2}px`;
        sphereDiv.style.height = `${sphereRadius * 2}px`;
        // Update countdown position as sphere grows
        if (sphereCountdown) {
             // Keep it to the right of the sphere
             // User requested: "Previous countdown should appear to the right"
             // We prioritize right side unless it's impossible (Mobile Portrait)
             if (width < height && width < 600) { // Portrait Mobile
                 sphereCountdown.style.left = '50%';
                 sphereCountdown.style.top = `calc(50% + ${sphereRadius + 50}px)`;
                 sphereCountdown.style.transform = 'translateX(-50%)';
                 sphereCountdown.style.textAlign = 'center';
             } else {
                 sphereCountdown.style.left = `calc(50% + ${sphereRadius + 40}px)`;
                 sphereCountdown.style.top = '50%';
                 sphereCountdown.style.transform = 'translateY(-50%)';
                 sphereCountdown.style.textAlign = 'left';
             }
        }
    }
    
    // Check completion
    if (absorbedCount >= totalTodoItems) {
        startSphereCountdown();
    }
}

function startSphereCountdown() {
    const sphereCountdown = document.getElementById('sphere-countdown');
    if (!sphereCountdown) return;
    
    sphereCountdown.style.display = 'block';
    
    let timerInterval;

    // Countdown logic
    const updateTimer = () => {
        const now = new Date().getTime();
        // Display time to actual 2026 TARGET_DATE
        // This fixes the "late by 15s" issue by showing the real time remaining
        const distanceToTarget = TARGET_DATE - now;
        
        // Internal trigger based on SPHERE_TARGET_DATE (when animation should start)
        const distanceToTrigger = SPHERE_TARGET_DATE - now;
        
        if (distanceToTrigger <= 0) {
            // Reached animation trigger time!
            if (timerInterval) clearInterval(timerInterval);
            explodeSphere();
            return true; // Finished
        }
        
        // Format based on distanceToTarget
        const days = Math.floor(distanceToTarget / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distanceToTarget % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distanceToTarget % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distanceToTarget % (1000 * 60)) / 1000);
        
        // Single line, smaller font, specific prefix
        sphereCountdown.innerText = `距离2026还剩 ${days.toString().padStart(2, '0')}天 ${hours.toString().padStart(2, '0')}时 ${minutes.toString().padStart(2, '0')}分 ${seconds.toString().padStart(2, '0')}秒`;
        return false; // Not finished
    };
    
    // Only start interval if not immediately finished
    if (!updateTimer()) {
        timerInterval = setInterval(updateTimer, 100);
    }
}

function explodeSphere() {
    // Set exploding state
    isExploding = true;
    
    // Hide sphere background only
    const sphereDiv = document.getElementById('todo-sphere');
    const sphereCountdown = document.getElementById('sphere-countdown');
    if(sphereDiv) sphereDiv.style.opacity = 0;
    if(sphereCountdown) sphereCountdown.style.opacity = 0;
    
    // Create explosion effect (particles)
    // Use center of sphere
    const cx = width / 2;
    const cy = height / 2;
    
    // Add explosion particles
    for(let i=0; i<300; i++) {
        sparks.push(new Spark(cx, cy, `hsl(${Math.random()*60 + 30}, 100%, 70%)`));
    }
    
    // Assign explosion velocities to items
    const center = { x: width/2, y: height/2 };
    
    todoItems.forEach(item => {
        if (!item.isAbsorbed) return;
        
        // Calculate vector from center
        const dx = (item.x + item.w/2) - center.x;
        const dy = (item.y + item.h/2) - center.y;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Explosion speed based on distance from center (inner items faster or slower? Random mixed)
        const speed = 15 + Math.random() * 20;
        
        item.vx = Math.cos(angle) * speed;
        item.vy = Math.sin(angle) * speed;
        
        // Add some rotation spin
        item.rot = 0;
        item.rotSpeed = (Math.random() - 0.5) * 0.5;
    });
    
    // Add some sparks for effect
    // Moved to top for visual sync
    /*
    for(let i=0; i<100; i++) {
        sparks.push(new Spark(center.x, center.y, `hsl(${Math.random()*60 + 30}, 100%, 70%)`));
    }
    */
    
    // Transition to 2026 Celebration directly
    
    // Gather Effect (Shrink)
    setTimeout(() => {
        gatherParticlesToCenter();
    }, 1500); // Reduced from 2000 to 1500

    // Bloom into Countdown
    setTimeout(() => {
        todoContainer.style.display = 'none';
        showPreCountdownMessage();
    }, 2500); // Reduced from 4000 to 2500 for faster transition
}

function showPreCountdownMessage() {
    currentPhase = 2.5; // Transition phase
    
    // Show Text
    // Font size 90 for impact
    createTextParticles("宝贝，让我们一起迎接2026吧", 90);
    
    // Hold for 4 seconds then start countdown
    setTimeout(() => {
        startCountdown();
    }, 4000);
}

function forceJumpToCountdown() {
    if (currentPhase >= 2.5) return; // Already in transition or later
    
    console.log("Force jumping to countdown...");
    
    // Hide all overlays
    if (startScreen) {
        startScreen.style.opacity = 0;
        startScreen.style.display = 'none';
    }
    if (poemContainer) poemContainer.style.display = 'none';
    if (todoContainer) todoContainer.style.display = 'none';
    if (questionModal) questionModal.classList.add('hidden');
    if (disclaimerModal) disclaimerModal.classList.add('hidden');
    if (videoOverlay) videoOverlay.classList.add('hidden');
    
    // Stop intervals
    if (showingInterval) clearInterval(showingInterval);
    
    // Ensure BGM
    // if (bgm && bgm.paused) bgm.play().catch(e => console.log("Auto play bgm failed", e));
    
    showPreCountdownMessage();
}

function gatherParticlesToCenter() {
    // Ensure we have particles
    const particleCount = 800;
    if (particles.length < particleCount) {
         const toAdd = particleCount - particles.length;
         for(let i=0; i<toAdd; i++) {
             // Spawn random or from edge
             particles.push(new Particle(Math.random()*width, Math.random()*height));
         }
    }
    
    // Set targets to center
    const cx = width / 2;
    const cy = height / 2;
    particles.forEach(p => {
         p.tx = cx;
         p.ty = cy;
         // p.ease = 0.05; // Default ease
         // Increase randomness in ease for organic gather
         p.ease = 0.04 + Math.random() * 0.04;
    });
}

function updateTodoItems() {
    if (currentPhase !== 1.5) return;
    
    // Handle Explosion Phase
    if (isExploding) {
        todoItems.forEach(item => {
            if (!item.isAbsorbed) return;
            
            item.x += item.vx;
            item.y += item.vy;
            item.vy += 0.2; // Gravity
            item.rot += item.rotSpeed;
            
            item.element.style.left = `${item.x}px`;
            item.element.style.top = `${item.y}px`;
            item.element.style.transform = `rotate(${item.rot}rad) scale(1)`;
            item.element.style.opacity = parseFloat(item.element.style.opacity || 1) - 0.005; // Slower fade out
        });
        
        requestAnimationFrame(updateTodoItems);
        return;
    }
    
    // Fibonacci Sphere Algorithm for uniform distribution
    // We want to map absorbed items to points on the sphere surface (or volume)
    // Surface distribution is cleaner for text.
    
    const absorbedItems = todoItems.filter(i => i.isAbsorbed);
    const count = absorbedItems.length;
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    
    // Rotating the whole sphere
    const time = Date.now() * 0.0005; 
    const rotX = time;
    const rotY = time * 0.6;
    
    absorbedItems.forEach((item, i) => {
        // Calculate Fibonacci point on unit sphere
        const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
        const radiusAtY = Math.sqrt(1 - y * y); // Radius at y
        
        const theta = phi * i; // Golden angle increment
        
        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;
        
        // Scale by current sphere radius
        // We put them *inside* the sphere, so maybe 0.8 * radius
        const r = sphereRadius * 0.8;
        
        let pX = x * r;
        let pY = y * r;
        let pZ = z * r;
        
        // Apply Rotation (Euler angles)
        // Rotate around Y axis
        let x1 = pX * Math.cos(rotY) - pZ * Math.sin(rotY);
        let z1 = pX * Math.sin(rotY) + pZ * Math.cos(rotY);
        let y1 = pY;
        
        // Rotate around X axis
        let y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);
        let x2 = x1;
        
        // Project to 2D (Perspective)
        // Simple scale based on Z
        const scale = (z2 + sphereRadius * 2) / (sphereRadius * 2); // Simple depth scale
        const alpha = Math.max(0.3, Math.min(1, (z2 + r) / (2 * r))); // Fade back items
        
        // Set position relative to center
        item.element.style.left = `${sphereCenter.x + x2 - item.w/2}px`;
        item.element.style.top = `${sphereCenter.y + y2 - item.h/2}px`;
        
        // Scale text for 3D effect
        item.element.style.transform = `scale(${0.5 + 0.5 * scale})`;
        item.element.style.opacity = alpha;
        item.element.style.zIndex = Math.floor(z2 + r); // Z-sorting
    });
    
    // Handle unabsorbed items (Repulsion)
    const unabsorbed = todoItems.filter(i => !i.isAbsorbed && !i.isDragged);
    
    // 1. Sphere Repulsion
    if (isSphereActive) {
        unabsorbed.forEach(item => {
            const cx = item.x + item.w / 2;
            const cy = item.y + item.h / 2;
            const dx = cx - sphereCenter.x;
            const dy = cy - sphereCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Approximate item radius (half diagonal)
            const itemRadius = Math.sqrt(item.w * item.w + item.h * item.h) / 2;
            const minDist = sphereRadius + itemRadius + 20; // 20px buffer
            
            if (dist < minDist) {
                let nx = dx / dist;
                let ny = dy / dist;
                if (dist === 0) { nx = 1; ny = 0; } // Degenerate case
                
                // Push out (Softly)
                const pushDist = (minDist - dist) * 0.1; // Reduced from 1.0 to 0.1 to prevent jitter
                item.x += nx * pushDist;
                item.y += ny * pushDist;
            }
        });
    }

    // 2. Item-Item Repulsion (Relaxation)
    // Run a few iterations for stability
    for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < unabsorbed.length; i++) {
            for (let j = i + 1; j < unabsorbed.length; j++) {
                const a = unabsorbed[i];
                const b = unabsorbed[j];
                
                // Use existing checkCollision which includes padding
                if (checkCollision(a, b)) {
                    // Resolve overlap
                    // Calculate centers
                    const acx = a.x + a.w/2;
                    const acy = a.y + a.h/2;
                    const bcx = b.x + b.w/2;
                    const bcy = b.y + b.h/2;
                    
                    const dx = acx - bcx;
                    const dy = acy - bcy;
                    
                    // Determine overlap amount
                    // Use padding from checkCollision (10 total, so 5 per side)
                    const padding = 10;
                    const halfW_A = a.w / 2 + padding / 2;
                    const halfW_B = b.w / 2 + padding / 2;
                    const halfH_A = a.h / 2 + padding / 2;
                    const halfH_B = b.h / 2 + padding / 2;
                    
                    const overlapX = (halfW_A + halfW_B) - Math.abs(dx);
                    const overlapY = (halfH_A + halfH_B) - Math.abs(dy);
                    
                    if (overlapX > 0 && overlapY > 0) {
                        if (overlapX < overlapY) {
                            // Resolve X (Softly)
                            const sign = dx > 0 ? 1 : -1;
                            const move = overlapX * 0.05; // Reduced from 0.5 to 0.05
                            a.x += sign * move;
                            b.x -= sign * move;
                        } else {
                            // Resolve Y (Softly)
                            const sign = dy > 0 ? 1 : -1;
                            const move = overlapY * 0.05;
                            a.y += sign * move;
                            b.y -= sign * move;
                        }
                    }
                }
            }
        }
    }
    
    // 3. Update DOM and Bounds
    unabsorbed.forEach(item => {
        // Keep within bounds
        item.x = Math.max(0, Math.min(width - item.w, item.x));
        item.y = Math.max(0, Math.min(height - item.h, item.y));
        
        // Apply to DOM
        item.element.style.left = `${item.x}px`;
        item.element.style.top = `${item.y}px`;
    });
    
    requestAnimationFrame(updateTodoItems);
}

function checkCollision(r1, r2) {
    // Add some padding/margin to rects for spacing
    const padding = 10;
    return !(
        r2.x > r1.x + r1.w + padding ||
        r2.x + r2.w + padding < r1.x ||
        r2.y > r1.y + r1.h + padding ||
        r2.y + r2.h + padding < r1.y
    );
}

function endTodoPhase() {
    todoContainer.style.opacity = 0;
    setTimeout(() => {
        todoContainer.style.display = 'none';
        startQuestionPhase();
    }, 1000);
}

function startQuestionPhase() {
    currentPhase = 2;
    // Fade out poem
    poemContainer.classList.add('fade-out');
    setTimeout(() => { poemContainer.style.display = 'none'; }, 1000);

    // Init text particles
    createTextParticles("亲爱的宝贝\n让我们一起迎接新的一年吧", 60);

    // Schedule Countdown
    setTimeout(gatherParticlesToCenter, 4500); // Shrink text to center
    setTimeout(startCountdown, 6000); // Bloom to numbers
}

function startCountdown() {
    currentPhase = 3;
    let count = 10;
    
    // Initial number
    createTextParticles(count.toString(), 600); // Increased size from 300 to 600

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            createTextParticles(count.toString(), 600); // Increased size from 300 to 600
        } else {
            clearInterval(interval);
            startCelebration();
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
    // Adjust safeZone for mobile (smaller screens)
    // If height is small, reduce safeZone significantly
    let safeZone = 220 * textScale;
    
    if (height < 500) {
        safeZone = 60 * textScale; // Much smaller safe zone on landscape mobile
    } else if (width < 600) {
        safeZone = 100 * textScale; // Smaller safe zone on portrait mobile
    }
    
    // Calculate available tracks based on font size + padding
    const fontSize = 32 * textScale; // Updated font size
    const trackHeight = fontSize * 1.8; // 1.8 line height for ample spacing
    
    const validY = [];

    // Top Tracks
    // From y=50 to centerY-safeZone
    // Ensure at least some margin from top
    let currentY = 50 * textScale; 
    while (currentY < centerY - safeZone) {
        validY.push(currentY);
        currentY += trackHeight;
    }

    // Bottom Tracks
    // From centerY+safeZone to height-50
    currentY = centerY + safeZone;
    // Ensure at least some margin from bottom
    while (currentY < height - 50 * textScale) {
        validY.push(currentY);
        currentY += trackHeight;
    }
    
    // Fallback: If no tracks fit (extremely small screen), add at least one top and one bottom ignoring safe zone
    if (validY.length === 0) {
        validY.push(height * 0.2);
        validY.push(height * 0.8);
    }

    // Create messages for each track
    validY.forEach(y => {
        const speed = 2.5 + Math.random() * 1.5; // Faster speed (2.5 to 4.0)
        scrollingMessages.push(new ScrollingTrack(y, speed));
    });
}

function startCelebration() {
    currentPhase = 4;
    
    // Switch BGM
    // User requested BGM to keep playing
    // if (bgm) bgm.pause(); 
    if (fireworksBgm) {
        fireworksBgm.currentTime = 0;
        fireworksBgm.play().catch(e => console.error("Fireworks BGM play failed:", e));
    }

    createTextParticles("你好 2026\n宝贝 新年快乐", 120);
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

    // Draw Constellations (Only in Idle Phase 0)
    if (currentPhase === 0) {
        drawConstellation(ARIES);
        drawConstellation(CANCER);
    }

    // Draw Meteors
    meteors.forEach(meteor => {
        meteor.update();
        meteor.draw();
    });

    // Draw Text Particles (Phases 1.5, 2, 3, 4)
    if (currentPhase >= 1.5) {
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
    }

    // Draw Sparks (Global - for explosions in any phase)
    for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].update();
        sparks[i].draw();
        if (sparks[i].alpha <= 0) {
            sparks.splice(i, 1);
        }
    }
}

const videoOverlay = document.getElementById('video-overlay');
const popupVideo = document.getElementById('popup-video');
const closeVideoBtn = document.getElementById('close-video-btn');

// --- Interactions ---

// Mouse Interaction for Hover and Click
canvas.addEventListener('mousemove', (e) => {
    if (currentPhase !== 4) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hovering = false;

    scrollingMessages.forEach(track => {
        track.messages.forEach(msg => {
            if (msg.rect && 
                mx >= msg.rect.x && mx <= msg.rect.x + msg.rect.w &&
                my >= msg.rect.y && my <= msg.rect.y + msg.rect.h) {
                msg.isHovered = true;
                hovering = true;
                canvas.style.cursor = 'pointer';
            } else {
                msg.isHovered = false;
            }
        });
    });

    if (!hovering) {
        canvas.style.cursor = 'default';
    }
});

canvas.addEventListener('click', (e) => {
    if (currentPhase !== 4) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    scrollingMessages.forEach(track => {
        track.messages.forEach(msg => {
            if (msg.heartRect && 
                mx >= msg.heartRect.x && mx <= msg.heartRect.x + msg.heartRect.w &&
                my >= msg.heartRect.y && my <= msg.heartRect.y + msg.heartRect.h) {
                // Clicked on heart
                playRandomVideo();
            }
        });
    });
});

// Video Logic
const VIDEO_FILES = [
    // Add your video filenames here, located in assets/video/
    // Example: "video1.mp4", "video2.mp4"
    // For now, I'll assume some names or you can add them.
    // If no videos exist, this might fail, so ensure files are there.
];

// Helper to find videos (Simulation since we can't ls in browser JS without backend list)
// We will use a placeholder list. User should populate this.
const AVAILABLE_VIDEOS = Array.from({length: 15}, (_, i) => `${i + 1}.mp4`);

function playRandomVideo() {
    const videoFile = AVAILABLE_VIDEOS[Math.floor(Math.random() * AVAILABLE_VIDEOS.length)];
    const videoPath = `assets/video/${videoFile}`;
    
    popupVideo.src = videoPath;
    popupVideo.muted = true; // Default muted
    videoOverlay.classList.remove('hidden');
    videoOverlay.style.display = 'flex'; // Ensure flex display
    
    popupVideo.play().catch(e => {
        console.error("Video play error:", e);
        alert("视频无法播放，请检查 assets/video 目录下是否有视频文件 (1.mp4 ... 12.mp4)");
    });
    
    // Don't pause BGM since video is muted
    // bgm.pause();
    // if (fireworksBgm) fireworksBgm.pause(); 
}

closeVideoBtn.addEventListener('click', () => {
    videoOverlay.classList.add('hidden');
    videoOverlay.style.display = 'none';
    popupVideo.pause();
    popupVideo.currentTime = 0;
    // No need to resume as we didn't pause
});

popupVideo.addEventListener('ended', () => {
    videoOverlay.classList.add('hidden');
    videoOverlay.style.display = 'none';
    // No need to resume as we didn't pause
});

const questionModal = document.getElementById('question-modal');
const answerInput = document.getElementById('answer-input');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const errorMsg = document.getElementById('error-msg');
const disclaimerModal = document.getElementById('disclaimer-modal');
const agreeBtn = document.getElementById('agree-btn');

let wrongAttempts = 0;

startBtn.addEventListener('click', () => {
    // Show Question Modal first
    questionModal.classList.remove('hidden');
    answerInput.focus();
});

agreeBtn.addEventListener('click', () => {
    disclaimerModal.classList.add('hidden');
    // Start Sequence after agreeing
    // Play Audio
    bgm.play().catch(e => console.log("Audio play failed (interaction required)", e));
    startPoem();
});

submitAnswerBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

function checkAnswer() {
    const answer = answerInput.value.trim();
    if (answer === "小蓉蓉") {
        errorMsg.style.color = "#4dff4d"; // Green
        errorMsg.innerText = "宝贝你也太聪明了吧";
        
        // Immediately hide start-btn to prevent flash
        startBtn.classList.add('hidden');
        
        setTimeout(() => {
            questionModal.classList.add('hidden');
            // Show Disclaimer Modal after answering correctly
            disclaimerModal.classList.remove('hidden');
            // Reset scroll to top
            const content = disclaimerModal.querySelector('.disclaimer-content');
            if (content) content.scrollTop = 0;
        }, 1000);
    } else {
        wrongAttempts++;
        errorMsg.style.color = "#ff4d4d"; // Red
        if (wrongAttempts === 1) {
            errorMsg.innerText = "傻了吧";
        } else if (wrongAttempts === 2) {
            errorMsg.innerText = "是个小笨蛋吧";
        } else {
            errorMsg.innerText = "友情提醒三个字";
        }
        answerInput.value = "";
        answerInput.focus();
    }
}

// Init Background immediately
initStars();
animate();

function drawConstellation(constellation) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    
    // Draw Lines
    constellation.lines.forEach(line => {
        const start = constellation.stars[line[0]];
        const end = constellation.stars[line[1]];
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
    });

    // Draw Stars
    ctx.shadowBlur = 15; // Increased glow
    ctx.shadowColor = 'white';
    
    const time = Date.now() * 0.003;
    
    constellation.stars.forEach((star, index) => {
        // Twinkle effect using sine wave based on time + random index offset
        const alpha = 0.5 + 0.5 * Math.sin(time + index * 10);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, 4, 0, Math.PI * 2); // Increased size to 4
        ctx.fill();
    });

    // Draw Name (Optional)
    // ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    // ctx.font = '12px Arial';
    // const firstStar = constellation.stars[0];
    // ctx.fillText(constellation.name, firstStar.x * width, firstStar.y * height - 10);

    ctx.restore();
}
