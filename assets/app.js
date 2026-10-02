/* ============================================================
   ابزارها
============================================================ */
const $  = s => document.querySelector(s);
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = a => a[Math.floor(Math.random()*a.length)];
const uniq = a => [...new Set(a)];
const fa = n => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
function shuffle(arr){
  const r = arr.slice();
  for(let i=r.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [r[i],r[j]] = [r[j],r[i]];
  }
  return r;
}

/* ============================================================
   🎵 صداها
============================================================ */
let audioCtx = null;
let soundEnabled = true;
const SOUND_KEY = 'zehn_avar_sound_v2';
try { if(localStorage.getItem(SOUND_KEY) === 'off') soundEnabled = false; } catch(e){}

let musicEnabled = true;
const MUSIC_KEY = 'zehn_avar_music_v1';
const MUSIC_SRC = 'assets/Sunset-Landscape(chosic.com).mp3';
try { if(localStorage.getItem(MUSIC_KEY) === 'off') musicEnabled = false; } catch(e){}

function initAudio(){
  if(audioCtx) return audioCtx;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  catch(e){ console.warn('Audio not supported', e); }
  return audioCtx;
}
function playTone({freq=440, type='sine', dur=0.1, vol=0.08, slideTo=null, delay=0}){
  if(!soundEnabled) return;
  const ctx = initAudio(); if(!ctx) return;
  if(ctx.state === 'suspended') ctx.resume();
  try {
    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if(slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, startAt + dur);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(vol, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + dur + 0.03);
  } catch(e){}
}
function playSub({freq=120, dur=0.14, vol=0.05, delay=0}){
  if(!soundEnabled) return;
  const ctx = initAudio(); if(!ctx) return;
  if(ctx.state === 'suspended') ctx.resume();
  try {
    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(vol, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + dur + 0.03);
  } catch(e){}
}
function soundClick(){
  playTone({ freq: 780, type: 'sine', dur: 0.055, vol: 0.07, slideTo: 520 });
  playSub ({ freq: 160, dur: 0.08, vol: 0.05 });
}
function soundCorrect(){
  if(!soundEnabled) return;
  [784, 988, 1319].forEach((f, i) => {
    playTone({ freq: f, type: 'sine', dur: 0.13, vol: 0.09, delay: i * 0.065 });
  });
  playSub({ freq: 220, dur: 0.35, vol: 0.07 });
  playTone({ freq: 2637, type: 'sine', dur: 0.18, vol: 0.03, delay: 0.13 });
}
function soundWrong(){
  playTone({ freq: 240, type: 'triangle', dur: 0.22, vol: 0.08, slideTo: 130 });
  playSub ({ freq: 90, dur: 0.28, vol: 0.07 });
}
function toggleSound(){
  soundEnabled = !soundEnabled;
  try { localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off'); } catch(e){}
  updateSettingsUI();
  if(soundEnabled){ initAudio(); soundClick(); }
}
function updateSettingsUI(){
  const sw = $('#setSound');
  if(sw){
    sw.classList.toggle('on', soundEnabled);
    sw.setAttribute('aria-checked', soundEnabled ? 'true' : 'false');
  }
  const mw = $('#setMusic');
  if(mw){
    mw.classList.toggle('on', musicEnabled);
    mw.setAttribute('aria-checked', musicEnabled ? 'true' : 'false');
  }
}
function openSettings(){
  const modal = $('#settingsModal'); if(!modal) return;
  updateSettingsUI();
  const st = $('#setStatus'); if(st) st.textContent = '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  soundClick();
}
function closeSettings(){
  const modal = $('#settingsModal'); if(!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  soundClick();
}

/* ============================================================
   🎵 موسیقی پس‌زمینه
============================================================ */
let bgMusic = null;
function initMusic(){
  if(bgMusic) return bgMusic;
  try {
    bgMusic = new Audio(MUSIC_SRC);
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
    bgMusic.volume = 0.3;
  } catch(e){ console.warn('Music not supported', e); }
  return bgMusic;
}
function playMusic(){
  if(!musicEnabled) return;
  const m = initMusic(); if(!m) return;
  const p = m.play();
  if(p && p.catch) p.catch(() => {});
}
function pauseMusic(){
  if(bgMusic){ try { bgMusic.pause(); } catch(e){} }
}
function toggleMusic(){
  musicEnabled = !musicEnabled;
  try { localStorage.setItem(MUSIC_KEY, musicEnabled ? 'on' : 'off'); } catch(e){}
  updateSettingsUI();
  if(musicEnabled){ playMusic(); } else { pauseMusic(); }
}

/* ============================================================
   ذخیره‌سازی امتیاز
============================================================ */
const STORAGE_KEY = 'zehn_avar_user_v1';
let userData = {
  totalScore:0, gamesPlayed:0, bestStreak:0,
  totalCorrect:0, totalQuestions:0,
  perGame:{}, unlockedLevels:{}, lastPlayed:null
};

function loadUser(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      userData = Object.assign(userData, parsed);
      if(!userData.perGame) userData.perGame = {};
      if(!userData.unlockedLevels) userData.unlockedLevels = {};
    }
  } catch(e){ console.warn(e); }
}
function saveUser(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(userData)); }catch(e){ console.warn(e); }
}
function addScore(gameKey, correct, total, score, bestStreak){
  userData.totalScore += score;
  userData.gamesPlayed += 1;
  userData.totalCorrect += correct;
  userData.totalQuestions += total;
  userData.bestStreak = Math.max(userData.bestStreak, bestStreak);
  userData.lastPlayed = Date.now();
  if(!userData.perGame[gameKey]) userData.perGame[gameKey] = { played:0, score:0, best:0, lastCorrect:0 };
  const pg = userData.perGame[gameKey];
  pg.played += 1; pg.score += score;
  pg.best = Math.max(pg.best, correct);
  pg.lastCorrect = correct;
  if(correct > PASS_THRESHOLD){
    userData.unlockedLevels[gameKey] = Math.min((userData.unlockedLevels[gameKey]||0)+1, 2);
  }
  saveUser();
}
function resetUser(){
  if(!confirm('مطمئنی می‌خواهی تمام امتیازها و پیشرفتت پاک شود؟')) return false;
  userData = {
    totalScore:0, gamesPlayed:0, bestStreak:0,
    totalCorrect:0, totalQuestions:0,
    perGame:{}, unlockedLevels:{}, lastPlayed:null
  };
  saveUser();
  updateHomeUI();
  updateGameMenuBadges();
  return true;
}

