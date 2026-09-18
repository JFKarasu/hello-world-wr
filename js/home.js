let role='owner', current='home';
let memories = []; // 改为空数组，由数据库加载
let currentPage = 0; // 当前页码
let hasMore = true; // 是否还有更多数据
const PAGE_SIZE = 10; // 每页数量
let allMemoryDates = []; // 用于日历打点和计算连续天数的全局日期
let globalStats = { totalRecords: 0, totalPhotos: 0, totalSpecial: 0, streak: 0, hasToday: false };
let draftState = { mood: '', weather: '', location: '', imageUrl: '' };
let currentCalendarDate = new Date(); // 用于日历切换月份

const SUPABASE_URL = 'https://vsdruhuyavrnsivkzwzv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZHJ1aHV5YXZybnNpdmt6d3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDc3NzQsImV4cCI6MjA4ODA4Mzc3NH0.hW9_4qj6xt_JA2psZH9zlzPzv0dO8kO2WdyyJ-k00ok';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const demoAccounts = {
  'jiangfei': 'owner',
  'wangrong': 'partner'
};

function inferRoleFromAccount(){
  const accountInput = document.querySelector('#login input:not([type="password"])');
  const passwordInput = document.querySelector('#login input[type="password"]');
  
  const account = accountInput?.value?.trim() || '';
  const password = passwordInput?.value?.trim() || '';
  
  if (password !== 'loveforever') {
    return null; // 表示密码错误
  }
  
  const rememberMe = document.getElementById('rememberMe')?.checked;
  
  if (rememberMe) {
    // 勾选了记住账号，保存到本地
    localStorage.setItem('savedAccount', account);
    localStorage.setItem('savedPassword', password);
    // 同时保存一个模拟的 token/role，用于直接跳过登录页
    localStorage.setItem('userToken', demoAccounts[account]);
  } else {
    // 没勾选，清除本地保存的记录
    localStorage.removeItem('savedAccount');
    localStorage.removeItem('savedPassword');
    localStorage.removeItem('userToken');
  }
  
  return demoAccounts[account] || null; // 如果账号不存在也返回null
}

