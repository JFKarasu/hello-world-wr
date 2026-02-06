const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const poemContainer = document.getElementById('poem-container');
const todoContainer = document.getElementById('todo-container');
const todoCenterText = document.getElementById('todo-center-text');
const bgm = document.getElementById('bgm');

let width, height;
let particles = [];
let fireworks = [];
let sparks = [];
let stars = [];
let meteors = [];
let scrollingMessages = [];
let currentPhase = 0;
let countdownValue = 10;
let textScale = 1;

const POEM_LINE_DELAY = 1500;
const TOTAL_POEM_TIME = 15000;
const TEXT_COLOR = '#ffcc00';
const PARTICLE_DENSITY = 4;

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

const TODO_ITEMS = [
    "一起露营", "一起看日出", "一起堆雪人", "一起拼乐高", "一起放烟花",
    "一起做早餐", "一起打羽毛球", "一起吹晚风", "一起去鬼屋", "一起重盆栽",
    "一起滑雪", "一起压马路", "一起养小猫", "一起喂小狗", "一起旅行", 
    "一起做午餐", "一起相拥而眠", "一起手牵手", "一起看樱花", "一起刷碗",
    "一起看电影", "一起等日落", "一起逛公园", "一起吃火锅", "一起逛超市", 
    "一起做晚餐", "一起做手工", "一起跨年", "一起去动物园", "一起拍情侣照",
    "一起骑单车", "一起爬山", "一起听雨声", "一起等日落", "一起散步", 
    "一起吃夜宵", "一起唱歌", "一起看球赛", "一起去海底世界", "一起骑车",
    "一起踩沙滩", "一起赖被窝", "一起唠家常", "一起煮热汤", "一起捡贝壳", 
    "一起旅游", "一起做爱做的事", "一起去寺庙祈福", "一起摘水果", "一起穿情侣服",
    "一起坐公交", "一起伸懒腰", "一起喝奶茶", "一起写信", "一起看星星", 
    "一起打伞", "一起发疯", "一起抓娃娃", "一起钓鱼", "一起晨跑",
    "一起拆盲盒", "一起做蛋糕", "一起听老歌", "一起逛书店", "一起打游戏", 
    "一起弹钢琴", "一起去游乐园", "一起看恐怖片", "一起挖雨花石", "一起回忆过去",
    "一起坐飞机", "一起逛夜市", "一起吐槽", "一起烤肉", "一起走下去"
];

let blessingQueue = [];

function getNextBlessing() {
    if (blessingQueue.length === 0) {
        blessingQueue = [...BLESSINGS];
        for (let i = blessingQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [blessingQueue[i], blessingQueue[j]] = [blessingQueue[j], blessingQueue[i]];
        }
    }
    return blessingQueue.pop();
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    textScale = Math.min(width / 800, 1);
    
    if (currentPhase === 4) {
        initScrollingMessages();
    }
}
window.addEventListener('resize', resize);
resize();

class ScrollingTrack {
    constructor(y, speed) {
        this.y = y;
        this.speed = speed;
        this.messages = [];
        
        this.addMessage(width + Math.random() * 200);
    }
    addMessage(x) {
        let text = getNextBlessing();
        ctx.save();
        ctx.font = `bold ${32 * textScale}px "Ma Shan Zheng", cursive`;
        const textWidth = ctx.measureText(text).width;
        ctx.restore();
        this.messages.push({ x: x, text: text, width: textWidth });
    }

    update() {
        this.messages.forEach(msg => {
            msg.x -= this.speed;
        });
        if (this.messages.length > 0 && this.messages[0].x < -this.messages[0].width - 100) {
            this.messages.shift();
        }
        const lastMsg = this.messages[this.messages.length - 1];
        if (lastMsg) {
            const tailX = lastMsg.x + lastMsg.width + 60; 
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
            ctx.font = `bold ${32 * textScale}px "Ma Shan Zheng", cursive`;
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineJoin = 'round';
            ctx.strokeText(msg.text, msg.x, this.y);
            
            ctx.fillStyle = "#E0FFFF";
            ctx.shadowColor = "#00FFFF";
            ctx.shadowBlur = 10; 
            ctx.fillText(msg.text, msg.x, this.y);
            
            const heartX = msg.x + msg.width + 15;
            ctx.strokeText("❤", heartX, this.y); 
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
        this.x = Math.random() * width + width;
        this.y = Math.random() * height * 0.5;
        this.len = Math.random() * 80 + 20;
        this.speed = Math.random() * 10 + 5;
        this.size = Math.random() * 2 + 0.5;
        this.angle = Math.PI / 4;
    }

    update() {
        this.x -= this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);

        if (this.x < -100 || this.y > height + 100) {
            this.reset();
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
        this.tx = x;
        this.ty = y;
        this.vx = 0;
        this.vy = 0;
        this.color = `hsl(${Math.random() * 60 + 30}, 100%, 70%)`;
        this.friction = 0.92;
        this.ease = 0.05;
    }

    update() {
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
        this.vy = -(Math.random() * 8 + 12);
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.done = false;
        this.history = [];
    }

    update() {
        this.history.push({x: this.x, y: this.y});
        if(this.history.length > 5) this.history.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.25;
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
        const speed = Math.random() * 8 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
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

function initStars() {
    for (let i = 0; i < 200; i++) {
        stars.push(new Star());
    }
    for (let i = 0; i < 15; i++) {
        meteors.push(new Meteor());
    }
}

function createTextParticles(text, fontSize = 60) {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = width;
    offCanvas.height = height;
    offCtx.fillStyle = 'white';
    offCtx.font = `bold ${fontSize * textScale}px "Ma Shan Zheng", cursive`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    const lines = text.split('\n');
    const lineHeight = fontSize * textScale * 1.5;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
        offCtx.fillText(line, width / 2, startY + i * lineHeight);
    });
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const newTargets = [];
    for (let y = 0; y < height; y += PARTICLE_DENSITY) {
        for (let x = 0; x < width; x += PARTICLE_DENSITY) {
            const index = (y * width + x) * 4;
            if (data[index + 3] > 128) {
                newTargets.push({ x, y });
            }
        }
    }

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
            particles[i].ease = 0.03 + Math.random() * 0.05;
        } else {
            particles[i].tx = Math.random() * width;
            particles[i].ty = Math.random() * height * 2;
        }
    }
}

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

    setTimeout(startTodoPhase, TOTAL_POEM_TIME);
}