/* ============================================================
   پیام‌های تشویقی
============================================================ */
function getEncouragement(score){
  if(score === 0) return { ico:'✨', title:'اولین قدمت رو بردار!', text:'هنوز امتیازی نداری. با یک بازی کوچک شروع کن.' };
  if(score < 50)  return { ico:'🌱', title:'شروع خوبی بود!', text:'آفرین! هنوز هوش مصنوعی ذهنت رو تخریب نکرده 🤖😄 ادامه بده.' };
  if(score < 150) return { ico:'💪', title:'داری گرم می‌شی!', text:'مغزت داره ورزش می‌کنه و قوی‌تر می‌شه. چند امتیاز دیگه تا رکورد!' };
  if(score < 300) return { ico:'⚡', title:'آفرین! فوق‌العاده‌ای', text:'امتیازت داره بالا می‌ره. ذهنت از هوش مصنوعی هم سریع‌تر شده 🚀' };
  if(score < 500) return { ico:'🔥', title:'تو یک ورزشکار ذهنی واقعی هستی!', text:'بیشتر از نصف راه رو رفتی. حافظه‌ات داره مثل فولاد می‌شه.' };
  if(score < 800) return { ico:'🏆', title:'قهرمان ذهن!', text:'امتیازت شگفت‌انگیزه. مغزت الان از بسیاری از هوش‌های مصنوعی جلوتره!' };
  if(score < 1200) return { ico:'👑', title:'استاد بزرگ ذهن!', text:'تو الان یک الگوی ورزش ذهنی هستی. هوش مصنوعی باید از تو یاد بگیره 😎' };
  if(score < 2000) return { ico:'🌟', title:'افسانه‌ی ورزش ذهن!', text:'امتیازی که جمع کردی باورنکردنیه. ذهنت مثل یک ابررایانه کار می‌کنه!' };
  return { ico:'🚀', title:'فراتر از مرزهای ذهن!', text:'تو به قله رسیدی. ذهنت حالا یک نیروگاه واقعیه. به خودت افتخار کن! 🏅' };
}

function updateHomeUI(){
  const e = getEncouragement(userData.totalScore);
  const ico = $('#sbIco'), title = $('#sbTitle'), text = $('#sbText'), score = $('#sbScore');
  if(ico) ico.textContent = e.ico;
  if(title) title.textContent = e.title;
  if(text) text.textContent = e.text;
  if(score) score.textContent = fa(userData.totalScore);
}

