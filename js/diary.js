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
                        image: item.image_url
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

            entryDiv.innerHTML = `
                <div class="content">
                    <span class="date">${formatDate(entry.date)}</span>
                    <div class="text">${entry.content}</div>
                    ${imageHtml}
                </div>
            `;
            
            timelineContainer.appendChild(entryDiv);
        });
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

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = '保存中...';
        submitBtn.disabled = true;
        
        try {
            const entryData = {
                date: dateVal,
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
});
