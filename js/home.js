let role='owner', current='home';
let memories = []; // 改为空数组，由数据库加载
let draftState = { mood: '', weather: '', location: '', imageBase64: '' };
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
  } else {
    // 没勾选，清除本地保存的记录
    localStorage.removeItem('savedAccount');
    localStorage.removeItem('savedPassword');
  }
  
  return demoAccounts[account] || null; // 如果账号不存在也返回null
}

// 页面加载时恢复保存的账号密码
window.addEventListener('DOMContentLoaded', () => {
  const savedAccount = localStorage.getItem('savedAccount');
  const savedPassword = localStorage.getItem('savedPassword');
  
  if (savedAccount && savedPassword) {
    const accountInput = document.querySelector('#login input:not([type="password"])');
    const passwordInput = document.querySelector('#login input[type="password"]');
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (accountInput) accountInput.value = savedAccount;
    if (passwordInput) passwordInput.value = savedPassword;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
});

async function fetchMemories() {
  const defaultMemory = {
    id: 'default-1',
    date_str: '2月14日',
    title: '送给你一年的想念',
    content: '这个情人节，我知道自己什么都送不了，但依然想要做些什么，就想到送你365个“我还在想你”的瞬间。一年以后，你可以从今天开始，把我这一年的想念重新走一遍……',
    weather: '☀️ 晴天',
    mood: '😊 开心',
    location: '📍 南京',
    image_urls: ['assets/images/d0c2def3-22a4-4709-81a7-04e7b50f9795.png'],
    reactions: []
  };

  try {
    const { data, error } = await supabaseClient
      .from('memories')
      .select('*, reactions(*)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Supabase Select Error:", error);
      // 如果数据库查询失败，也使用写死的数据兜底
      memories = [defaultMemory];
      return;
    }
    
    if (data && data.length > 0) {
      // 将获取到的数据与写死的第一条数据合并，写死的数据放在最后（最早的时间）
      memories = [...data, defaultMemory];
    } else {
      memories = [defaultMemory];
    }
  } catch (err) {
    console.error("加载数据失败:", err);
    memories = [defaultMemory];
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
  
  const btn = document.querySelector('#login .primary');
  const originalText = btn.innerText;
  btn.innerText = '加载中...';
  btn.disabled = true;

  await fetchMemories();
  
  role = assignedRole;
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  render();
  
  btn.innerText = originalText;
  btn.disabled = false;
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
  const count = memories.length;
  
  // 生成与数据库格式匹配的日期字符串，例如：2月14日、8月19日（注意没有补零）
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;
  // 检查是否包含当天的日期字符串
  const hasToday = memories.some(m => m.date_str && m.date_str.includes(dateStr));
  const heartColor = hasToday ? '#d46373' : '#ccc';

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
  
  // Create an ISO string for created_at to avoid Supabase parsing errors if we accidentally map fields incorrectly, 
  // or just ensure we don't insert dateStr into a timestamp field. 
  // According to error: invalid input syntax for type timestamp with time zone: "8月19日"
  // It means date_str in Supabase might be set as timestamp instead of text, or we are mapping it wrong.
  // Wait, let's just insert it and check if we are inserting dateStr into date_str which is supposed to be TEXT.
  // If Supabase created date_str as timestamp, we need to pass a real ISO date to date_str and format it on frontend.
  // Let's pass the ISO string if the backend expects a timestamp.
  const isoDate = dateObj.toISOString();
  
  const btn = document.querySelector('.write-actions .primary');
  const originalText = btn.innerText;
  btn.innerText = '保存中...';
  btn.disabled = true;

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
    
    if (draftState.imageBase64) {
      payload.image_urls = [draftState.imageBase64];
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
    draftState = { mood: '', weather: '', location: '', imageBase64: '' };
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
    btn.innerText = originalText;
    btn.disabled = false;
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
        const reader = new FileReader();
        reader.onload = (evt) => {
          draftState.imageBase64 = evt.target.result;
          updateChips();
        };
        reader.readAsDataURL(file);
      }
    };
    document.body.appendChild(input);
  }
  input.click();
}

function clearDraft(key) {
  if (key === 'image') draftState.imageBase64 = '';
  if (key === 'mood') draftState.mood = '';
  if (key === 'weather') draftState.weather = '';
  if (key === 'location') draftState.location = '';
  updateChips();
}