function updateGameMenuBadges(){
  document.querySelectorAll('.mcard').forEach(card => {
    const gk = card.dataset.game;
    const pg = userData.perGame[gk];
    let badge = card.querySelector('.mstar');
    if(pg && pg.best > 0){
      if(!badge){
        badge = document.createElement('span');
        badge.className = 'mstar';
        card.appendChild(badge);
      }
      badge.textContent = '🏅 ' + fa(pg.best);
    } else if(badge){ badge.remove(); }
  });
}

/* ============================================================
   افکت کانفتی
============================================================ */
const CONFETTI_COLORS = ['#f37f00','#ffb84d','#ffd88a','#22c55e','#3b82f6','#ef4444','#a855f7','#facc15','#06b6d4'];
const CONFETTI_SHAPES = ['■','●','▲','★','◆'];

function burstConfetti(x, y){
  const layer = document.getElementById('confetti-layer');
  if(!layer) return;
  const N = 34;
  for(let i=0;i<N;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = rnd(6,13);
    const color = pick(CONFETTI_COLORS);
    p.style.width = size+'px';
    p.style.height = size+'px';
    p.style.left = x+'px';
    p.style.top = y+'px';
    p.style.background = color;
    if(Math.random() < .35) p.style.borderRadius = '50%';
    if(Math.random() < .25){
      p.textContent = pick(CONFETTI_SHAPES);
      p.style.background = 'transparent';
      p.style.color = color;
      p.style.fontSize = (size+2)+'px';
      p.style.lineHeight = size+'px';
      p.style.textAlign = 'center';
      p.style.width = (size+4)+'px';
      p.style.height = (size+4)+'px';
    }
    const angle = Math.random()*Math.PI*2;
    const power = rnd(70,240);
    const tx = Math.cos(angle)*power;
    const ty = Math.sin(angle)*power*.65 + rnd(160,320);
    const rot = rnd(-1080,1080);
    const dur = rnd(1300,2100);
    p.style.setProperty('--tx', tx+'px');
    p.style.setProperty('--ty', ty+'px');
    p.style.setProperty('--rot', rot+'deg');
    p.style.setProperty('--dur', dur+'ms');
    layer.appendChild(p);
    setTimeout(() => p.remove(), dur+100);
  }
  const flash = document.createElement('div');
  flash.className = 'flash-ok';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

/* ============================================================
   📮 فرم بازخورد — Google Apps Script
============================================================ */
/* می‌توانی فقط Deployment ID یا آدرس کامل Web App را وارد کنی */
const FEEDBACK_DEPLOY  = 'AKfycbwJQATNv1Kl0T8wU7ZV1a2wNU7MZFFPhZvz-6EWUS8BLWk8qRXSNXTXE82_d5kppHRt';
const FEEDBACK_API     = /^https?:\/\//i.test(FEEDBACK_DEPLOY)
  ? FEEDBACK_DEPLOY
  : 'https://script.google.com/macros/s/' + FEEDBACK_DEPLOY + '/exec';
const FEEDBACK_SECRET  = 'zehn_avar_2024';

function openFeedback(preset = {}){
  const modal = $('#feedbackModal'); if(!modal) return;

  $('#fbCategory').value = preset.category || '';
  $('#fbQuestion').value = preset.question || '';
  $('#fbMessage').value  = '';
  $('#fbStatus').textContent = '';

  if(preset.type) $('#fbType').value = preset.type;
  if(preset.title) $('#fbTitle').textContent = preset.title;
  else $('#fbTitle').textContent = '💬 ارسال پیام';

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  soundClick();
}
function closeFeedback(){
  const modal = $('#feedbackModal'); if(!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  soundClick();
}

/* ارسال با فرم مخفی داخل iframe — مطمئن‌ترین روش برای Google Apps Script
   (از fetch/no-cors که با ریدایرکت cross-origin مشکل دارد استفاده نمی‌کنیم) */
function sendToFeedbackAPI(payload){
  return new Promise(resolve => {
    const frameName = 'fb_sink_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = frameName;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.action = FEEDBACK_API;
    form.method = 'POST';
    form.target = frameName;
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';

    Object.entries(payload).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v == null ? '' : String(v);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      form.remove();
      iframe.remove();
      resolve();
    }, 1500);
  });
}

