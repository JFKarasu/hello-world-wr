document.addEventListener('DOMContentLoaded', () => {
    // Birthday Cake Modal Component
    const BirthdayCakeModal = {
        modal: document.getElementById('cake-modal'),
        canvas: document.getElementById('cake-canvas'),
        closeBtn: document.getElementById('close-cake'),
        hint: document.getElementById('cake-hint'),
        lyricsContainer: document.getElementById('lyrics-video-container'),
        closeLyricsBtn: document.getElementById('close-lyrics'),
        lyricsVideo: document.getElementById('lyrics-video'),
        ctx: null,
        animationFrameId: null,
        particles: [],
        candleStates: {},
        candlePositions: [],
        allCandlesBlown: false,
        blowParticles: [],
        smokeParticles: [],
        showBirthdayMessage: false,
        audioContext: null,
        analyser: null,
        microphoneStream: null,
        isListening: false,
        width: window.innerWidth,
        height: window.innerHeight,
        angleY: 0,
        
        CAKE_COLOR: 'rgba(0, 220, 255, 0.8)',
        CANDLE_COLOR: 'rgba(255, 255, 255, 0.9)',
        FLAME_COLORS: [
            'rgba(255, 255, 150, 1)',
            'rgba(255, 255, 50, 0.98)',
            'rgba(255, 230, 0, 0.95)',
            'rgba(255, 200, 0, 0.9)',
            'rgba(255, 160, 0, 0.85)'
        ],
        STAR_COLOR: 'rgba(255, 255, 255, 0.5)',

        init() {
            if (!this.modal || !this.canvas || !this.closeBtn) return;
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            if (!this.ctx) return;
            
            this.bindEvents();
            
            // 页面加载后直接打开蛋糕弹窗
            setTimeout(() => {
                this.openModal();
            }, 500);
        },

        bindEvents() {
            const self = this;
            
            // Close button
            this.closeBtn.addEventListener('click', () => self.closeModal());
            
            // Close lyrics button
            if (this.closeLyricsBtn) {
                this.closeLyricsBtn.addEventListener('click', () => self.closeLyricsVideo());
            }
            
            // Resize
            window.addEventListener('resize', () => {
                if (self.modal.classList.contains('visible')) {
                    self.resizeCanvas();
                }
            });
            
            // Blow candle events
            let lastTouchTime = 0;
            this.canvas.addEventListener('click', (e) => {
                const now = Date.now();
                if (now - lastTouchTime > 300) {
                    self.handleBlowCandle(e);
                    self.handleDoubleClick(e);
                }
            });
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastTouchTime > 300) {
                    lastTouchTime = now;
                    self.handleBlowCandle(e);
                    self.handleDoubleClick(e);
                }
            }, { passive: false });
        },

        resizeCanvas() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        },

        openModal() {
            this.modal.classList.remove('hidden');
            void this.modal.offsetWidth;
            this.modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
            
            this.resizeCanvas();
            this.buildParticles();
            
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            this.render();
            
            this.initMicrophone();
        },

        closeModal() {
            this.modal.classList.remove('visible');
            document.body.style.overflow = '';
            
            if (this.lyricsContainer && this.lyricsContainer.classList.contains('visible')) {
                this.closeLyricsVideo();
            }
            
            setTimeout(() => {
                this.modal.classList.add('hidden');
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                if (this.microphoneStream) {
                    this.microphoneStream.getTracks().forEach(track => track.stop());
                    this.microphoneStream = null;
                }
                this.isListening = false;
                this.ctx.clearRect(0, 0, this.width, this.height);
            }, 500);
        },

        buildParticles() {
            this.particles = [];
            this.candleStates = {};
            this.candlePositions = [];
            this.allCandlesBlown = false;
            this.showBirthdayMessage = false;
            this.blowParticles = [];
            this.smokeParticles = [];
            
            this.addCylinderParticles(30, 8, 16, 2500, this.CAKE_COLOR);
            this.addCylinderParticles(24, 8, 8, 1800, this.CAKE_COLOR);
            this.addCylinderParticles(18, 8, 0, 1200, this.CAKE_COLOR);

            const candlePositions = [
                { x: 10, z: 0 }, { x: -10, z: 0 }, { x: 0, z: 10 }, { x: 0, z: -10 }, 
                { x: 7, z: 7 }, { x: -7, z: 7 }, { x: 7, z: -7 }, { x: -7, z: -7 }, { x: 0, z: 0 }
            ];
            
            candlePositions.forEach((pos, idx) => {
                const candleId = idx;
                this.candleStates[candleId] = { isBlown: false, blowProgress: 0 };
                this.candlePositions.push({ ...pos, id: candleId });
                this.addCandleParticles(pos.x, pos.z, -3, 6, candleId);
            });

            this.addStarParticles(300);
        },

        addCylinderParticles(radius, height, yOffset, count, color) {
            for (let i = 0; i < count; i++) {
                const isTop = Math.random() < 0.3;
                let px, py, pz;
                
                if (isTop) {
                    const r = Math.sqrt(Math.random()) * radius;
                    const theta = Math.random() * Math.PI * 2;
                    px = r * Math.cos(theta);
                    pz = r * Math.sin(theta);
                    py = yOffset - height / 2;
                } else {
                    const theta = Math.random() * Math.PI * 2;
                    px = radius * Math.cos(theta);
                    pz = radius * Math.sin(theta);
                    py = yOffset - height / 2 + Math.random() * height;
                }
                
                this.particles.push({
                    x: px, y: py, z: pz,
                    color: color,
                    size: Math.random() * 1.5 + 0.5,
                    type: 'cake'
                });
            }
        },

        addCandleParticles(cx, cz, bottomY, height, candleId) {
            for (let i = 0; i < 60; i++) {
                const theta = Math.random() * Math.PI * 2;
                const r = 0.5;
                const px = cx + r * Math.cos(theta);
                const pz = cz + r * Math.sin(theta);
                const py = bottomY - Math.random() * height;
                
                this.particles.push({
                    x: px, y: py, z: pz,
                    color: this.CANDLE_COLOR,
                    size: 1,
                    type: 'candle',
                    candleId: candleId
                });
            }
            
            const flameBaseY = bottomY - height - 1;
            const flameHeight = 4;
            const flameWidth = 1.2;
            
            for (let i = 0; i < 120; i++) {
                const layer = Math.floor(Math.random() * this.FLAME_COLORS.length);
                const heightRatio = Math.random();
                const flameR = flameWidth * (1 - heightRatio * 0.6);
                const theta = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * flameR;
                
                const px = cx + r * Math.cos(theta);
                const pz = cz + r * Math.sin(theta);
                const py = flameBaseY - heightRatio * flameHeight;
                
                this.particles.push({
                    x: px,
                    y: py,
                    z: pz,
                    color: this.FLAME_COLORS[layer],
                    size: (3 - layer * 0.4) * (0.5 + Math.random() * 0.5),
                    type: 'flame',
                    baseX: px,
                    baseY: py,
                    baseZ: pz,
                    candleX: cx,
                    candleZ: cz,
                    phase: Math.random() * Math.PI * 2,
                    frequency: 2 + Math.random() * 3,
                    amplitude: 0.1 + Math.random() * 0.3,
                    layer: layer,
                    candleId: candleId
                });
            }
        },

        addStarParticles(count) {
            for (let i = 0; i < count; i++) {
                const theta = Math.random() * Math.PI * 2;
                const r = 20 + Math.random() * 20;
                const px = r * Math.cos(theta);
                const pz = r * Math.sin(theta);
                
                this.particles.push({
                    x: px,
                    y: (Math.random() - 0.5) * 30,
                    z: pz,
                    baseX: px,
                    baseZ: pz,
                    angleOffset: 0,
                    color: this.STAR_COLOR,
                    size: Math.random() * 1.5,
                    type: 'star',
                    speed: Math.random() * 0.02 + 0.01
                });
            }
        },

        render() {
            const self = this;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.angleY += 0.003;
            const cosY = Math.cos(this.angleY);
            const sinY = Math.sin(this.angleY);
            
            const angleX = 0.3;
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            
            const scale = Math.min(this.width, this.height) / 120;
            const centerX = this.width / 2;
            const centerY = this.height / 2 - scale * 20;
            
            this.ctx.globalCompositeOperation = 'lighter';
            
            const time = Date.now() * 0.005;

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                
                if (p.type === 'flame') {
                    const state = this.candleStates[p.candleId];
                    if (state && state.isBlown) {
                        continue;
                    }
                    if (state && state.blowProgress > 0) {
                        p.currentAlpha = 1 - state.blowProgress;
                        p.currentSize = p.size * (1 - state.blowProgress * 0.5);
                    } else {
                        p.currentAlpha = 1;
                        p.currentSize = p.size;
                    }
                }
                
                if (p.type === 'flame') {
                    const windX = Math.sin(time * p.frequency * 0.8 + p.phase) * p.amplitude * 2.5;
                    const windZ = Math.cos(time * p.frequency * 0.6 + p.phase * 1.3) * p.amplitude * 2;
                    const verticalOsc = Math.sin(time * p.frequency * 2 + p.phase * 1.7) * (0.3 + p.layer * 0.08);
                    
                    p.x = p.baseX + windX;
                    p.z = p.baseZ + windZ;
                    p.y = p.baseY + verticalOsc - Math.sin(time + p.phase) * (0.2 + p.layer * 0.05);
                } else if (p.type === 'star') {
                    p.y += Math.sin(time * 0.5 + p.baseX) * 0.05;
                    p.angleOffset += p.speed;
                    const sCos = Math.cos(p.angleOffset);
                    const sSin = Math.sin(p.angleOffset);
                    p.x = p.baseX * sCos - p.baseZ * sSin;
                    p.z = p.baseZ * sCos + p.baseX * sSin;
                }
                
                let rx = p.x * cosY - p.z * sinY;
                let rz = p.z * cosY + p.x * sinY;
                
                let ry = p.y * cosX - rz * sinX;
                rz = rz * cosX + p.y * sinX;
                
                const perspective = 300 / (300 + rz * scale);
                const pxScreen = centerX + rx * scale * perspective;
                const pyScreen = centerY + ry * scale * perspective;
                
                const rSize = (p.currentSize || p.size) * perspective;
                
                if (rSize > 0) {
                    this.ctx.beginPath();
                    this.ctx.arc(pxScreen, pyScreen, rSize, 0, Math.PI * 2);
                    
                    if (p.type === 'flame' && p.currentAlpha !== undefined) {
                        let colorStr = p.color;
                        if (colorStr.startsWith('rgba')) {
                            const match = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                            if (match) {
                                const r = match[1], g = match[2], b = match[3], a = parseFloat(match[4]);
                                colorStr = `rgba(${r}, ${g}, ${b}, ${a * p.currentAlpha})`;
                            }
                        }
                        this.ctx.fillStyle = colorStr;
                    } else {
                        this.ctx.fillStyle = p.color;
                    }
                    
                    this.ctx.fill();
                }
            }
            
            this.renderBlowParticles();
            this.renderSmokeParticles();
            this.updateCandleBlowProgress();
            
            if (this.showBirthdayMessage) {
                this.showLyricsVideo();
            }
            
            this.ctx.globalCompositeOperation = 'source-over';
            this.animationFrameId = requestAnimationFrame(() => self.render());
        },

        renderBlowParticles() {
            for (let i = this.blowParticles.length - 1; i >= 0; i--) {
                const p = this.blowParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.alpha -= 0.01;
                
                if (p.alpha <= 0) {
                    this.blowParticles.splice(i, 1);
                    continue;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                this.ctx.fill();
            }
        },

        renderSmokeParticles() {
            for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
                const p = this.smokeParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy -= 0.02;
                p.size += 0.05;
                p.alpha -= 0.005;
                
                if (p.alpha <= 0) {
                    this.smokeParticles.splice(i, 1);
                    continue;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(150, 150, 150, ${p.alpha})`;
                this.ctx.fill();
            }
        },

        updateCandleBlowProgress() {
            for (const candleId in this.candleStates) {
                const state = this.candleStates[candleId];
                if (state.blowProgress > 0 && !state.isBlown) {
                    state.blowProgress += 0.02;
                    if (state.blowProgress >= 1) {
                        state.blowProgress = 1;
                        state.isBlown = true;
                        
                        const candle = this.candlePositions.find(c => c.id === parseInt(candleId));
                        if (candle) {
                            const cosY = Math.cos(this.angleY);
                            const sinY = Math.sin(this.angleY);
                            const angleX = 0.3;
                            const cosX = Math.cos(angleX);
                            const sinX = Math.sin(angleX);
                            const scale = Math.min(this.width, this.height) / 120;
                            const centerX = this.width / 2;
                            const centerY = this.height / 2 - scale * 20;
                            
                            const bottomY = -3;
                            const flameY = bottomY - 6 - 1 - 2;
                            
                            let rx = candle.x * cosY - candle.z * sinY;
                            let rz = candle.z * cosY + candle.x * sinY;
                            
                            let ry = flameY * cosX - rz * sinX;
                            rz = rz * cosX + flameY * sinX;
                            
                            const perspective = 300 / (300 + rz * scale);
                            const pxScreen = centerX + rx * scale * perspective;
                            const pyScreen = centerY + ry * scale * perspective;
                            
                            this.addSmokeParticles(pxScreen, pyScreen);
                        }
                        
                        this.allCandlesBlown = Object.values(this.candleStates).every(s => s.isBlown);
                        if (this.allCandlesBlown) {
                            setTimeout(() => {
                                this.triggerFireworks();
                                setTimeout(() => {
                                    this.showBirthdayMessage = true;
                                }, 2500);
                            }, 500);
                        }
                    }
                }
            }
        },

        addSmokeParticles(x, y) {
            for (let i = 0; i < 50; i++) {
                this.smokeParticles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2 - 1,
                    size: Math.random() * 3 + 1,
                    alpha: 0.6
                });
            }
        },

        async initMicrophone() {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                
                this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
                source.connect(this.analyser);
                
                this.isListening = true;
                if (this.hint) this.hint.textContent = '对着麦克风吹气或点击蜡烛吹灭它！';
                this.processMicrophoneInput();
            } catch (e) {
                console.log('Microphone access denied:', e);
                if (this.hint) this.hint.textContent = '点击蜡烛吹灭它！';
            }
        },

        processMicrophoneInput() {
            if (!this.isListening || !this.analyser) return;
            
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            
            let sum = 0;
            let count = 0;
            for (let i = 30; i < dataArray.length; i++) {
                sum += dataArray[i];
                count++;
            }
            const avgVolume = sum / count;
            
            if (avgVolume > 80) {
                this.tryBlowNearestCandle(avgVolume);
            }
            
            requestAnimationFrame(() => this.processMicrophoneInput());
        },

        tryBlowNearestCandle(volume) {
            const blowStrength = Math.min((volume - 80) / 50, 1);
            
            let nearestCandle = null;
            let nearestDist = Infinity;
            
            const cosY = Math.cos(this.angleY);
            const sinY = Math.sin(this.angleY);
            const angleX = 0.3;
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            const scale = Math.min(this.width, this.height) / 120;
            const centerX = this.width / 2;
            const centerY = this.height / 2 - scale * 20;
            
            for (let i = 0; i < this.candlePositions.length; i++) {
                const candle = this.candlePositions[i];
                if (this.candleStates[candle.id].isBlown) continue;
                
                const bottomY = -3;
                const flameY = bottomY - 6 - 1 - 2;
                
                let rx = candle.x * cosY - candle.z * sinY;
                let rz = candle.z * cosY + candle.x * sinY;
                
                let ry = flameY * cosX - rz * sinX;
                rz = rz * cosX + flameY * sinX;
                
                const perspective = 300 / (300 + rz * scale);
                const pxScreen = centerX + rx * scale * perspective;
                const pyScreen = centerY + ry * scale * perspective;
                
                const dist = Math.sqrt(Math.pow(pxScreen - this.width/2, 2) + Math.pow(pyScreen - this.height/2, 2));
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestCandle = { id: candle.id, x: pxScreen, y: pyScreen };
                }
            }
            
            if (nearestCandle) {
                this.candleStates[nearestCandle.id].blowProgress += blowStrength * 0.1;
                if (this.candleStates[nearestCandle.id].blowProgress > 1) {
                    this.candleStates[nearestCandle.id].blowProgress = 1;
                }
            }
        },

        handleBlowCandle(event) {
            if (this.allCandlesBlown) return;
            
            let rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            
            if (event.touches) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            
            const clickX = clientX - rect.left;
            const clickY = clientY - rect.top;
            
            const cosY = Math.cos(this.angleY);
            const sinY = Math.sin(this.angleY);
            const angleX = 0.3;
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            const scale = Math.min(this.width, this.height) / 120;
            const centerX = this.width / 2;
            const centerY = this.height / 2 - scale * 20;
            
            for (let i = 0; i < this.candlePositions.length; i++) {
                const candle = this.candlePositions[i];
                const state = this.candleStates[candle.id];
                if (state && state.isBlown) continue;
                
                const bottomY = -3;
                const flameY = bottomY - 6 - 1 - 2;
                
                let rx = candle.x * cosY - candle.z * sinY;
                let rz = candle.z * cosY + candle.x * sinY;
                
                let ry = flameY * cosX - rz * sinX;
                rz = rz * cosX + flameY * sinX;
                
                const perspective = 300 / (300 + rz * scale);
                const pxScreen = centerX + rx * scale * perspective;
                const pyScreen = centerY + ry * scale * perspective;
                
                const dist = Math.sqrt(Math.pow(clickX - pxScreen, 2) + Math.pow(clickY - pyScreen, 2));
                const hitRadius = 50 * scale / 10;
                
                if (dist < hitRadius) {
                    this.blowCandle(candle.id, clickX, clickY);
                    break;
                }
            }
        },

        lastClickTime: 0,
        lastClickedCandle: null,
        handleDoubleClick(event) {
            let rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            
            if (event.touches) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            
            const clickX = clientX - rect.left;
            const clickY = clientY - rect.top;
            const now = Date.now();
            
            const cosY = Math.cos(this.angleY);
            const sinY = Math.sin(this.angleY);
            const angleX = 0.3;
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            const scale = Math.min(this.width, this.height) / 120;
            const centerX = this.width / 2;
            const centerY = this.height / 2 - scale * 20;
            
            for (let i = 0; i < this.candlePositions.length; i++) {
                const candle = this.candlePositions[i];
                
                const bottomY = -3;
                const flameY = bottomY - 6 - 1 - 2;
                
                let rx = candle.x * cosY - candle.z * sinY;
                let rz = candle.z * cosY + candle.x * sinY;
                
                let ry = flameY * cosX - rz * sinX;
                rz = rz * cosX + flameY * sinX;
                
                const perspective = 300 / (300 + rz * scale);
                const pxScreen = centerX + rx * scale * perspective;
                const pyScreen = centerY + ry * scale * perspective;
                
                const dist = Math.sqrt(Math.pow(clickX - pxScreen, 2) + Math.pow(clickY - pyScreen, 2));
                const hitRadius = 50 * scale / 10;
                
                if (dist < hitRadius) {
                    if (now - this.lastClickTime < 300 && this.lastClickedCandle === candle.id) {
                        this.relightCandle(candle.id);
                    }
                    this.lastClickTime = now;
                    this.lastClickedCandle = candle.id;
                    break;
                }
            }
        },

        blowCandle(candleId, x, y) {
            const state = this.candleStates[candleId];
            if (state.isBlown) return;
            
            state.blowProgress = 0.5;
            
            for (let i = 0; i < 30; i++) {
                this.blowParticles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8 - 3,
                    size: Math.random() * 4 + 2,
                    alpha: 1
                });
            }
        },

        relightCandle(candleId) {
            const state = this.candleStates[candleId];
            if (!state.isBlown) return;
            
            state.isBlown = false;
            state.blowProgress = 0;
            this.allCandlesBlown = false;
            this.showBirthdayMessage = false;
            
            const candle = this.candlePositions.find(c => c.id === candleId);
            if (candle) {
                const cosY = Math.cos(this.angleY);
                const sinY = Math.sin(this.angleY);
                const angleX = 0.3;
                const cosX = Math.cos(angleX);
                const sinX = Math.sin(angleX);
                const scale = Math.min(this.width, this.height) / 120;
                const centerX = this.width / 2;
                const centerY = this.height / 2 - scale * 20;
                
                const bottomY = -3;
                const flameY = bottomY - 6 - 1 - 2;
                
                let rx = candle.x * cosY - candle.z * sinY;
                let rz = candle.z * cosY + candle.x * sinY;
                
                let ry = flameY * cosX - rz * sinX;
                rz = rz * cosX + flameY * sinX;
                
                const perspective = 300 / (300 + rz * scale);
                const pxScreen = centerX + rx * scale * perspective;
                const pyScreen = centerY + ry * scale * perspective;
                
                for (let i = 0; i < 40; i++) {
                    this.blowParticles.push({
                        x: pxScreen,
                        y: pyScreen,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6 - 2,
                        size: Math.random() * 3 + 1,
                        alpha: 1
                    });
                }
            }
        },

        triggerFireworks() {
            for (let j = 0; j < 5; j++) {
                setTimeout(() => {
                    const fx = Math.random() * this.width;
                    const fy = Math.random() * this.height / 2;
                    for (let i = 0; i < 80; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 6 + 2;
                        this.blowParticles.push({
                            x: fx,
                            y: fy,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: Math.random() * 3 + 1,
                            alpha: 1
                        });
                    }
                }, j * 300);
            }
        },

        showLyricsVideo() {
            if (!this.lyricsContainer || this.lyricsContainer.classList.contains('visible')) return;
            this.lyricsContainer.classList.remove('hidden');
            void this.lyricsContainer.offsetWidth;
            this.lyricsContainer.classList.add('visible');
            
            if (this.lyricsVideo) {
                this.lyricsVideo.currentTime = 0;
                const playPromise = this.lyricsVideo.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.log('Video play error:', e));
                }
            }
        },

        closeLyricsVideo() {
            if (!this.lyricsContainer) return;
            this.lyricsContainer.classList.remove('visible');
            
            if (this.lyricsVideo) {
                this.lyricsVideo.pause();
            }
            
            setTimeout(() => {
                if (this.lyricsContainer) {
                    this.lyricsContainer.classList.add('hidden');
                }
            }, 500);
        }
    };

    BirthdayCakeModal.init();
});