// 页面加载时恢复保存的账号密码并自动登录
window.addEventListener('DOMContentLoaded', async () => {
  const savedToken = localStorage.getItem('userToken');
  
  if (savedToken) {
    // 如果有 token，直接进入主应用，不再展示登录界面
    role = savedToken;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    Swal.fire({ title: '加载中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    await Promise.all([fetchMemories(), fetchGlobalStats()]);
    render();
    Swal.close();
    return;
  }
  
  // 如果没有 token，但有保存的账号密码，回显在输入框
  const savedAccount = localStorage.getItem('savedAccount');
  const savedPassword = localStorage.getItem('savedPassword');
  const rememberCheckbox = document.getElementById('rememberMe');
  
  if (savedAccount && savedPassword) {
    const accountInput = document.querySelector('#login input:not([type="password"])');
    const passwordInput = document.querySelector('#login input[type="password"]');
    
    if (accountInput) accountInput.value = savedAccount;
    if (passwordInput) passwordInput.value = savedPassword;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
});

async function fetchGlobalStats() {
  try {
    const [datesRes, photosRes, specialRes] = await Promise.all([
      supabaseClient.from('memories').select('created_at').order('created_at', { ascending: false }),
      // Because image_urls is text, we just check if it's not null and not empty
      supabaseClient.from('memories').select('*', { count: 'exact', head: true }).not('image_urls', 'is', null).neq('image_urls', ''),
      supabaseClient.from('memories').select('*', { count: 'exact', head: true }).eq('is_special', true)
    ]);

    if (datesRes.data) {
      allMemoryDates = datesRes.data.map(m => m.created_at ? new Date(m.created_at) : new Date());
      globalStats.totalRecords = allMemoryDates.length;
      
      const uniqueDates = [...new Set(allMemoryDates.map(d => {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      }))].sort((a, b) => b - a);
      
      let streak = 0;
      if (uniqueDates.length > 0) {
        streak = 1;
        const oneDay = 24 * 60 * 60 * 1000;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const diff = Math.round((uniqueDates[i] - uniqueDates[i+1]) / oneDay);
          if (diff === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
      globalStats.streak = streak;

      const now = new Date();
      const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      globalStats.hasToday = uniqueDates.length > 0 && uniqueDates[0] === todayTime;
    }

    globalStats.totalPhotos = photosRes.count || 0;
    globalStats.totalSpecial = specialRes.count || 0;
  } catch (err) {
    console.error("加载统计数据失败:", err);
  }
}

async function fetchMemories(append = false) {
  try {
    const from = currentPage * PAGE_SIZE;
    const to = (currentPage + 1) * PAGE_SIZE - 1;
    
    const { data, error } = await supabaseClient
      .from('memories')
      .select('*, reactions(*)')
      .order('created_at', { ascending: false })
      .range(from, to);
      
    if (error) {
      console.error("Supabase Select Error:", error);
      hasMore = false;
      if (!append) memories = [];
      return;
    }
    
    if (data && data.length > 0) {
      const newMemories = data.map(m => {
        if (m.created_at) {
          const d = new Date(m.created_at);
          m.date_str = `${d.getMonth() + 1}月${d.getDate()}日`;
        }
        return m;
      });
      if (append) {
        memories = [...memories, ...newMemories];
      } else {
        memories = newMemories;
      }
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
      if (!append) memories = [];
    }
  } catch (err) {
    console.error("加载数据失败:", err);
    hasMore = false;
    if (!append) memories = [];
  }
}

async function enter(){
  const assignedRole = inferRoleFromAccount();
  
  if (!assignedRole) {
    Swal.fire({
      icon: 'error',
      title: '哎呀',
      text: '账号或密码错误！',
      confirmButtonColor: '#d46373'
    });
    return;
  }
  
  Swal.fire({ title: '加载中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
  
  role = assignedRole;
  currentPage = 0; // 重置页码
  hasMore = true; // 重置更多数据状态
  memories = []; // 清空现有数据
  await fetchMemories();
  
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  render();
  
  Swal.close();
}

async function loadMoreMemories() {
  if (!hasMore) return; // 没有更多数据则不执行
  currentPage++;
  Swal.fire({ title: '加载更多...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
  await fetchMemories(true); // 传入 true 表示追加数据
  render(); // 重新渲染页面以显示新数据
  Swal.close();
}

function navItem(id,label,icon){return `<button class="nav-btn ${current===id?'active':''}" onclick="go('${id}')"><span class="icon">${icon}</span><span class="label">${label}</span></button>`}
function go(id){current=id;render()}
function render(){
 const nav=role==='owner'
 ? [navItem('home','首页','🏠'),navItem('records','记录','📝'),navItem('timeline','时间轴','⏳'),navItem('story','故事','📖'),navItem('settings','设置','⚙️')]
 : [navItem('home','首页','🏠'),navItem('timeline','时间轴','⏳'),navItem('story','故事','📖'),navItem('settings','设置','⚙️')];
 document.getElementById('nav').innerHTML=nav.join('');
 
 const profileName = role === 'owner' ? '只想你' : '她';
 const avatarSrc = role === 'owner' ? 'assets/images/jiangfei.png' : 'assets/images/wangrong.png';
 document.getElementById('profileName').textContent = profileName;
 document.getElementById('profileAvatar').src = avatarSrc;
 
 document.getElementById('bottomnav').innerHTML=nav.join('');
 
 let c='';
 if(current==='home') c=home();
 if(current==='records') c=records();
 if(current==='timeline') c=timeline();

 if(current==='story') c=story();
 if(current==='settings') c=settings();
 document.getElementById('content').innerHTML=c;
}
function hero(){
  const now = new Date();
  const currentYear = now.getFullYear();
  // 今年的七夕（2026年是8月19日，我们假设这里统一用8月19日作为纪念日基准）
  const start = new Date(currentYear, 7, 19); // 8月19日
  // 如果当前时间还不到今年的七夕，那就从去年的七夕算起
  if (now < start) {
    start.setFullYear(currentYear - 1);
  }
  const end = new Date(start.getFullYear() + 1, 7, 19);
  
  const daysPassed = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  // 避免天数计算出现负数或者0的问题，使用浮点数计算确保精度
  const percent = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
  const count = globalStats.totalRecords; // 使用全局总记录数
  
  // 使用全局状态判断今天是否想念
  const heartColor = globalStats.hasToday ? '#d46373' : '#ccc';

  return `<section class="hero">
  <div style="position:relative;z-index:2">
    <div class="sub">${start.getFullYear()}.08.19 — ${end.getFullYear()}.08.19</div>
    <h1>想你的365天</h1>
    <p>从今年七夕开始，<br>记录每一天想你的瞬间，<br>直到下一次七夕。</p>
  </div>
  <div class="hero-art"><div class="lamp"></div><div class="book"></div></div>
</section>
<div class="stats">
 <div class="stat"><b>${daysPassed}</b><span>正在走过的第几天</span></div>
 <div class="stat"><b>${count}</b><span>已经留下的想念</span></div>
 <div class="stat"><b>${percent}%</b><span>这一年的旅程</span></div>
 <div class="stat"><b style="color:${heartColor};font-size:20px;">♥</b><span>今天也在想她</span></div>
</div>`;
}
async function saveMemory() {
  const titleInput = document.querySelector('#memory-title');
  const textarea = document.querySelector('.write textarea');
  
  const title = titleInput ? titleInput.value.trim() : '日常想念';
  const content = textarea.value.trim();
  
  if (!content) {
    Swal.fire({
      icon: 'warning',
      text: '请写点什么吧~',
      confirmButtonColor: '#d46373'
    });
    return;
  }
  
  const dateObj = new Date();
  const dateStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
  const isoDate = dateObj.toISOString();
  
  Swal.fire({ title: '保存中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

  try {
    const payload = { 
      title: title || '日常想念',
      date_str: dateStr, // 如果后台的 date_str 被建成了 timestamp 类型，这里依然会报错。如果是 text 就没问题。
      content: content,
      mood: draftState.mood || 'happy',
      weather: draftState.weather || '',
      location: draftState.location || '',
      is_special: false
    };
    
    if (draftState.imageUrl) {
      payload.image_urls = draftState.imageUrl;
    }
    
    const { error } = await supabaseClient
      .from('memories')
      .insert([payload]);
      
    if (error) throw error;
    
    Swal.fire({
      icon: 'success',
      title: '保存成功',
      text: '这一刻已经被好好保存 ♥',
      confirmButtonColor: '#d46373',
      timer: 2000,
      showConfirmButton: false
    });
    
    textarea.value = '';
    if (titleInput) titleInput.value = '';
    
    // 清空草稿状态
    draftState = { mood: '', weather: '', location: '', imageUrl: '' };
    updateChips();
    
    // 重新拉取数据并重新渲染整个内容区
    await fetchMemories();
    render();
    
    // 如果当前是在首页，需要强制刷新下首页特定的组件（因为 render() 会覆盖 content）
    if (current === 'home') {
      document.getElementById('content').innerHTML = home();
    }
    
  } catch (err) {
      console.error("保存失败:", err);
      Swal.fire({
        icon: 'error',
        title: '保存失败',
        text: '请检查网络或数据库配置',
        confirmButtonColor: '#d46373'
      });
    } finally {
      const btn = document.querySelector('.write-actions .primary');
      if (btn) {
        btn.innerText = '保存今天的想念 ♥';
        btn.disabled = false;
      }
    }
}

async function setMood() {
  const moods = ['😊 开心', '😂 搞笑', '🥺 感动', '😭 难过', '😡 生气', '😌 平静'];
  const { value: m } = await Swal.fire({
    title: '选择心情',
    input: 'select',
    inputOptions: {
      '1': '😊 开心',
      '2': '😂 搞笑',
      '3': '🥺 感动',
      '4': '😭 难过',
      '5': '😡 生气',
      '6': '😌 平静'
    },
    inputPlaceholder: '请选择',
    showCancelButton: true,
    confirmButtonColor: '#d46373'
  });
  if (m && moods[m-1]) { draftState.mood = moods[m-1]; updateChips(); }
}

async function setWeather() {
  const weathers = ['☀️ 晴天', '⛅️ 多云', '☁️ 阴天', '🌧️ 下雨', '❄️ 下雪'];
  const { value: w } = await Swal.fire({
    title: '选择天气',
    input: 'select',
    inputOptions: {
      '1': '☀️ 晴天',
      '2': '⛅️ 多云',
      '3': '☁️ 阴天',
      '4': '🌧️ 下雨',
      '5': '❄️ 下雪'
    },
    inputPlaceholder: '请选择',
    showCancelButton: true,
    confirmButtonColor: '#d46373'
  });
  if (w && weathers[w-1]) { draftState.weather = weathers[w-1]; updateChips(); }
}

async function askLocation(titleText = '请输入地点') {
  const { value: loc } = await Swal.fire({
    title: titleText,
    input: 'text',
    showCancelButton: true,
    confirmButtonColor: '#d46373'
  });
  if (loc) { draftState.location = `📍 ${loc}`; updateChips(); }
}

function setLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        Swal.fire({ title: '获取定位中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=zh`);
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision || '未知城市';
        draftState.location = `📍 ${city}`;
        updateChips();
        Swal.close();
      } catch (e) {
        Swal.close();
        askLocation('定位失败，请手动输入城市：');
      }
    }, err => {
      askLocation('定位权限被拒绝，请手动输入城市：');
    });
  } else {
    askLocation('浏览器不支持定位，请输入城市：');
  }
}

// Helper function to convert dataURL to Blob
function dataURLtoBlob(dataurl) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
}

function triggerFixLegacyImage(memoryId) {
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      Swal.fire({ title: '修复图片中...', text: '正在上传新图片并更新记录', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          const blob = dataURLtoBlob(compressedBase64);
          const fileName = `fixed-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;

          try {
            // 1. 上传新图片到 Storage
            const { error: uploadError } = await supabaseClient.storage
              .from('memory-images')
              .upload(fileName, blob, { contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            // 2. 获取新的公共 URL
            const { data: publicUrlData } = supabaseClient.storage
              .from('memory-images')
              .getPublicUrl(fileName);
            
            const newImageUrl = publicUrlData.publicUrl;

            // 3. 更新数据库，用新的 URL 替换旧的 Base64 字符串
            const { error: updateError } = await supabaseClient
              .from('memories')
              .update({ image_urls: newImageUrl })
              .eq('id', memoryId);

            if (updateError) throw updateError;

            // 4. 成功后重新拉取数据并刷新页面
            Swal.fire({ icon: 'success', title: '修复成功！', timer: 1500, showConfirmButton: false });
            
            currentPage = 0; // 重置分页
            await fetchMemories();
            render();

          } catch (err) {
            console.error("修复图片失败:", err);
            Swal.fire({ icon: 'error', title: '修复失败', text: '请检查网络或 Storage 配置', confirmButtonColor: '#d46373' });
          }
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

function triggerImageUpload() {
  let input = document.getElementById('image-upload-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'image-upload-input';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        Swal.fire({ title: '上传图片中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        const reader = new FileReader();
        reader.onload = (evt) => {
          // 引入 Canvas 进行前端压缩
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // 限制最大宽度
            const MAX_HEIGHT = 800; // 限制最大高度
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 将图片压缩为 JPEG，质量设为 0.8
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            const blob = dataURLtoBlob(compressedBase64);
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;

            try {
              // 上传到 Supabase Storage
              const { data, error } = await supabaseClient.storage
                .from('memory-images')
                .upload(fileName, blob, {
                  contentType: 'image/jpeg'
                });

              if (error) {
                throw error;
              }

              // 获取公共 URL
              const { data: publicUrlData } = supabaseClient.storage
                .from('memory-images')
                .getPublicUrl(fileName);

              draftState.imageUrl = publicUrlData.publicUrl;
              updateChips();
              Swal.close();
            } catch (err) {
              console.error("上传图片失败:", err);
              Swal.fire({
                icon: 'error',
                title: '上传失败',
                text: '请检查网络或 Storage 配置',
                confirmButtonColor: '#d46373'
              });
            }
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    document.body.appendChild(input);
  }
  input.click();
}

function clearDraft(key) {
  if (key === 'image') draftState.imageUrl = '';
  if (key === 'mood') draftState.mood = '';
  if (key === 'weather') draftState.weather = '';
  if (key === 'location') draftState.location = '';
  updateChips();
}

function updateChips() {
  const previewContainer = document.getElementById('draft-preview');
  if (!previewContainer) return;
  
  let html = '';
  if (draftState.imageUrl) {
    html += `<div style="position:relative; display:inline-block; margin-right: 10px;">
               <img src="${draftState.imageUrl}" style="height:80px; border-radius:8px; object-fit:cover; border: 1px solid #eee;">
               <button onclick="clearDraft('image')" style="position:absolute; top:-6px; right:-6px; background:#333; color:#fff; border:none; border-radius:50%; width:20px; height:20px; line-height:18px; text-align:center; font-size:14px; cursor:pointer; padding:0;">×</button>
             </div>`;
  }
  if (draftState.mood) {
    html += `<span style="display:inline-flex; align-items:center; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:bold; background:#fff0f5; color:#e83e8c; border:1px solid #fbcfe8; margin-right: 8px;">${draftState.mood} <b onclick="clearDraft('mood')" style="margin-left:8px; cursor:pointer; font-weight:normal; opacity:0.6;">✖</b></span>`;
  }
  if (draftState.weather) {
    html += `<span style="display:inline-flex; align-items:center; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:bold; background:#e0f7fa; color:#00838f; border:1px solid #b2ebf2; margin-right: 8px;">${draftState.weather} <b onclick="clearDraft('weather')" style="margin-left:8px; cursor:pointer; font-weight:normal; opacity:0.6;">✖</b></span>`;
  }
  if (draftState.location) {
    html += `<span style="display:inline-flex; align-items:center; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:bold; background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; margin-right: 8px;">${draftState.location} <b onclick="clearDraft('location')" style="margin-left:8px; cursor:pointer; font-weight:normal; opacity:0.6;">✖</b></span>`;
  }
  
  previewContainer.innerHTML = html;
}

function home(){
if(role==='partner') return `${hero()}<div class="grid">
<div><div class="card"><h2>今天的信</h2><div class="sub">他今天留给你的一个瞬间</div><div style="margin-top:20px;padding:22px;background:#fff5f5;border-radius:18px;line-height:1.9">${memories.length > 0 ? memories[0].content : '今天还没有新的想念。'}</div><button class="primary" style="margin-top:15px" onclick="go('timeline')">打开完整的想念 →</button></div></div>
<div>${recent()}</div></div>`;
setTimeout(updateChips, 0); // 确保渲染后更新chips状态
return `${hero()}<div class="grid"><div>${calendar()}<div class="card" style="margin-top:18px"><h2>想你小贴士</h2><p style="line-height:1.8;color:#765a60">今天不要只写“我想你”。<br>写一个让你突然想起她的具体瞬间。</p></div></div><div><div class="card"><h2>今天想她的瞬间 <span class="sub" style="float:right">记录当下</span></h2><div class="write"><input id="memory-title" type="text" placeholder="给这个瞬间起个标题..." style="width:100%; border:none; outline:none; font-size:16px; font-weight:bold; margin-bottom:10px; background:transparent; padding: 5px 0;"><textarea placeholder="今天发生了什么，让你突然想起了她？"></textarea><div id="draft-preview" style="display:flex; flex-wrap:wrap; margin-top:10px; margin-bottom:10px; min-height: 5px;"></div><div class="tools"><button id="chip-mood" class="chip" onclick="setMood()">😊 心情</button><button id="chip-image" class="chip" onclick="triggerImageUpload()">📷 图片</button><button id="chip-weather" class="chip" onclick="setWeather()">☀️ 天气</button><button id="chip-location" class="chip" onclick="setLocation()">📍 地点</button></div><div class="write-actions"><span class="sub">想你的瞬间</span><button class="primary" onclick="saveMemory()">保存今天的想念 ♥</button></div></div></div>${recent()}</div></div>`;
}
function changeMonth(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
  render(); // 重新渲染日历（如果是home或records页面）
}

function calendar(){
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const now = new Date();
  const today = (now.getFullYear() === year && now.getMonth() === month) ? now.getDate() : null;
  
  // 找出在这个月有记录的具体日子（使用全局的所有记录日期）
  const memoryDays = allMemoryDates
    .filter(d => d.getFullYear() === year && d.getMonth() === month)
    .map(d => d.getDate());
    
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, ...
  
  let daysHtml = '';
  // Add empty divs for the days before the 1st of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysHtml += `<div class="day empty"></div>`;
  }

  // Add the actual days of the month
  daysHtml += Array.from({length: daysInMonth}, (_, i) => {
    let d = i + 1;
    let isDot = memoryDays.includes(d) ? 'dot ' : '';
    let isToday = d === today ? 'today' : '';
    return `<div class="day ${isDot}${isToday}">${d}</div>`;
  }).join('');
  
  // 注意去掉了这里的外层 margin，由父容器统一控制
  return `<div class="card calendar-card"><div class="calendar-head"><button onclick="changeMonth(-1)">‹</button><b>${year}年${month + 1}月</b><button onclick="changeMonth(1)">›</button></div><div class="week">${['日','一','二','三','四','五','六'].map(x=>`<div>${x}</div>`).join('')}</div><div class="days">${daysHtml}</div><button style="margin-top:15px;width:100%;padding:11px;border-radius:12px;background:#fff0f2;color:#d46373" onclick="go('records')">查看全部记录</button></div>`;
}
function viewImage(src) {
  Swal.fire({
    imageUrl: src,
    imageAlt: '图片预览',
    showConfirmButton: false,
    showCloseButton: true,
    customClass: {
      image: 'preview-image'
    },
    width: 'auto',
    padding: '1em',
    backdrop: `rgba(0,0,0,0.8)`
  });
}

function renderMemoryMeta(m) {
  let html = '';
  // Handle image_urls properly since it might be a single raw URL string now, 
  // or a legacy JSON string/array
  let images = m.image_urls;
  let imgUrl = null;

  if (typeof images === 'string') {
    if (images.startsWith('http') || images.startsWith('data:image')) {
      // It's a raw URL or raw Base64 string
      imgUrl = images;
    } else {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imgUrl = parsed[0];
        } else if (typeof parsed === 'string') {
          imgUrl = parsed;
        }
      } catch (e) {
        // Fallback, assume it's just a raw string
        imgUrl = images;
      }
    }
  } else if (Array.isArray(images) && images.length > 0) {
    imgUrl = images[0];
  }
  
  if (imgUrl) {
    // 判断是否为旧版的 Base64 数据 (以 data:image 开头，且特别长)
    if (imgUrl.startsWith('data:image') && imgUrl.length > 1000) {
      html += `<div style="margin-top:10px; padding: 12px; background: #fff3f4; border-radius: 8px; border: 1px dashed #f4dedf;">
                 <div style="font-size: 13px; color: #8b6a70; margin-bottom: 8px;">这是一条包含旧版超大格式图片的记录，会导致加载缓慢。</div>
                 <button class="chip" style="background: #f47f91; color: #fff; border: none; padding: 6px 12px;" onclick="triggerFixLegacyImage(${m.id})">📸 重新上传图片修复</button>
               </div>`;
    } else {
      html += `<div style="margin-top:10px;"><img src="${imgUrl}" onclick="viewImage('${imgUrl}')" style="max-width:50%; height:auto; border-radius:8px; border:1px solid #eee; cursor:pointer;"></div>`;
    }
  }
  let tags = '';
  if (m.mood) tags += `<span style="display:inline-block; font-size:12px; background:#fff0f5; color:#e83e8c; padding:4px 10px; border-radius:12px; margin-right:8px; margin-top:8px; border:1px solid #fbcfe8;">${m.mood}</span>`;
  if (m.weather) tags += `<span style="display:inline-block; font-size:12px; background:#e0f7fa; color:#00838f; padding:4px 10px; border-radius:12px; margin-right:8px; margin-top:8px; border:1px solid #b2ebf2;">${m.weather}</span>`;
  if (m.location) tags += `<span style="display:inline-block; font-size:12px; background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:12px; margin-right:8px; margin-top:8px; border:1px solid #c8e6c9;">${m.location}</span>`;
  if (tags) {
    html += `<div>${tags}</div>`;
  }
  return html;
}

function recent(){
  // 在"最近的想念"中，我们展示当前已加载的所有数据。
  // 如果想限制这里的高度，可以使用 memories.slice(0, currentPage * PAGE_SIZE + PAGE_SIZE) 
  // 但既然已经有了分页，直接 map 现有的 memories 即可
  const recentMemoriesHtml = memories.map((m,i)=>`<div class="memory"><div class="date"><div>${m.date_str}</div><div class="heartline"></div></div><div><h3>${m.title || '日常想念'}</h3><p>${m.content}</p>${renderMemoryMeta(m)}</div></div>`).join('');
  
  let loadMoreButtonHtml = '';
  if (hasMore) {
    loadMoreButtonHtml = `<button class="primary" style="width:100%;padding:11px;border-radius:12px;background:#fff0f2;color:#d46373; margin-top: 15px;" onclick="loadMoreMemories()">加载更多 ♥</button>`;
  }
  
  return `<div class="card timeline"><h2>最近的想念 <span class="sub" style="float:right; cursor:pointer;" onclick="go('timeline')">查看时间轴 →</span></h2>${recentMemoriesHtml}${loadMoreButtonHtml}</div>`}
function records(){
  const totalRecords = globalStats.totalRecords;
  const totalPhotos = globalStats.totalPhotos;
  const totalSpecial = globalStats.totalSpecial;
  const streak = globalStats.streak;
  
  // 给左侧的日历和右侧的内容区分别加上 height: max-content 或者去除外边距
  return `<div class="page-title">我的记录</div><div class="page-sub">一年里的每一个小瞬间，都值得被留下。</div>
  <div class="grid" style="align-items: start;">
    <div style="height: max-content;">${calendar()}</div>
    <div style="height: max-content;">
      ${recent()}
      <div class="card" style="margin-top:18px">
        <h2>记录统计</h2>
        <div class="stats" style="margin-top:0">
          <div class="stat"><b>${totalRecords}</b><span>已记录</span></div>
          <div class="stat"><b>${totalPhotos}</b><span>照片</span></div>
          <div class="stat"><b>${totalSpecial}</b><span>特别想念</span></div>
          <div class="stat"><b>${streak}</b><span>连续记录</span></div>
        </div>
      </div>
    </div>
  </div>`;
}
function timeline(){
  const timelineMemoriesHtml = memories.map((m) => {
    let reactionHtml = '';
    if (m.reactions && m.reactions.length > 0) {
      reactionHtml = `<div style="margin-top:12px; color: #d46373; font-size: 14px;">${m.reactions.map(r => `<span style="background: #fff0f2; padding: 4px 10px; border-radius: 12px; margin-right: 8px;">${r.reaction_type}</span>`).join('')}</div>`;
    } else if (role === 'partner') {
      reactionHtml = `<div style="margin-top:12px" id="reaction-container-${m.id}"><button class="chip" onclick="addReaction(${m.id}, '♥ 收到啦')">♥ 收到啦</button><button class="chip" onclick="addReaction(${m.id}, '我也想你')">我也想你</button></div>`;
    }
    return `<div class="memory"><div class="date"><div>${m.date_str}</div><div class="heartline"></div></div><div><h3>${m.title || '日常想念'}</h3><p>${m.content}</p>${renderMemoryMeta(m)}${reactionHtml}</div></div>`;
  }).join('');

  let loadMoreButtonHtml = '';
  if (hasMore) {
    loadMoreButtonHtml = `<button class="primary" style="width:100%;padding:11px;border-radius:12px;background:#fff0f2;color:#d46373; margin-top: 15px;" onclick="loadMoreMemories()">加载更多 ♥</button>`;
  }

  return `<div class="page-title">${role==='owner'?'我们的想念时间轴':'他留给你的时间轴'}</div><div class="page-sub">${role==='owner'?'把这一年慢慢写成一本书。':'从第一天开始，重新走一遍这一年的想念。'}</div><div class="card">${timelineMemoriesHtml}${loadMoreButtonHtml}</div>`;
}

async function addReaction(memoryId, reactionType) {
  Swal.fire({ title: '发送中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
  
  try {
    const { error } = await supabaseClient
      .from('reactions')
      .insert([{ 
        memory_id: memoryId, 
        reaction_type: reactionType,
        user_id: 'partner' // mock user_id for now
      }]);
      
    if (error) throw error;
    
    // 重新拉取数据并渲染页面
    await fetchMemories();
    render();
    Swal.close();
  } catch (err) {
    console.error("互动失败:", err);
    Swal.fire({
      icon: 'error',
      title: '互动失败',
      text: '请检查网络或数据库配置',
      confirmButtonColor: '#d46373'
    });
  }
}
function story(){
  return `<div class="page-title">我们的故事</div>
  <div class="page-sub">那些只有我们知道的秘密和闪闪发光的日子。</div>
  <div class="card" style="margin-bottom:20px">
    <h2>特别的日期</h2>
    <div style="margin-top:15px; display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid #f0f0f0;">
        <div>
          <div style="font-weight:bold; color:#d46373; font-size:15px;">🌹 七夕情人节</div>
          <div style="font-size:13px; color:#888; margin-top:4px;">想你的365天，从今天开始</div>
        </div>
        <div style="color:#333; align-self:center; font-weight:bold;">2026.08.19</div>
      </div>
      <div style="display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid #f0f0f0;">
        <div>
          <div style="font-weight:bold; color:#d46373; font-size:16px;">🎂 她的生日</div>
          <div style="font-size:13px; color:#888; margin-top:4px;">为你准备的专属惊喜</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="color:#333; font-weight:bold; font-size:14px;">2026.07.15</div>
          <button class="chip" style="margin:0;" onclick="window.location.href='old_index.html'">打开惊喜</button>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid #f0f0f0;">
        <div>
          <div style="font-weight:bold; color:#d46373; font-size:16px;">🎆 除夕跨年</div>
          <div style="font-size:13px; color:#888; margin-top:4px;">想和你一起看的新年烟花</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="color:#333; font-weight:bold; font-size:14px;">2026.02.16</div>
          <button class="chip" style="margin:0;" onclick="window.location.href='fireworks.html'">看烟花</button>
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <h2>我们的暗号</h2>
    <p style="color:#666; line-height:1.8; margin-top:10px;">
      <b>“早点睡吧”</b> = 内个这个或那个<br>
    </p>
  </div>`;
}
function logout() {
  Swal.fire({
    title: '退出登录?',
    text: "退出后需要重新输入账号密码",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d46373',
    cancelButtonColor: '#ccc',
    confirmButtonText: '确定退出',
    cancelButtonText: '取消'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('userToken');
      // 可以选择保留账号密码方便下次登录，或者一并清除
      // localStorage.removeItem('savedAccount');
      // localStorage.removeItem('savedPassword');
      
      // 恢复页面状态
      document.getElementById('app').classList.add('hidden');
      document.getElementById('login').classList.remove('hidden');
      
      // 重置状态
      current = 'home';
      memories = [];
    }
  });
}

function settings(){return `<div class="page-title">设置</div><div class="page-sub">让这个小世界只属于你们。</div>
<div class="card settings" style="margin-bottom: 20px;">
  <div class="setting-row"><div><b>每日提醒</b><div class="sub">提醒自己留下今天的想念</div></div><div class="switch"></div></div>
  <div class="setting-row"><div><b>私密模式</b><div class="sub">草稿默认只有自己可见</div></div><div class="switch"></div></div>
  <div class="setting-row"><div><b>纪念日</b><div class="sub">2027年2月14日 · 一年后的情人节</div></div><span>♡</span></div>
  <div class="setting-row" style="border-bottom:none;"><div><b>关系身份</b><div class="sub">${role==='owner'?'记录的人':'收到的人'}</div></div><span>›</span></div>
</div>
<div class="card settings" style="padding: 0; text-align: center; overflow: hidden;">
  <button style="width: 100%; padding: 18px; background: transparent; color: #d46373; border: none; font-size: 16px; font-weight: bold; cursor: pointer;" onclick="logout()">退出登录</button>
</div>`}