async function submitFeedback(){
  const type     = $('#fbType').value;
  const name     = $('#fbName').value.trim();
  const mobile   = $('#fbMobile').value.trim();
  const category = $('#fbCategory').value.trim();
  const question = $('#fbQuestion').value.trim();
  const message  = $('#fbMessage').value.trim();
  const statusEl = $('#fbStatus');
  const submitBtn= $('#fbSubmit');

  if(message.length < 3){
    statusEl.style.color = '#fca5a5';
    statusEl.textContent = '⚠️ متن پیام باید حداقل ۳ کاراکتر باشد';
    soundWrong();
    return;
  }

  statusEl.style.color = '#8b97a6';
  statusEl.textContent = 'در حال ارسال...';
  submitBtn.disabled = true;
  submitBtn.style.opacity = '.6';

  try {
    await sendToFeedbackAPI({
      type, name, mobile, category, question, message,
      secret: FEEDBACK_SECRET
    });

    statusEl.style.color = '#86efac';
    statusEl.textContent = '✅ پیامت ثبت شد. ممنون از همراهی‌ات!';
    soundCorrect();

    $('#fbMessage').value = '';
    $('#fbQuestion').value = '';

    setTimeout(() => {
      closeFeedback();
      statusEl.textContent = '';
    }, 1600);

  } catch(err){
    statusEl.style.color = '#fca5a5';
    statusEl.textContent = '❌ خطا در ارسال. لطفاً دوباره تلاش کن.';
    soundWrong();
    console.warn(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }
}

/* ============================================================
   داده‌ها
   داده‌های سؤال‌ها در فایل assets/questions.js قرار دارد
   و قبل از این فایل بارگذاری می‌شود.
============================================================ */

/* ============================================================
   سطح‌ها
============================================================ */
const LEVEL_NAMES = ['ساده', 'متوسط', 'سخت'];
const LEVEL_ICONS = ['🌱', '⚡', '🔥'];
const LEVEL_COUNT = [7, 9, 11];
const LEVEL_OPTS  = [3, 4, 4];
const PASS_THRESHOLD = 5;

let currentGame = null;
let currentLevel = 0;

/* ============================================================
   سازنده گزینه‌ها
============================================================ */
function buildOptions(correct, pool, count){
  const distractors = shuffle(pool.filter(v => v !== correct)).slice(0, count - 1);
  return shuffle([correct, ...distractors]).map(v => ({ label:v, correct: v === correct }));
}
function buildHaramOptions(correct, category, count){
  const sameCat = HARAM.filter(q => q.t === category).map(q => q.c);
  let pool = uniq([...sameCat, ...HARAM.map(q => q.c)]);
  const distractors = shuffle(pool.filter(v => v !== correct)).slice(0, count - 1);
  return shuffle([correct, ...distractors]).map(v => ({ label:v, correct: v === correct }));
}

/* ============================================================
   سازنده سؤالات
============================================================ */
function makeCityQuestions(count, level, optCount){
  const subjects  = shuffle(CITIES.filter(x => x.c !== x.p));
  const provinces = uniq(CITIES.map(x => x.p));
  const cityNames = uniq(CITIES.map(x => x.c));
  const out = [];
  for(let k=0;k<count;k++){
    const s = subjects[k % subjects.length];
    if(Math.random() < 0.5){
      out.push({
        tag:'استان‌شناسی',
        main:`شهر <b>${s.c}</b> در کدام استان است؟`,
        rawQuestion:`شهر ${s.c} در کدام استان است؟`,
        options: buildOptions(s.p, provinces, optCount),
        fact: s.f
      });
    } else {
      out.push({
        tag:'شهرشناسی',
        main:`کدام شهر در استان <b>${s.p}</b> قرار دارد؟`,
        rawQuestion:`کدام شهر در استان ${s.p} قرار دارد؟`,
        options: buildOptions(s.c, cityNames, optCount),
        fact: s.f
      });
    }
  }
  return out;
}
function makeNatureQuestions(count, level, optCount){
  const picked = shuffle(NATURE).slice(0, count);
  const cities = uniq(NATURE.map(x => x.c));
  return picked.map(p => ({
    tag: p.t,
    main:`«${p.n}» در کدام منطقه قرار دارد؟`,
    rawQuestion:`${p.n} در کدام منطقه قرار دارد؟`,
    options: buildOptions(p.c, cities, optCount),
    fact: p.f
  }));
}
function makeMathQuestions(count, level, optCount){
  const out = [];
  const max1 = level === 0 ? 20 : level === 1 ? 50 : 99;
  const max2 = level === 0 ? 15 : level === 1 ? 40 : 99;
  const maxM = level === 0 ? 5  : level === 1 ? 9  : 15;
  for(let k=0;k<count;k++){
    const op = level === 0 ? pick(['+','-']) : pick(['+','-','×','÷']);
    let a,b,ans;
    if(op === '+'){ a = rnd(2, max1); b = rnd(2, max2); ans = a + b; }
    else if(op === '-'){ a = rnd(5, max1); b = rnd(2, a - 1); ans = a - b; }
    else if(op === '×'){ a = rnd(2, maxM); b = rnd(2, maxM); ans = a * b; }
    else { b = rnd(2, maxM); ans = rnd(2, maxM); a = b * ans; }

    const set = new Set([ans]);
    let guard = 0;
    while(set.size < 4 && guard++ < 200){
      const d = ans + pick([-10,-5,-3,-2,-1,1,2,3,5,10]);
      if(d >= 0 && d !== ans) set.add(d);
    }
    let filler = 0;
    while(set.size < 4){ set.add(ans + (++filler) + 10); }

    out.push({
      tag:'حساب',
      main:`<span class="expr" dir="ltr">${fa(a)} ${op} ${fa(b)} = ?</span>`,
      rawQuestion:`${a} ${op} ${b} = ?`,
      options: shuffle([...set]).map(v => ({ label: fa(v), correct: v === ans })),
      grid: true
    });
  }
  return out;
}
function makeFoodQuestions(count, level, optCount){
  const picked = shuffle(FOODS).slice(0, count);
  const cities = uniq(FOODS.map(x => x.c));
  return picked.map(p => ({
    tag:'غذای محلی',
    main:`«${p.n}» سوغات یا غذای معروف کدام شهر است؟`,
    rawQuestion:`${p.n} سوغات یا غذای معروف کدام شهر است؟`,
    options: buildOptions(p.c, cities, optCount),
    fact: p.f
  }));
}
function makeFamousQuestions(count, level, optCount){
  const picked = shuffle(FAMOUS).slice(0, count);
  const cities = uniq(FAMOUS.map(x => x.c));
  return picked.map(p => ({
    tag: p.t,
    main:`${p.n} اهل کدام شهر است؟`,
    rawQuestion:`${p.n} اهل کدام شهر است؟`,
    options: buildOptions(p.c, cities, optCount),
    fact: p.f
  }));
}
function makeCraftQuestions(count, level, optCount){
  const picked = shuffle(CRAFTS).slice(0, count);
  const cities = uniq(CRAFTS.map(x => x.c));
  return picked.map(p => ({
    tag:'صنایع دستی',
    main:`«${p.n}» به کدام شهر معروف است؟`,
    rawQuestion:`${p.n} به کدام شهر معروف است؟`,
    options: buildOptions(p.c, cities, optCount),
    fact: p.f
  }));
}
function makeProverbQuestions(count, level, optCount){
  const picked = shuffle(PROVERBS).slice(0, count);
  const endings = uniq(PROVERBS.map(x => x.a));
  return picked.map(p => ({
    tag:'ضرب‌المثل',
    main: p.q,
    rawQuestion: p.q,
    sub: 'ادامه ضرب‌المثل کدام است؟',
    options: buildOptions(p.a, endings, optCount),
    fact: p.f
  }));
}
function makeHaramQuestions(count, level, optCount){
  const picked = shuffle(HARAM).slice(0, count);
  return picked.map(p => ({
    tag: p.t,
    main: p.n,
    rawQuestion: p.n,
    options: buildHaramOptions(p.c, p.t, optCount),
    fact: p.f
  }));
}

/* ============================================================
   ثبت بازی‌ها
============================================================ */
const GAMES = {
  city:    { title:'شهرهای ایران',           icon:'🏙️', num:'۱', make: makeCityQuestions },
  nature:  { title:'جاذبه‌های طبیعی ایران',  icon:'🏔️', num:'۲', make: makeNatureQuestions },
  food:    { title:'غذاهای محلی ایران',      icon:'🍲', num:'۳', make: makeFoodQuestions },
  famous:  { title:'مشاهیر ایران',           icon:'📜', num:'۴', make: makeFamousQuestions },
  craft:   { title:'صنایع دستی ایران',       icon:'🧵', num:'۵', make: makeCraftQuestions },
  proverb: { title:'ضرب‌المثل‌های ایران',   icon:'💬', num:'۶', make: makeProverbQuestions },
  math:    { title:'حساب سریع',              icon:'➗', num:'۷', make: makeMathQuestions },
  haram:   { title:'حرم‌شناسی',              icon:'🕌', num:'۸', make: makeHaramQuestions }
};

function renderGameMenu(){
  const menu = $('#gameMenu');
  menu.innerHTML = '';
  Object.entries(GAMES).forEach(([key, cfg]) => {
    const btn = document.createElement('button');
    btn.className = 'mcard' + (key === 'haram' ? ' holy' : '');
    btn.dataset.game = key;
    btn.innerHTML = `
      <span class="mnum">${cfg.num}</span>
      <span class="mico">${cfg.icon}</span>
      <span class="mbody"><b>${cfg.title}</b><small>${getGameSubtitle(key)}</small></span>
      <span class="marrow">‹</span>`;
    menu.appendChild(btn);
  });
}
function getGameSubtitle(key){
  const subs = {
    city:'شهرها و استان‌ها را به هم وصل کن',
    nature:'کوه، جنگل، دریاچه، کویر و جزیره',
    food:'سوغات و غذاهای هر شهر',
    famous:'شاعران، دانشمندان و نویسندگان',
    craft:'هنرهای سنتی و شهرهایشان',
    proverb:'ادامه ضرب‌المثل را پیدا کن',
    math:'جمع، تفریق، ضرب و تقسیم',
    haram:'حرم امام رضا (ع) — تاریخ، صحن‌ها و مفاهیم'
  };
  return subs[key] || '';
}

function updateCornerLevelBtn(){
  const icon = $('#lvlBtnIcon');
  const dot  = $('#lvlBtnDot');
  if(icon) icon.textContent = LEVEL_ICONS[currentLevel] || '🌱';
  if(dot)  dot.textContent  = fa(currentLevel + 1);
}

/* ============================================================
   موتور مسابقه
============================================================ */
function startQuiz(host, questions, opts = {}){
  const total = questions.length;
  let i = 0, score = 0, correct = 0, streak = 0, bestStreak = 0, locked = false;

  const DELAY_OK  = 1400;
  const DELAY_BAD = 2200;

  function finish(){
    addScore(opts.gameKey, correct, total, score, bestStreak);
    updateHomeUI();
    updateGameMenuBadges();

    const pct = Math.round(correct / total * 100);
    const e = getEncouragement(userData.totalScore);
    const lvlName = LEVEL_NAMES[opts.level] || 'ساده';
    const lvlIcon = LEVEL_ICONS[opts.level] || '🌱';

    let suggestHTML = '';
    const isLastLevel = opts.level >= 2;

    if(correct > PASS_THRESHOLD && !isLastLevel){
      suggestHTML = `
        <div class="suggest up">
          🎉 <b>آفرین!</b> با ${fa(correct)} پاسخ درست، سطح بعد (<b>${LEVEL_ICONS[opts.level+1]} ${LEVEL_NAMES[opts.level+1]}</b>) باز شد.
        </div>`;
    } else if(correct <= PASS_THRESHOLD){
      suggestHTML = `
        <div class="suggest">
          💡 پیشنهاد می‌کنم سطح <b>${lvlIcon} ${lvlName}</b> را دوباره بازی کنی تا تسلط بیشتری پیدا کنی.
          (برای رفتن به سطح بعد باید <b>بیشتر از ${fa(PASS_THRESHOLD)}</b> پاسخ درست بدهی)
        </div>`;
    } else {
      suggestHTML = `
        <div class="suggest up">
          🏅 تو در بالاترین سطح (<b>${LEVEL_ICONS[2]} ${LEVEL_NAMES[2]}</b>) هستی!
        </div>`;
    }

    host.innerHTML = `
      <div class="qcard result">
        <div class="rbig">${fa(correct)}/${fa(total)}</div>
        <div class="rlabel">${getResultLabel(pct)}</div>
        <div class="rbar"><i style="width:${pct}%"></i></div>
        <div class="rmeta">
          امتیاز این دور: <b>${fa(score)}</b> •
          امتیاز کل: <b>${fa(userData.totalScore)}</b> •
          سطح ${lvlIcon} ${lvlName}
        </div>
        ${suggestHTML}
        <div class="encourage">
          <span class="emoji">${e.ico}</span>
          <b>${e.title}</b><br>
          ${e.text}
        </div>
        <div class="report-line">
          <button id="resReport">
            <span class="ico">🐞</span><span>گزارش خطا</span>
          </button>
        </div>
        <div class="ractions">
          <button class="btn primary" id="again">بازی دوباره</button>
          <button class="btn ghost" id="changeLv">تغییر سطح</button>
          <button class="btn ghost" data-go="home">صفحه اصلی</button>
        </div>
      </div>`;

    host.querySelector('#again').addEventListener('click', () => {
      if(opts.restart) opts.restart();
      else startQuiz(host, questions, opts);
    });
    host.querySelector('#changeLv').addEventListener('click', () => {
      if(opts.onChangeLevel) opts.onChangeLevel();
    });
    host.querySelector('#resReport').addEventListener('click', () => {
      const cfg = GAMES[opts.gameKey];
      openFeedback({
        type: 'bug',
        title: '🐞 گزارش خطا',
        category: cfg ? cfg.title : ''
      });
    });
  }

  function getResultLabel(pct){
    if(pct === 100)     return 'بی‌نقص! تو یک ایران‌شناس واقعی هستی 🏆';
    if(pct >= 80)       return 'عالی بود! 👏';
    if(pct >= 50)       return 'خوب بود، با کمی تمرین بهتر هم می‌شوی 💪';
    return 'اشکالی نداره، یک بار دیگر امتحان کن 🙂';
  }

  function render(){
    if(i >= total) return finish();
    locked = false;
    const q = questions[i];
    const lvlName = LEVEL_NAMES[opts.level] || 'ساده';
    const lvlIcon = LEVEL_ICONS[opts.level] || '🌱';
    const cfg = GAMES[opts.gameKey];

    host.innerHTML = `
      <div class="qhead">
        <span class="pill">سؤال ${fa(i+1)} از ${fa(total)}</span>
        <span class="pill lvl">${lvlIcon} ${lvlName}</span>
        <span class="pill score">${fa(score)}</span>
      </div>
      <div class="qcard" id="qcard">
        ${q.tag ? `<div class="qtag">${q.tag}</div>` : ''}
        <div class="qmain">${q.main}</div>
        ${q.sub ? `<div class="qsub">${q.sub}</div>` : ''}
      </div>
      <div class="opts ${q.grid ? 'grid2' : ''}"></div>
      <div class="fb"></div>
      <div class="report-line">
        <button id="reportBtn">
          <span class="ico">🐞</span><span>گزارش خطا</span>
        </button>
      </div>`;

    const optsEl = host.querySelector('.opts');
    const fbEl   = host.querySelector('.fb');
    const qcard  = host.querySelector('#qcard');
    const correctIdx = q.options.findIndex(o => o.correct);

    /* دکمه واحد گزارش خطا در صفحه بازی */
    host.querySelector('#reportBtn').addEventListener('click', () => {
      soundClick();
      openFeedback({
        type: 'bug',
        title: '🐞 گزارش خطا',
        category: cfg ? cfg.title : '',
        question: q.rawQuestion || q.main.replace(/<[^>]+>/g,'')
      });
    });

    q.options.forEach((o, idx) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = `<span class="oidx">${fa(idx+1)}</span><span class="otext">${o.label}</span>`;
      b.addEventListener('click', (e) => answer(idx, e));
      optsEl.appendChild(b);
    });

    function answer(idx, evt){
      if(locked) return;
      locked = true;
      soundClick();

      const nodes = [...optsEl.children];

      nodes.forEach((el, k) => {
        el.disabled = true;
        if(k === correctIdx) el.classList.add('ok');
        else if(k === idx)   el.classList.add('bad');
        else                 el.classList.add('dim');
      });

      const right = idx === correctIdx;
      let gain = 0;

      if(right){
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        gain = 10 + Math.min(streak - 1, 5) * 2;
        score += gain;
        correct++;
        qcard.classList.add('win');
        soundCorrect();

        let cx = window.innerWidth / 2;
        let cy = window.innerHeight / 2;
        if(evt && evt.clientX){ cx = evt.clientX; cy = evt.clientY; }
        else if(nodes[idx]){
          const r = nodes[idx].getBoundingClientRect();
          cx = r.left + r.width / 2;
          cy = r.top + r.height / 2;
        }
        burstConfetti(cx, cy);
      } else {
        streak = 0;
        qcard.classList.add('lose');
        soundWrong();
      }

      const delay = right ? DELAY_OK : DELAY_BAD;

      fbEl.innerHTML = `
        <div class="fbrow ${right ? 'good' : 'bad'}">
          <span class="fbtxt">
            ${right
              ? `درست بود! <b>+${fa(gain)}</b>${streak > 1 ? ` <span style="color:var(--muted)">(زنجیره ${fa(streak)})</span>` : ''}`
              : `نادرست — پاسخ درست: <b>${q.options[correctIdx].label}</b>`}
          </span>
        </div>
        ${q.fact ? `<div class="fact">${q.fact}</div>` : ''}
        <div class="autobar"><i style="--adur:${delay}ms"></i></div>`;

      setTimeout(() => { i++; render(); }, delay);
    }
  }

  render();
}

