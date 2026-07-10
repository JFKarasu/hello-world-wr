document.addEventListener('DOMContentLoaded', () => {
    initCakeEffect();
});

function initCakeEffect() {
    const modal = document.getElementById('cake-modal');
    const canvas = document.getElementById('cake-canvas');
    const closeBtn = document.getElementById('close-cake');
    const hint = document.getElementById('cake-hint');
    const lyricsContainer = document.getElementById('lyrics-video-container');
    const closeLyricsBtn = document.getElementById('close-lyrics');
    const lyricsVideo = document.getElementById('lyrics-video');

    if (!modal || !canvas || !closeBtn || !hint) {
        return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
        return;
    }

    let animationFrameId = null;
    let particles = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Blow candle state
    let candleStates = {}; // { candleId: { isBlown: boolean, blowProgress: number } }
    let candlePositions = [];
    let allCandlesBlown = false;
    let blowParticles = [];
    let smokeParticles = [];
    let showBirthdayMessage = false;
    
    // Microphone for blow detection
    let audioContext = null;
    let analyser = null;
    let microphoneStream = null;
    let isListening = false;
    
    // Config
    const CAKE_COLOR = 'rgba(0, 220, 255, 0.8)';
    const CANDLE_COLOR = 'rgba(255, 255, 255, 0.9)';
    const FLAME_COLORS = [
        'rgba(255, 255, 150, 1)',
        'rgba(255, 255, 50, 0.98)',
        'rgba(255, 230, 0, 0.95)',
        'rgba(255, 200, 0, 0.9)',
        'rgba(255, 160, 0, 0.85)'
    ];
    const STAR_COLOR = 'rgba(255, 255, 255, 0.5)';

    // Resize
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    // Initialize particles
    function buildParticles() {
        particles = [];
        candleStates = {};
        candlePositions = [];
        allCandlesBlown = false;
        showBirthdayMessage = false;
        blowParticles = [];
        smokeParticles = [];
        
        // Cake Layers (Radius, Height, Y Offset, Count)
        addCylinderParticles(30, 8, 16, 2500, CAKE_COLOR);
        addCylinderParticles(24, 8, 8, 1800, CAKE_COLOR);
        addCylinderParticles(18, 8, 0, 1200, CAKE_COLOR);

        // Candles - more spread out
        const _candlePositions = [
            { x: 10, z: 0 }, { x: -10, z: 0 }, { x: 0, z: 10 }, { x: 0, z: -10 }, 
            { x: 7, z: 7 }, { x: -7, z: 7 }, { x: 7, z: -7 }, { x: -7, z: -7 }, { x: 0, z: 0 }
        ];
        
        _candlePositions.forEach((pos, idx) => {
            const candleId = idx;
            candleStates[candleId] = { isBlown: false, blowProgress: 0 };
            candlePositions.push({ ...pos, id: candleId });
            addCandleParticles(pos.x, pos.z, -3, 6, candleId);
        });

        // Stars
        addStarParticles(300);
    }

    function addCylinderParticles(radius, height, yOffset, count, color) {
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
            
            particles.push({
                x: px, y: py, z: pz,
                color: color,
                size: Math.random() * 1.5 + 0.5,
                type: 'cake'
            });
        }
    }

    function addCandleParticles(cx, cz, bottomY, height, candleId) {
        // Candle body
        for (let i = 0; i < 60; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = 0.5;
            const px = cx + r * Math.cos(theta);
            const pz = cz + r * Math.sin(theta);
            const py = bottomY - Math.random() * height;
            
            particles.push({
                x: px, y: py, z: pz,
                color: CANDLE_COLOR,
                size: 1,
                type: 'candle',
                candleId: candleId
            });
        }
        
        // Flame - more realistic with multiple layers and dynamics
        const flameBaseY = bottomY - height - 1;
        const flameHeight = 4;
        const flameWidth = 1.2;
        
        // Add more particles for a denser flame
        for (let i = 0; i < 120; i++) {
            const layer = Math.floor(Math.random() * FLAME_COLORS.length);
            const heightRatio = Math.random();
            const flameR = flameWidth * (1 - heightRatio * 0.6);
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * flameR;
            
            const px = cx + r * Math.cos(theta);
            const pz = cz + r * Math.sin(theta);
            const py = flameBaseY - heightRatio * flameHeight;
            
            particles.push({
                x: px,
                y: py,
                z: pz,
                color: FLAME_COLORS[layer],
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
    }

    function addStarParticles(count) {
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 20;
            const px = r * Math.cos(theta);
            const pz = r * Math.sin(theta);
            
            particles.push({
                x: px,
                y: (Math.random() - 0.5) * 30,
                z: pz,
                baseX: px,
                baseZ: pz,
                angleOffset: 0,
                color: STAR_COLOR,
                size: Math.random() * 1.5,
                type: 'star',
                speed: Math.random() * 0.02 + 0.01
            });
        }
    }

    // Animation Loop
    let angleY = 0;
    
    function render() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);
        
        angleY += 0.003;
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        
        // Tilt the camera slightly down
        const angleX = 0.3;
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        
        const scale = Math.min(width, height) / 120;
        const centerX = width / 2;
        const centerY = height / 2 - scale * 20;
        
        ctx.globalCompositeOperation = 'lighter';
        
        const time = Date.now() * 0.005;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Skip rendering flame if candle is blown
            if (p.type === 'flame') {
                const state = candleStates[p.candleId];
                if (state && state.isBlown) {
                    continue;
                }
                // Apply blow progress to flame opacity and size
                if (state && state.blowProgress > 0) {
                    p.currentAlpha = 1 - state.blowProgress;
                    p.currentSize = p.size * (1 - state.blowProgress * 0.5);
                } else {
                    p.currentAlpha = 1;
                    p.currentSize = p.size;
                }
            }
            
            // Update specific particles
            if (p.type === 'flame') {
                // More realistic flame movement with stronger turbulence and swaying
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
            
            // Rotate Y
            let rx = p.x * cosY - p.z * sinY;
            let rz = p.z * cosY + p.x * sinY;
            
            // Rotate X
            let ry = p.y * cosX - rz * sinX;
            rz = rz * cosX + p.y * sinX;
            
            const perspective = 300 / (300 + rz * scale);
            const pxScreen = centerX + rx * scale * perspective;
            const pyScreen = centerY + ry * scale * perspective;
            
            const rSize = (p.currentSize || p.size) * perspective;
            
            if (rSize > 0) {
                ctx.beginPath();
                ctx.arc(pxScreen, pyScreen, rSize, 0, Math.PI * 2);
                
                if (p.type === 'flame' && p.currentAlpha !== undefined) {
                    // Modify color with alpha
                    let colorStr = p.color;
                    if (colorStr.startsWith('rgba')) {
                        const match = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                        if (match) {
                            const r = match[1], g = match[2], b = match[3], a = parseFloat(match[4]);
                            colorStr = `rgba(${r}, ${g}, ${b}, ${a * p.currentAlpha})`;
                        }
                    }
                    ctx.fillStyle = colorStr;
                } else {
                    ctx.fillStyle = p.color;
                }
                
                // 性能优化：移除了极其消耗性能的 shadowBlur。
                // 仅依靠外层的 globalCompositeOperation = 'lighter' 
                // 粒子叠加时就会自然产生极佳的发光效果，帧率可瞬间恢复到 60FPS。
                ctx.fill();
            }
        }
        
        // Render blow particles
        renderBlowParticles();
        
        // Render smoke particles
        renderSmokeParticles();
        
        // Update blow progress for candles
        updateCandleBlowProgress();
        
        // Show lyrics video if all candles are blown
        if (showBirthdayMessage) {
            showLyricsVideo();
        }
        
        ctx.globalCompositeOperation = 'source-over';
        animationFrameId = requestAnimationFrame(render);
    }
    
    // Render blow particles
    function renderBlowParticles() {
        for (let i = blowParticles.length - 1; i >= 0; i--) {
            const p = blowParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // gravity
            p.alpha -= 0.01;
            
            if (p.alpha <= 0) {
                blowParticles.splice(i, 1);
                continue;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.fill();
        }
    }
    
    // Render smoke particles
    function renderSmokeParticles() {
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            const p = smokeParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.02; // rise up
            p.size += 0.05;
            p.alpha -= 0.005;
            
            if (p.alpha <= 0) {
                smokeParticles.splice(i, 1);
                continue;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 150, 150, ${p.alpha})`;
            ctx.fill();
        }
    }
    
    // Update candle blow progress
    function updateCandleBlowProgress() {
        for (const candleId in candleStates) {
            const state = candleStates[candleId];
            if (state.blowProgress > 0 && !state.isBlown) {
                state.blowProgress += 0.02;
                if (state.blowProgress >= 1) {
                    state.blowProgress = 1;
                    state.isBlown = true;
                    // Add smoke when candle is fully blown
                    const candle = candlePositions.find(c => c.id === parseInt(candleId));
                    if (candle) {
                        const cosY = Math.cos(angleY);
                        const sinY = Math.sin(angleY);
                        const angleX = 0.3;
                        const cosX = Math.cos(angleX);
                        const sinX = Math.sin(angleX);
                        const scale = Math.min(width, height) / 120;
                        const centerX = width / 2;
                        const centerY = height / 2 - scale * 5;
                        
                        const bottomY = -3;
                        const flameY = bottomY - 6 - 1 - 2;
                        
                        let rx = candle.x * cosY - candle.z * sinY;
                        let rz = candle.z * cosY + candle.x * sinY;
                        
                        let ry = flameY * cosX - rz * sinX;
                        rz = rz * cosX + flameY * sinX;
                        
                        const perspective = 300 / (300 + rz * scale);
                        const pxScreen = centerX + rx * scale * perspective;
                        const pyScreen = centerY + ry * scale * perspective;
                        
                        addSmokeParticles(pxScreen, pyScreen);
                    }
                    
                    // Check if all candles are blown
                    allCandlesBlown = Object.values(candleStates).every(s => s.isBlown);
                    if (allCandlesBlown) {
                        setTimeout(() => {
                            triggerFireworks();
                            // Show lyrics video after fireworks finish
                            setTimeout(() => {
                                showBirthdayMessage = true;
                            }, 2500);
                        }, 500);
                    }
                }
            }
        }
    }
    
    // Add smoke particles at position
    function addSmokeParticles(x, y) {
        for (let i = 0; i < 50; i++) {
            smokeParticles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 1,
                size: Math.random() * 3 + 1,
                alpha: 0.6
            });
        }
    }
    
    // Initialize microphone for blow detection
    async function initMicrophone() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContext.createMediaStreamSource(microphoneStream);
            source.connect(analyser);
            
            isListening = true;
            hint.textContent = '对着麦克风吹气或点击蜡烛吹灭它！';
            processMicrophoneInput();
        } catch (err) {
            console.log('Microphone access denied:', err);
            hint.textContent = '点击蜡烛吹灭它！（麦克风权限被拒绝）';
        }
    }
    
    // Process microphone input to detect blowing
    function processMicrophoneInput() {
        if (!isListening || !analyser) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume in higher frequencies (blow sound)
        let sum = 0;
        let count = 0;
        for (let i = 30; i < dataArray.length; i++) {
            sum += dataArray[i];
            count++;
        }
        const avgVolume = sum / count;
        
        // If volume is high enough, try to blow a candle
        if (avgVolume > 80) {
            tryBlowNearestCandle(avgVolume);
        }
        
        requestAnimationFrame(processMicrophoneInput);
    }
    
    // Try to blow the nearest candle
    function tryBlowNearestCandle(volume) {
        const blowStrength = Math.min((volume - 80) / 50, 1);
        
        let nearestCandle = null;
        let nearestDist = Infinity;
        
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const angleX = 0.3;
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const scale = Math.min(width, height) / 120;
        const centerX = width / 2;
        const centerY = height / 2 - scale * 20;
        
        for (let i = 0; i < candlePositions.length; i++) {
            const candle = candlePositions[i];
            if (candleStates[candle.id].isBlown) continue;
            
            const bottomY = -3;
            const flameY = bottomY - 6 - 1 - 2;
            
            let rx = candle.x * cosY - candle.z * sinY;
            let rz = candle.z * cosY + candle.x * sinY;
            
            let ry = flameY * cosX - rz * sinX;
            rz = rz * cosX + flameY * sinX;
            
            const perspective = 300 / (300 + rz * scale);
            const pxScreen = centerX + rx * scale * perspective;
            const pyScreen = centerY + ry * scale * perspective;
            
            // Distance to center of screen
            const dist = Math.sqrt(Math.pow(pxScreen - width/2, 2) + Math.pow(pyScreen - height/2, 2));
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestCandle = { id: candle.id, x: pxScreen, y: pyScreen };
            }
        }
        
        if (nearestCandle) {
            candleStates[nearestCandle.id].blowProgress += blowStrength * 0.1;
            if (candleStates[nearestCandle.id].blowProgress > 1) {
                candleStates[nearestCandle.id].blowProgress = 1;
            }
        }
    }
    
    // Show lyrics video with surprise effect
    function showLyricsVideo() {
        if (lyricsContainer && !lyricsContainer.classList.contains('visible')) {
            lyricsContainer.classList.remove('hidden');
            // Force reflow
            void lyricsContainer.offsetWidth;
            lyricsContainer.classList.add('visible');
            // Play video - handle mobile autoplay restrictions
            if (lyricsVideo) {
                lyricsVideo.currentTime = 0;
                // Try to play, handle mobile restrictions
                const playPromise = lyricsVideo.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.log('Video play error:', e);
                        // On mobile, show a play button or prompt if needed
                    });
                }
            }
        }
    }

    // Close lyrics video
    function closeLyricsVideo() {
        if (lyricsContainer) {
            lyricsContainer.classList.remove('visible');
            // Pause video
            if (lyricsVideo) {
                lyricsVideo.pause();
            }
            setTimeout(() => {
                lyricsContainer.classList.add('hidden');
            }, 500);
        }
    }
    
    // Close cake modal - also close video if open
    function closeModal() {
        modal.classList.remove('visible');
        // Also close video if it's open
        if (lyricsContainer && lyricsContainer.classList.contains('visible')) {
            closeLyricsVideo();
        }
        setTimeout(() => {
            modal.classList.add('hidden');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            // Stop microphone
            if (microphoneStream) {
                microphoneStream.getTracks().forEach(track => track.stop());
                microphoneStream = null;
            }
            isListening = false;
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
        }, 500); // match transition time
    }
    
    // Handle click/touch event to blow candle
    function handleBlowCandle(event) {
        if (allCandlesBlown) return;
        
        let rect = canvas.getBoundingClientRect();
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
        
        // Find which candle was clicked
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const angleX = 0.3;
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const scale = Math.min(width, height) / 120;
        const centerX = width / 2;
        const centerY = height / 2 - scale * 20;
        
        for (let i = 0; i < candlePositions.length; i++) {
            const candle = candlePositions[i];
            const state = candleStates[candle.id];
            if (state && state.isBlown) continue;
            
            // Project candle position to screen
            const bottomY = -3;
            const flameY = bottomY - 6 - 1 - 2; // approx flame center
            
            // Rotate Y
            let rx = candle.x * cosY - candle.z * sinY;
            let rz = candle.z * cosY + candle.x * sinY;
            
            // Rotate X
            let ry = flameY * cosX - rz * sinX;
            rz = rz * cosX + flameY * sinX;
            
            const perspective = 300 / (300 + rz * scale);
            const pxScreen = centerX + rx * scale * perspective;
            const pyScreen = centerY + ry * scale * perspective;
            
            // Check distance
            const dist = Math.sqrt(Math.pow(clickX - pxScreen, 2) + Math.pow(clickY - pyScreen, 2));
            const hitRadius = 50 * scale / 10;
            
            if (dist < hitRadius) {
                blowCandle(candle.id, clickX, clickY);
                break;
            }
        }
    }
    
    // Handle double click to relight candle
    let lastClickTime = 0;
    let lastClickedCandle = null;
    function handleDoubleClick(event) {
        let rect = canvas.getBoundingClientRect();
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
        
        // Find which candle was clicked
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const angleX = 0.3;
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const scale = Math.min(width, height) / 120;
        const centerX = width / 2;
        const centerY = height / 2 - scale * 20;
        
        for (let i = 0; i < candlePositions.length; i++) {
            const candle = candlePositions[i];
            
            // Project candle position to screen
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
                if (now - lastClickTime < 300 && lastClickedCandle === candle.id) {
                    relightCandle(candle.id);
                }
                lastClickTime = now;
                lastClickedCandle = candle.id;
                break;
            }
        }
    }
    
    // Blow a specific candle
    function blowCandle(candleId, x, y) {
        const state = candleStates[candleId];
        if (state.isBlown) return;
        
        state.blowProgress = 0.5; // Start blowing animation
        
        // Add blow particles
        for (let i = 0; i < 30; i++) {
            blowParticles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3,
                size: Math.random() * 4 + 2,
                alpha: 1
            });
        }
    }
    
    // Relight a candle
    function relightCandle(candleId) {
        const state = candleStates[candleId];
        if (!state.isBlown) return;
        
        state.isBlown = false;
        state.blowProgress = 0;
        allCandlesBlown = false;
        showBirthdayMessage = false;
        
        // Add spark particles
        const candle = candlePositions.find(c => c.id === candleId);
        if (candle) {
            const cosY = Math.cos(angleY);
            const sinY = Math.sin(angleY);
            const angleX = 0.3;
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            const scale = Math.min(width, height) / 90;
            const centerX = width / 2;
            const centerY = height / 2 - scale * 5;
            
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
                blowParticles.push({
                    x: pxScreen,
                    y: pyScreen,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6 - 2,
                    size: Math.random() * 3 + 1,
                    alpha: 1
                });
            }
        }
    }
    
    // Trigger fireworks (redirect to fireworks page or trigger effect)
    function triggerFireworks() {
        // Create some firework-like particles
        for (let j = 0; j < 5; j++) {
            setTimeout(() => {
                const fx = Math.random() * width;
                const fy = Math.random() * height / 2;
                for (let i = 0; i < 80; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 6 + 2;
                    blowParticles.push({
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
    }

    // Modal Controls
    function openModal() {
        modal.classList.remove('hidden');
        // Force reflow to ensure transition works
        void modal.offsetWidth;
        modal.classList.add('visible');
        
        resizeCanvas();
        buildParticles();
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        render();
        
        // Try to initialize microphone
        initMicrophone();
    }



    closeBtn.addEventListener('click', closeModal);
    
    // Close lyrics video button
    if (closeLyricsBtn) {
        closeLyricsBtn.addEventListener('click', closeLyricsVideo);
    }
    
    window.addEventListener('resize', () => {
        if (modal.classList.contains('visible')) {
            resizeCanvas();
        }
    });
    
    // Add blow candle event listeners
    let lastTouchTime = 0;
    canvas.addEventListener('click', (e) => {
        const now = Date.now();
        if (now - lastTouchTime > 300) { // Debounce
            handleBlowCandle(e);
            handleDoubleClick(e);
        }
    });
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTouchTime > 300) { // Debounce
            lastTouchTime = now;
            handleBlowCandle(e);
            handleDoubleClick(e);
        }
    }, { passive: false });
    
    // Show popup on enter
    openModal();
}