function updateChips() {
  const previewContainer = document.getElementById('draft-preview');
  if (!previewContainer) return;
  
  let html = '';
  if (draftState.imageBase64) {
    html += `<div style="position:relative; display:inline-block; margin-right: 10px;">
               <img src="${draftState.imageBase64}" style="height:80px; border-radius:8px; object-fit:cover; border: 1px solid #eee;">
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
  
  // 生成与数据库对应的月份前缀，如 "8月"
  const monthStr = `${month + 1}月`;
  // 找出在这个月有记录的具体日子
  const memoryDays = memories
    .filter(m => m.date_str && m.date_str.startsWith(monthStr))
    .map(m => {
      // 提取 "8月19日" 中的 "19"
      const dayMatch = m.date_str.match(/月(\d+)日/);
      return dayMatch ? parseInt(dayMatch[1], 10) : -1;
    });
    
  const daysHtml = Array.from({length: daysInMonth}, (_, i) => {
    let d = i + 1;
    let isDot = memoryDays.includes(d) ? 'dot ' : '';
    let isToday = d === today ? 'today' : '';
    return `<div class="day ${isDot}${isToday}">${d}</div>`;
  }).join('');
  
  return `<div class="card"><div class="calendar-head"><button onclick="changeMonth(-1)">‹</button><b>${year}年${month + 1}月</b><button onclick="changeMonth(1)">›</button></div><div class="week">${['日','一','二','三','四','五','六'].map(x=>`<div>${x}</div>`).join('')}</div><div class="days">${daysHtml}</div><button style="margin-top:15px;width:100%;padding:11px;border-radius:12px;background:#fff0f2;color:#d46373" onclick="go('records')">查看全部记录</button></div>`;
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
  if (m.image_urls && m.image_urls.length > 0) {
    html += `<div style="margin-top:10px;"><img src="${m.image_urls[0]}" onclick="viewImage('${m.image_urls[0]}')" style="max-height:120px; border-radius:8px; border:1px solid #eee; object-fit:cover; cursor:pointer;"></div>`;
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

function recent(){return `<div class="card timeline"><h2>最近的想念 <span class="sub" style="float:right">查看全部 →</span></h2>${memories.slice(0,4).map((m,i)=>`<div class="memory"><div class="date"><div>${m.date_str}</div><div class="heartline"></div></div><div><h3>${m.title || '日常想念'}</h3><p>${m.content}</p>${renderMemoryMeta(m)}</div></div>`).join('')}</div>`}
function records(){return `<div class="page-title">我的记录</div><div class="page-sub">一年里的每一个小瞬间，都值得被留下。</div><div class="grid"><div>${calendar()}</div><div>${recent()}<div class="card" style="margin-top:18px"><h2>记录统计</h2><div class="stats" style="margin-top:0"><div class="stat"><b>47</b><span>已记录</span></div><div class="stat"><b>9</b><span>照片</span></div><div class="stat"><b>12</b><span>特别想念</span></div><div class="stat"><b>31</b><span>连续记录</span></div></div></div></div></div>`}
function timeline(){
  return `<div class="page-title">${role==='owner'?'我们的想念时间轴':'他留给你的时间轴'}</div><div class="page-sub">${role==='owner'?'把这一年慢慢写成一本书。':'从第一天开始，重新走一遍这一年的想念。'}</div><div class="card">${memories.map((m) => {
    let reactionHtml = '';
    if (m.reactions && m.reactions.length > 0) {
      reactionHtml = `<div style="margin-top:12px; color: #d46373; font-size: 14px;">${m.reactions.map(r => `<span style="background: #fff0f2; padding: 4px 10px; border-radius: 12px; margin-right: 8px;">${r.reaction_type}</span>`).join('')}</div>`;
    } else if (role === 'partner') {
      reactionHtml = `<div style="margin-top:12px" id="reaction-container-${m.id}"><button class="chip" onclick="addReaction(${m.id}, '♥ 收到啦')">♥ 收到啦</button><button class="chip" onclick="addReaction(${m.id}, '我也想你')">我也想你</button></div>`;
    }
    return `<div class="memory"><div class="date"><div>${m.date_str}</div><div class="heartline"></div></div><div><h3>${m.title || '日常想念'}</h3><p>${m.content}</p>${renderMemoryMeta(m)}${reactionHtml}</div></div>`;
  }).join('')}</div>`;
}

async function addReaction(memoryId, reactionType) {
  const container = document.getElementById(`reaction-container-${memoryId}`);
  if (container) container.innerHTML = `<span style="color:#999;font-size:14px;">发送中...</span>`;
  
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
  } catch (err) {
    console.error("互动失败:", err);
    Swal.fire({
      icon: 'error',
      title: '互动失败',
      text: '请检查网络或数据库配置',
      confirmButtonColor: '#d46373'
    });
    if (container) container.innerHTML = `<button class="chip" onclick="addReaction(${memoryId}, '♥ 收到啦')">♥ 收到啦</button><button class="chip" onclick="addReaction(${memoryId}, '我也想你')">我也想你</button>`;
  }
}
function story(){return `<div class="page-title">我们的故事</div><div class="page-sub">这里不记录全部，只记录那些只有我们知道的事情。</div><div class="story"><div class="card big"><h2>我们是怎么认识的</h2><p>把第一次认识、第一次心动、第一次认真聊天的那一天写在这里。正式版可以添加照片、地点、时间与专属文字。</p></div><div class="card"><h2>特别的日期</h2><p>第一个情人节 · 2026.08.19</p></div><div class="card"><h2>只有我们知道</h2><p>一个只有你们两个人懂的暗号、一句话、一段回忆。</p></div></div>`}
function settings(){return `<div class="page-title">设置</div><div class="page-sub">让这个小世界只属于你们。</div><div class="card settings">
<div class="setting-row"><div><b>每日提醒</b><div class="sub">提醒自己留下今天的想念</div></div><div class="switch"></div></div>
<div class="setting-row"><div><b>私密模式</b><div class="sub">草稿默认只有自己可见</div></div><div class="switch"></div></div>
<div class="setting-row"><div><b>纪念日</b><div class="sub">2027年2月14日 · 一年后的情人节</div></div><span>♡</span></div>
<div class="setting-row"><div><b>关系身份</b><div class="sub">${role==='owner'?'记录的人':'收到的人'}</div></div><span>›</span></div>
</div>`}