/* ============================================================
   انتخاب سطح
============================================================ */
function showLevelPicker(gameKey){
  currentGame = gameKey;
  const cfg = GAMES[gameKey];
  const unlocked = userData.unlockedLevels[gameKey] || 0;

  $('#level-title').innerHTML = `<span class="t-ico">${cfg.icon}</span> ${cfg.title}`;

  const host = $('#level-stage');
  host.innerHTML = `
    <div class="qcard">
      <div class="qtag">انتخاب دستی سطح</div>
      <div class="qsub">با دکمه گوشه بالای صفحه هم می‌توانی در میانه بازی سطح را عوض کنی</div>
    </div>
    <div class="opts">
      <button class="opt" data-lv="0">
        <span class="oidx">🌱</span>
        <span class="otext">ساده <small class="auto-badge">۷ سؤال • ۳ گزینه</small></span>
      </button>
      <button class="opt" data-lv="1">
        <span class="oidx">⚡</span>
        <span class="otext">متوسط <small class="auto-badge">۹ سؤال • ۴ گزینه${unlocked >= 1 ? ' • باز شده ✅' : ''}</small></span>
      </button>
      <button class="opt" data-lv="2">
        <span class="oidx">🔥</span>
        <span class="otext">سخت <small class="auto-badge">۱۱ سؤال • ۴ گزینه${unlocked >= 2 ? ' • باز شده ✅' : ''}</small></span>
      </button>
    </div>
    ${unlocked < 2 ? `
      <div class="suggest" style="margin-top:14px;border-color:rgba(243,127,0,.4);background:rgba(243,127,0,.08);color:#ffcf8a">
        🔓 برای باز کردن سطح‌های بالاتر، در هر دور بیشتر از <b>${fa(PASS_THRESHOLD)}</b> پاسخ درست بده.
      </div>` : ''}
    ${userData.perGame[gameKey] ? `
      <div class="suggest up" style="margin-top:14px">
        🏅 رکورد تو در این بازی: <b>${fa(userData.perGame[gameKey].best)}</b> پاسخ درست
      </div>` : ''}`;

  host.querySelectorAll('[data-lv]').forEach(btn => {
    btn.addEventListener('click', () => {
      soundClick();
      startGame(gameKey, parseInt(btn.dataset.lv, 10));
    });
  });

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#s-level').classList.add('active');
  window.scrollTo(0, 0);
}