let placedItems = [];

function startTodoPhase() {
    currentPhase = 1.5;
    placedItems = [];
    poemContainer.classList.add('fade-out');
    setTimeout(() => { poemContainer.style.display = 'none'; }, 1000);
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
}

function startShowingTodoItems() {
    let itemIndex = 0;
    const shuffledItems = [...TODO_ITEMS].sort(() => Math.random() - 0.5);
    const interval = setInterval(() => {
        if (itemIndex >= shuffledItems.length) {
            clearInterval(interval);
            setTimeout(endTodoPhase, 3000);
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
    const size = 0.8 + Math.random() * 1.0; 
    div.style.fontSize = `${size}rem`;
    const fontSizePx = size * 16; 
    const itemWidth = text.length * fontSizePx * 1.1;
    const itemHeight = fontSizePx * 1.5;
    const centerX = width / 2;
    const centerY = height / 2;
    const centerW = 12 * 3 * 16 * 1.2;
    const centerH = 3 * 16 * 2;
    const centerRect = {
        x: centerX - centerW / 2,
        y: centerY - centerH / 2,
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
        if (checkCollision(currentRect, centerRect)) {
            valid = false;
            attempts++;
            continue;
        }
        let overlaps = false;
        for (let item of placedItems) {
            if (checkCollision(currentRect, item)) {
                overlaps = true;
                break;
            }
        }
        if (!overlaps) {
            valid = true;
            placedItems.push(currentRect);
        }
        attempts++;
    }
    if (valid) {
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        todoContainer.appendChild(div);
    }
}

function checkCollision(r1, r2) {
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
    poemContainer.classList.add('fade-out');
    setTimeout(() => { poemContainer.style.display = 'none'; }, 1000);
    createTextParticles("王蓉\n让我们一起迎接新的一年吧", 60);
    setTimeout(startCountdown, 6000);
}

function startCountdown() {
    currentPhase = 3;
    let count = 10;
    createTextParticles(count.toString(), 300);
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            createTextParticles(count.toString(), 300);
        } else {
            clearInterval(interval);
            startSpherePhase();
        }
    }, 1000);
}

function startSpherePhase() {
    const radius = Math.min(width, height) * 0.3;
    const newTargets = [];
    const sphereParticleCount = 800;
    for (let i = 0; i < sphereParticleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / sphereParticleCount);
        const theta = Math.sqrt(sphereParticleCount * Math.PI) * phi;
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        newTargets.push({
            x: width / 2 + x,
            y: height / 2 + y
        });
    }
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
            particles[i].tx = width / 2;
            particles[i].ty = height / 2;
        }
    }
    setTimeout(startCelebration, 3000);
}

function initScrollingMessages() {
    scrollingMessages = [];
    const centerY = height / 2;
    const safeZone = 220 * textScale; 
    const fontSize = 32 * textScale; // Updated font size
    const trackHeight = fontSize * 1.8; // 1.8 line height for ample spacing
    const validY = [];
    let currentY = 80;
    while (currentY < centerY - safeZone) {
        validY.push(currentY);
        currentY += trackHeight;
    }
    currentY = centerY + safeZone + 50;
    while (currentY < height - 50) {
        validY.push(currentY);
        currentY += trackHeight;
    }
    validY.forEach(y => {
        const speed = 1.5 + Math.random() * 1.0;
        scrollingMessages.push(new ScrollingTrack(y, speed));
    });
}

function startCelebration() {
    currentPhase = 4;
    createTextParticles("你好 2026", 120);
    initScrollingMessages();
}

function animate() {
    requestAnimationFrame(animate);
    ctx.fillRect(0, 0, width, height);
    stars.forEach(star => {
        star.update();
        star.draw();
    });
    meteors.forEach(meteor => {
        meteor.update();
        meteor.draw();
    });
    if (currentPhase >= 2) {
        particles.forEach(p => {
            p.update();
            p.draw();
        });
    }
    if (currentPhase === 4) {
        ctx.save();
        ctx.font = `bold ${28 * textScale}px "Ma Shan Zheng", cursive`; 
        ctx.fillStyle = "rgba(135, 206, 235, 1)";
        ctx.shadowColor = "rgba(0, 255, 255, 0.5)";
        ctx.shadowBlur = 4;
        scrollingMessages.forEach(msg => {
            msg.update();
            msg.draw();
        });
        ctx.restore();
    }
    if (currentPhase === 4) {
        if (Math.random() < 0.08) {
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

startBtn.addEventListener('click', () => {
    bgm.play().catch(e => console.log("Audio play failed (interaction required)", e));
    initStars();
    animate();
    startPoem();
});
