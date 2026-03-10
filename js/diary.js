// Configuration for Supabase (Powerful Backend as a Service)
// 1. Go to https://supabase.com/ and sign up/login (supports GitHub login)
// 2. Create a new project (e.g., "MyDiary")
// 3. In your project dashboard, go to Project Settings > API
// 4. Copy your "Project URL" and "anon public" key and paste them below.

const SUPABASE_URL = 'https://vsdruhuyavrnsivkzwzv.supabase.co'; // 🔴 TODO: Enter your Project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZHJ1aHV5YXZybnNpdmt6d3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDc3NzQsImV4cCI6MjA4ODA4Mzc3NH0.hW9_4qj6xt_JA2psZH9zlzPzv0dO8kO2WdyyJ-k00ok'; // 🔴 TODO: Enter your anon public key

// Check if Cloud is enabled
const isCloudEnabled = SUPABASE_URL && SUPABASE_KEY;

let dbClient = null;
if (isCloudEnabled) {
    // Initialize Supabase client
    // window.supabase is injected by the script tag
    if (window.supabase) {
        dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase Initialized");
    } else {
        console.error("Supabase SDK not loaded properly.");
    }
} else {
    console.log("Supabase not configured. Using LocalStorage.");
}

/*
🔴 IMPORTANT: SETUP STEPS IN SUPABASE DASHBOARD
1. Create a Table:
   - Go to "Table Editor" > "New Table"
   - Name: "diary_entries"
   - Columns:
     - id: int8 (Primary Key, Auto Increment)
     - date: text (e.g., "2026-03-03")
     - content: text
     - image_url: text (optional)
   - Disable RLS (Row Level Security) for simplicity during development, 
     or add policies to allow anonymous inserts/selects.

2. Create a Bucket for Images:
   - Go to "Storage" > "New Bucket"
   - Name: "diary_images"
   - Make it "Public" so you can access image URLs directly.
*/

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timelineContainer = document.getElementById('timeline-container');
    const addPage = document.getElementById('add-page');
    const btnToday = document.getElementById('btn-today');
    const btnBack = document.getElementById('btn-back');
    const form = document.getElementById('add-entry-form');
    const dateInput = document.getElementById('entry-date');
    const contentInput = document.getElementById('entry-content');
    const imageInput = document.getElementById('entry-image');
    const imagePreview = document.getElementById('image-preview');
    const uploadArea = document.getElementById('upload-area');

    // State
    let entries = [];

    // Data Service Abstraction
    const DataService = {
        async loadEntries() {
            if (isCloudEnabled && dbClient) {
                try {
                    const { data, error } = await dbClient
                        .from('diary_entries')
                        .select('*')
                        .order('date', { ascending: false });

                    if (error) throw error;

                    return data.map(item => ({
                        id: item.id,
                        date: item.date,
                        content: item.content,
                        image: item.image_url,
                        created_at: item.created_at || null
                    }));
                } catch (error) {
                    console.error("Supabase Load Error:", error);
                    alert("从云端加载失败，请检查配置。");
                    return [];
                }
            } else {
                return JSON.parse(localStorage.getItem('diaryEntries')) || [];
            }
        },

        async saveEntry(entry) {
            if (isCloudEnabled && dbClient) {
                try {
                    // 1. Upload Image to Storage if exists
                    let imageUrl = null;
                    if (entry.imageFile) {
                        const file = entry.imageFile;
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        const filePath = `uploads/${fileName}`;

                        const { error: uploadError } = await dbClient.storage
                            .from('diary_images')
                            .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        // Get Public URL
                        const { data: urlData } = dbClient.storage
                            .from('diary_images')
                            .getPublicUrl(filePath);

                        imageUrl = urlData.publicUrl;
                    }

                    // 2. Insert into Table
                    const { data, error } = await dbClient
                        .from('diary_entries')
                        .insert([
                            {
                                date: entry.date,
                                content: entry.content,
                                image_url: imageUrl
                            }
                        ])
                        .select();

                    if (error) {
                        console.error("Supabase Error Details:", error);
                        // Check for RLS error
                        if (error.code === '42501') {
                            throw new Error("云端权限不足。请在 Supabase 后台 'Table Editor' -> 'diary_entries' -> 'Add RLS Policy' -> 'Enable read/write for all (anon)'。如果已关闭 RLS，请检查 'Authentication' -> 'Policies' 是否有其他限制。");
                        }
                        throw error;
                    }

                    return data[0];
                } catch (error) {
                    console.error("Supabase Save Error:", error);
                    throw error;
                }
            } else {
                const newEntry = {
                    id: Date.now(),
                    date: entry.date,
                    content: entry.content,
                    image: entry.imagePreviewSrc || null
                };

                const currentEntries = JSON.parse(localStorage.getItem('diaryEntries')) || [];
                currentEntries.unshift(newEntry);
                localStorage.setItem('diaryEntries', JSON.stringify(currentEntries));
                return newEntry;
            }
        }
    };

    // Helper: Format Date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}年${month}月${day}日`;
    }

    // Helper: Sort Entries
    function sortEntries() {
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Render Timeline
    async function refreshTimeline() {
        timelineContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:50px;">加载中...</p>';
        entries = await DataService.loadEntries();

        timelineContainer.innerHTML = '';
        sortEntries();

        if (entries.length === 0) {
            // Add default test data if empty
            entries = [{
                id: 'default-test',
                date: new Date().toISOString().split('T')[0], // Today
                content: '翻身了，再也不是8块钱的参与奖了，元宵快乐！',
                image: 'assets/images/yuanxiao.jpg' // Assuming this path is valid relative to index.html
            }];

            // Only show message if we decide not to show default data, but user asked for default data.
            // If we want to persist it, we should save it, but "display a default test data" usually means just show it.
            // We will let the rendering loop handle it.
        }

        if (entries.length === 0) {
            const msg = isCloudEnabled
                ? '云端还没有记录，快去写下第一篇日记吧~'
                : '还没有记录，快去写下第一篇日记吧~ (当前为本地模式)';
            timelineContainer.innerHTML = `<p style="text-align:center; color:#888; margin-top:50px;">${msg}</p>`;
            return;
        }

        // Add "Now" badge at the top
        const nowDiv = document.createElement('div');
        nowDiv.className = 'timeline-now';
        nowDiv.innerText = 'Now';
        nowDiv.style.cursor = 'pointer';
        nowDiv.addEventListener('click', show3DHeartEffect);
        timelineContainer.appendChild(nowDiv);

        entries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            const positionClass = index % 2 === 0 ? 'left' : 'right';
            entryDiv.className = `entry ${positionClass}`;

            let imageHtml = '';
            if (entry.image) {
                imageHtml = `
                    <div class="image-container">
                        <img src="${entry.image}" alt="Diary Image">
                    </div>
                `;
            }

            const dateObj = new Date(entry.date);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const yearMonth = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

            let hours = '00';
            let minutes = '00';

            // Prefer database created timestamp, otherwise fallback to the saved date string or ID
            const timeSource = entry.created_at || entry.date;

            if (timeSource && typeof timeSource === 'string' && timeSource.includes('T')) {
                const timeObj = new Date(timeSource);
                hours = timeObj.getHours().toString().padStart(2, '0');
                minutes = timeObj.getMinutes().toString().padStart(2, '0');
            } else if (entry.id && typeof entry.id === 'number') {
                const idDate = new Date(entry.id);
                hours = idDate.getHours().toString().padStart(2, '0');
                minutes = idDate.getMinutes().toString().padStart(2, '0');
            } else {
                hours = dateObj.getHours().toString().padStart(2, '0');
                minutes = dateObj.getMinutes().toString().padStart(2, '0');
            }

            entryDiv.innerHTML = `
                <div class="timeline-marker">
                    <img src="assets/images/header-boy.png" alt="Avatar" class="marker-avatar">
                    <div class="marker-day">${day}</div>
                    <div class="marker-month">${yearMonth}</div>
                </div>
                <div class="content">
                    <div class="time-header">
                        <span class="write-down">Write down</span>
                        <span class="time-text">${hours}:${minutes}</span>
                    </div>
                    <div class="text">${entry.content}</div>
                    ${imageHtml}
                </div>
            `;

            timelineContainer.appendChild(entryDiv);
        });

        const totalDiv = document.createElement('div');
        totalDiv.className = 'timeline-total';
        totalDiv.innerHTML = `共 ${entries.length} 个瞬间`;
        timelineContainer.appendChild(totalDiv);
    }

    refreshTimeline();

    // Navigation Logic
    btnToday.addEventListener('click', () => {
        form.reset();
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        imageInput.value = '';
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        addPage.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    btnBack.addEventListener('click', () => {
        addPage.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Image Upload Logic
    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Drag and Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#333';
        uploadArea.style.backgroundColor = '#eee';
    });
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.backgroundColor = 'transparent';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.backgroundColor = 'transparent';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            imageInput.files = e.dataTransfer.files;
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentVal = contentInput.value.trim();
        const dateVal = dateInput.value;
        if (!contentVal || !dateVal) return alert('请填写日期和内容');

        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const dateTimeVal = `${dateVal}T${timeString}`;

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = '保存中...';
        submitBtn.disabled = true;

        try {
            const entryData = {
                date: dateTimeVal,
                content: contentVal,
                imageFile: imageInput.files[0],
                imagePreviewSrc: imagePreview.src && imagePreview.style.display !== 'none' ? imagePreview.src : null
            };
            await DataService.saveEntry(entryData);
            alert('记录成功！');
            addPage.classList.remove('active');
            document.body.style.overflow = '';
            refreshTimeline();
        } catch (error) {
            console.error('Save failed', error);
            alert('保存失败：' + (error.message || '未知错误'));
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // Secret Modal Logic
    const btnSecret = document.getElementById('btn-secret');
    const secretModal = document.getElementById('secret-modal');
    const closeSecret = document.getElementById('close-secret');

    if (btnSecret && secretModal && closeSecret) {
        btnSecret.addEventListener('click', () => {
            secretModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });

        const closeModal = () => {
            secretModal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        closeSecret.addEventListener('click', closeModal);

        // Close when clicking outside the book
        secretModal.addEventListener('click', (e) => {
            if (e.target === secretModal) {
                closeModal();
            }
        });
    }

    // Click Effect Logic
    const clickPhrases = ["勇敢", "快乐", "自信", "搞钱", "乐观", "积极", "进取", "正直", "宽容", "阳光", "坚强", "友善", "爱你"];
    let clickIndex = 0;

    document.addEventListener('click', (e) => {
        // Create span element
        const span = document.createElement('span');
        span.textContent = clickPhrases[clickIndex];
        span.className = 'click-text';

        // Random Color
        const randomColor = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
        span.style.color = randomColor;

        // Position
        span.style.left = `${e.pageX}px`;
        span.style.top = `${e.pageY}px`;

        // Append to body
        document.body.appendChild(span);

        // Remove after animation (1s)
        setTimeout(() => {
            span.remove();
        }, 1000);

        // Update index
        clickIndex = (clickIndex + 1) % clickPhrases.length;
    });

    // Visitor Tracking & Secret Logs Logic
    const secretTrigger = document.getElementById('secret-trigger');
    const visitorModal = document.getElementById('visitor-modal');
    const closeVisitor = document.getElementById('close-visitor');
    const visitorTableBody = document.querySelector('#visitor-table tbody');

    // Pagination Elements
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfoSpan = document.getElementById('page-info');

    let currentPage = 1;
    const pageSize = 10;

    // 1. Track Visitor on Load
    async function trackVisitor() {
        if (!isCloudEnabled || !dbClient) return;

        const hostname = window.location.hostname;
        const isLocal = (hostname === 'localhost' || hostname === '127.0.0.1');

        try {
            // Using get.geojs.io
            const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
            if (!response.ok) throw new Error('IP API Failed');
            const data = await response.json();

            // If local, append a tag to the IP
            const displayIp = isLocal ? `${data.ip} (本地)` : data.ip;

            const logEntry = {
                ip_address: displayIp,
                country: data.country,
                region: data.region,
                isp: data.organization_name,
                visit_time: new Date().toISOString()
            };

            // Insert into Supabase
            const { error } = await dbClient
                .from('visitor_logs')
                .insert([logEntry]);

            if (error) {
                console.error('Visitor Log Error:', error);
                if (error.code === '42P01') {
                    console.warn("Table 'visitor_logs' does not exist. Please create it in Supabase.");
                }
            } else {
                console.log('Visitor tracked successfully.');
            }
        } catch (e) {
            console.error('Tracking failed:', e);
        }
    }

    // Execute tracking
    trackVisitor();

    // Helper: Load Logs for Page
    async function loadVisitorLogs(page) {
        if (!isCloudEnabled || !dbClient) return;

        visitorTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">加载中...</td></tr>';

        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await dbClient
                .from('visitor_logs')
                .select('*', { count: 'exact' })
                .order('visit_time', { ascending: false })
                .range(from, to);

            if (error) throw error;

            visitorTableBody.innerHTML = '';
            if (data.length === 0) {
                visitorTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">暂无访客记录</td></tr>';
                return;
            }

            data.forEach(log => {
                const row = document.createElement('tr');
                const time = new Date(log.visit_time).toLocaleString();

                // Format Location: Country - Region - City
                const locationParts = [log.country, log.region, log.city].filter(Boolean);
                const locationStr = locationParts.join(' - ') || '未知位置';

                row.innerHTML = `
                    <td>${time}</td>
                    <td>${log.ip_address || '-'}</td>
                    <td>${locationStr}</td>
                    <td>${log.isp || '-'}</td>
                `;
                visitorTableBody.appendChild(row);
            });

            // Update Pagination UI
            pageInfoSpan.textContent = `第 ${page} 页`;
            prevPageBtn.disabled = page === 1;

            // Check if there are more pages
            const totalPages = Math.ceil(count / pageSize);
            nextPageBtn.disabled = page >= totalPages;

        } catch (error) {
            console.error("Fetch Logs Error:", error);
            let msg = error.message;
            if (error.code === '42P01') msg = "表 visitor_logs 不存在，请去 Supabase 创建";
            visitorTableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">加载失败: ${msg}</td></tr>`;
        }
    }

    // 2. Secret Trigger Logic
    if (secretTrigger && visitorModal) {
        secretTrigger.addEventListener('click', () => {
            visitorModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            if (isCloudEnabled && dbClient) {
                currentPage = 1; // Reset to first page
                loadVisitorLogs(currentPage);
            } else {
                visitorTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">请先配置 Supabase 连接</td></tr>';
            }
        });

        // Pagination Events
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadVisitorLogs(currentPage);
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                currentPage++;
                loadVisitorLogs(currentPage);
            });
        }

        // Close Logic
        const closeVisitorModalFn = () => {
            visitorModal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        if (closeVisitor) closeVisitor.addEventListener('click', closeVisitorModalFn);
        visitorModal.addEventListener('click', (e) => {
            if (e.target === visitorModal) closeVisitorModalFn();
        });
    }

    // 3D Particle Heart Effect Logic
    function show3DHeartEffect() {
        if (document.getElementById('heart-3d-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'heart-3d-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.cursor = 'pointer';

        // Add a close hint
        const hint = document.createElement('div');
        hint.innerText = '点击任意处关闭';
        hint.style.position = 'absolute';
        hint.style.bottom = '30px';
        hint.style.color = 'rgba(255, 255, 255, 0.5)';
        hint.style.fontSize = '14px';
        hint.style.letterSpacing = '2px';
        overlay.appendChild(hint);

        const canvas = document.createElement('canvas');
        overlay.appendChild(canvas);
        document.body.appendChild(overlay);

        const ctx = canvas.getContext('2d');
        let width = overlay.clientWidth;
        let height = overlay.clientHeight;
        canvas.width = width;
        canvas.height = height;

        window.addEventListener('resize', () => {
            if (!document.getElementById('heart-3d-overlay')) return;
            width = overlay.clientWidth;
            height = overlay.clientHeight;
            canvas.width = width;
            canvas.height = height;
        });

        overlay.addEventListener('click', () => {
            overlay.remove();
        });

        const particles = [];
        const particleCount = 5000;

        for (let i = 0; i < particleCount; i++) {
            let px, py, pz;
            while (true) {
                // 3D心形包围盒粗略在 x:[-1.5, 1.5], y:[-1.5, 1.5], z:[-1.5, 1.5]
                px = (Math.random() - 0.5) * 3;
                py = (Math.random() - 0.5) * 3;
                pz = (Math.random() - 0.5) * 3;

                // 3D 心形不等式公式: (x^2 + 9/4*y^2 + z^2 - 1)^3 - x^2*z^3 - 9/80*y^2*z^3 <= 0
                const a = px * px + 2.25 * py * py + pz * pz - 1;
                const val = a * a * a - px * px * pz * pz * pz - 0.1125 * py * py * pz * pz * pz;

                if (val <= 0) {
                    // 让表面粒子更多，内部粒子略少，显得更有立体光感
                    if (val > -0.2 || Math.random() > 0.6) {
                        break;
                    }
                }
            }

            const sizeScale = 16.0;
            // 数学上的z是向上的，而在屏幕上y是向下的。所以screenY = -z, screenZ = y。
            const targetX = px * sizeScale;
            const targetY = -pz * sizeScale - 5; // 稍微整体上移一点点
            const targetZ = py * sizeScale;

            // 地板散落的初始位置 (形成一个大圆盘区)
            const groundRadius = 20 + Math.random() * 80;
            const groundAngle = Math.random() * Math.PI * 2;
            const startX = Math.cos(groundAngle) * groundRadius;
            const startZ = Math.sin(groundAngle) * groundRadius;
            const startY = 50 + Math.random() * 5; // 固定在底部

            particles.push({
                x: startX,
                y: startY,
                z: startZ,
                targetX: targetX,
                targetY: targetY,
                targetZ: targetZ,
                startX: startX,
                startY: startY,
                startZ: startZ,
                color: 'hsla(' + (340 + Math.random() * 20) + ', 100%, ' + (50 + Math.random() * 30) + '%, ' + (0.5 + Math.random() * 0.4) + ')',
                size: Math.random() * 1.5 + 0.5,
                // 起飞延迟，底部的粒子可能起飞晚一些，或者随机
                delay: Math.random() * 2500,
                flyDuration: 1500 + Math.random() * 1500
            });
        }

        let angleY = 0;
        let angleX = 0;
        const startTime = Date.now();

        function animate() {
            if (!document.getElementById('heart-3d-overlay')) return;
            requestAnimationFrame(animate);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);

            angleY += 0.015;
            angleX = Math.sin(angleY * 0.5) * 0.2;

            const cosY = Math.cos(angleY);
            const sinY = Math.sin(angleY);
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);

            const scale = Math.min(width, height) / 80;
            const centerX = width / 2;
            const centerY = height / 2;

            const beat = 1 + Math.sin(Date.now() * 0.005) * 0.08;
            const timePassed = Date.now() - startTime;

            ctx.globalCompositeOperation = 'lighter';

            particles.forEach(p => {
                // 计算当前动画进度
                let progress = Math.max(0, Math.min(1, (timePassed - p.delay) / p.flyDuration));

                // 缓动曲线 (EaseOutExpo)
                let easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

                // 动态基础位置
                let currBaseX = p.startX + (p.targetX - p.startX) * easeProgress;
                let currBaseY = p.startY + (p.targetY - p.startY) * easeProgress;
                let currBaseZ = p.startZ + (p.targetZ - p.startZ) * easeProgress;

                // 到达顶部后加入呼吸和浮动的效果
                let floatAmt = progress === 1 ? 0.5 : 0;
                p.x = currBaseX + (floatAmt > 0 ? Math.sin(Date.now() * 0.002 + p.targetY) * floatAmt : 0);
                p.y = currBaseY + (floatAmt > 0 ? Math.cos(Date.now() * 0.002 + p.targetX) * floatAmt : 0);
                p.z = currBaseZ;

                let rx = p.x * cosY - p.z * sinY;
                let rz = p.z * cosY + p.x * sinY;

                let ry = p.y * cosX - rz * sinX;
                rz = rz * cosX + p.y * sinX;

                // 只有形成心形后才有明显跳动
                let currentBeat = 1 + (beat - 1) * easeProgress;
                rx *= currentBeat;
                ry *= currentBeat;
                rz *= currentBeat;

                const perspective = 500 / (500 + rz * scale);
                const pxScreen = centerX + rx * scale * perspective;
                const pyScreen = centerY + ry * scale * perspective;

                const rSize = p.size * perspective * currentBeat;

                if (rSize > 0) {
                    ctx.beginPath();
                    ctx.arc(pxScreen, pyScreen, rSize, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                }
            });

            ctx.globalCompositeOperation = 'source-over';
        }

        animate();
    }
});