/* ============================================================
   شروع بازی
============================================================ */
function startGame(gameKey, level){
  currentGame  = gameKey;
  currentLevel = level;

  const cfg = GAMES[gameKey];
  const count    = LEVEL_COUNT[level];
  const optCount = gameKey === 'math' ? 4 : LEVEL_OPTS[level];

  $('#game-title').innerHTML = `<span class="t-ico">${cfg.icon}</span> ${cfg.title}`;
  updateCornerLevelBtn();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#s-game').classList.add('active');
  window.scrollTo(0, 0);

  const host = $('#game-stage');
  const run = () => {
    const questions = cfg.make(count, level, optCount);
    startQuiz(host, questions, {
      level, gameKey, restart: run,
      onChangeLevel: () => showLevelPicker(gameKey)
    });
  };
  run();
}

$('#lvlBtn').addEventListener('click', () => {
  if(currentGame){
    soundClick();
    showLevelPicker(currentGame);
  }
});

/* ============================================================
   مسیریابی
============================================================ */
function go(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('s-' + name);
  if(el) el.classList.add('active');
  window.scrollTo(0, 0);
  if(name === 'home'){
    updateHomeUI();
    updateGameMenuBadges();
  }
}

document.addEventListener('click', e => {
  const back = e.target.closest('[data-go]');
  if(back){ soundClick(); go(back.dataset.go); return; }

  const gm = e.target.closest('[data-game]');
  if(gm){ soundClick(); showLevelPicker(gm.dataset.game); }

  const btn = e.target.closest('.btn');
  if(btn) soundClick();
});

/* ============================================================
   راه‌اندازی اولیه
============================================================ */
loadUser();
renderGameMenu();
updateHomeUI();
updateGameMenuBadges();
updateSettingsUI();

playMusic();

$('#homeFeedback').addEventListener('click', () => openFeedback());

$('#closeFeedback').addEventListener('click', closeFeedback);
$('#feedbackModal').addEventListener('click', e => {
  if(e.target.id === 'feedbackModal') closeFeedback();
});
$('#fbSubmit').addEventListener('click', submitFeedback);

$('#settingsToggle').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', e => {
  if(e.target.id === 'settingsModal') closeSettings();
});
$('#setSound').addEventListener('click', toggleSound);
$('#setMusic').addEventListener('click', toggleMusic);
$('#setReset').addEventListener('click', () => {
  if(resetUser()){
    const st = $('#setStatus');
    if(st){ st.style.color = '#86efac'; st.textContent = '✅ همه‌ی امتیازها پاک شد.'; }
  }
});

document.addEventListener('touchstart', () => { initAudio(); playMusic(); }, {once:true, passive:true});
document.addEventListener('mousedown',  () => { initAudio(); playMusic(); }, {once:true});
