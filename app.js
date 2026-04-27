document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
(function disableBrowserZoom() {
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    window.addEventListener('keydown', function (e) {
        const isZoomKey = (e.ctrlKey || e.metaKey) &&
            (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.key === '°');
        if (isZoomKey) {
            e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
        }
    });

    window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    }, { passive: false });

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
})();
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('cut', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if ((e.ctrlKey && ['u', 's', 'p', 'a'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(e.key.toLowerCase())))
        e.preventDefault();
});

let uName;

const IDB = 'RosetteV3', VER = 1, STR = 'sess';
let _db = null;

function openDB() {
    return new Promise((res, rej) => {
        const r = indexedDB.open(IDB, VER);
        r.onupgradeneeded = e => e.target.result.createObjectStore(STR, { keyPath: 'id' });
        r.onsuccess = e => { _db = e.target.result; res(_db); };
        r.onerror = e => rej(e);
    });
}

function setLoginOverlay(active) {
    if (active) {
        document.body.classList.add('login-active');
        window.scrollTo(0, 0);
    } else {
        document.body.classList.remove('login-active');
    }
}

async function saveSession(name) {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(name));
    const raw = await crypto.subtle.exportKey('raw', key);
    const tx = _db.transaction(STR, 'readwrite');
    tx.objectStore(STR).put({ id: 's', enc: Array.from(new Uint8Array(enc)), iv: Array.from(iv), key: Array.from(new Uint8Array(raw)) });
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name + 'rosette'));
    localStorage.setItem('rh', Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16));
}

async function loadSession() {
    try {
        if (!localStorage.getItem('rh')) return null;
        await openDB();
        return new Promise((res, rej) => {
            const tx = _db.transaction(STR, 'readonly');
            const req = tx.objectStore(STR).get('s');
            req.onsuccess = async e => {
                const rec = e.target.result;
                if (!rec) { res(null); return; }
                try {
                    const k = await crypto.subtle.importKey('raw', new Uint8Array(rec.key), { name: 'AES-GCM' }, false, ['decrypt']);
                    const d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(rec.iv) }, k, new Uint8Array(rec.enc));
                    res(new TextDecoder().decode(d));
                } catch { res(null); }
            };
            req.onerror = () => res(null);
        });
    } catch { return null; }
}
async function clearSession() {
    localStorage.removeItem('rh');
    if (!_db) return;
    _db.transaction(STR, 'readwrite').objectStore(STR).delete('s');
}

function applyName(n) {
    uName = n;
    document.querySelectorAll('.uname,.h-name-inline,.letter-name').forEach(el => el.textContent = n);
    document.querySelectorAll('.uname2').forEach(el => el.textContent = n);
    document.getElementById('memWith').textContent = 'with ' + n;
    document.getElementById('schedFor').textContent = 'for ' + n;
}

const loginEl = document.getElementById('login');
const lErr = document.getElementById('lErr');
const lName = document.getElementById('lName');
const lPass = document.getElementById('lPass');

document.getElementById('lBtn').addEventListener('click', async () => {
    const n = lName.value.trim();
    const p = lPass.value.trim();
    if (!n) { lErr.textContent = 'I would love to know your name first'; return; }
    if (p !== '143') { lErr.textContent = 'the secret is 143 — I love you'; return; }
    lErr.textContent = '';
    await openDB();
    await saveSession(n);
    applyName(n);
    loginEl.classList.add('gone');
    loginEl.classList.remove('show');
    setLoginOverlay(false);
    initApp();
});
[lName, lPass].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('lBtn').click(); }));

(async () => {
    await openDB();
    const saved = await loadSession();
    if (saved) {
        applyName(saved);
        loginEl.classList.add('gone');
        loginEl.classList.remove('show');
        initApp();
    } else {
        loginEl.classList.add('show');
        setLoginOverlay(true);
    }
})();

function initApp() {
    triggerFadeIns();
    animateMeter();
}

function triggerFadeIns() {
    const els = document.querySelectorAll('.fi');
    const io = new IntersectionObserver(entries => {
        entries.forEach((en, i) => {
            if (en.isIntersecting) { setTimeout(() => en.target.classList.add('vis'), i * 75); io.unobserve(en.target); }
        });
    }, { threshold: 0.06 });
    els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) { el.classList.add('vis'); }
        else io.observe(el);
    });
}

function animateMeter() {
    setTimeout(() => {
        document.getElementById('loveMeter').style.width = '98%';
    }, 600);
}

const modal = document.getElementById('modal');
const mTitle = document.getElementById('mTitle');
const mBody = document.getElementById('mBody');

function openModal(title, body, extra) {
    if (uName) { title = title.replace(/\[n\]/g, uName); body = body.replace(/\[n\]/g, uName); }
    mTitle.textContent = title;
    mBody.innerHTML = `<p>${body}</p>${extra || ''}`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() { modal.classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('mClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('premBtn').addEventListener('click', () => {
    const n = uName || 'you';
    const logHtml = `<div style="margin-top:1.6rem;text-align:center;">
    <button id="logBtn" style="background:var(--cs);color:var(--c5);font-family:'DM Sans',sans-serif;font-weight:700;font-size:0.88rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.75rem 1.8rem;border:none;border-radius:60px;cursor:pointer;">
      Sign out
    </button></div>`;
    openModal('Always yours', `You hold the only subscription that matters — no trial period, no cancellation, no expiry date. Just you, me and truly endless love!`, logHtml);
    setTimeout(() => {
        const lb = document.getElementById('logBtn');
        if (lb) lb.addEventListener('click', async () => {
            await clearSession(); closeModal(); uName = null;
            lName.value = ''; lPass.value = '';
            loginEl.classList.remove('gone');
            loginEl.classList.add('show');
            setLoginOverlay(true);
        });
    }, 80);
});

const NO_MSGS = [
    'Are you absolutely sure about that',
    'I think your finger slipped',
    'That cannot possibly be right',
    'Give that another thought',
    'My heart says you meant yes',
    'You and I both know the answer',
    'I will wait right here',
    'The yes button is right there',
    'That one does not count',
    'Almost — try the other one',
    'I believe in you completely',
    'Somewhere inside it is yes',
    'I am infinitely patient',
    'You nearly got it',
    'Try once more — for me',
    'Nice try, but my heart already knows the answer',
    'You are not getting away that easily',
    'That button is broken — try the pink one',
    'Oh no you don’t!',
    'Let me pretend I didn’t see that',
    'You are just teasing me now, right?',
    'Not today, sweetheart',
    'I will just float over here a bit more',
    'You know I am not going anywhere',
    'That click did not count — try again',
    'Look into my eyes and try saying no again',
    'Your finger must have slipped twice',
    'Even the universe says yes',
    'How about a little nudge toward the left?',
    'You are adorable when you try to resist',
    'No? That word is not in our dictionary',
    'I will just keep drifting closer to yes',
    'My love for you is bigger than that button',
    'One more try, for luck?',
    'You cannot escape this much love',
    'The yes button misses you',
    'Come on, just a tiny little click on yes',
    'I will be right here, waiting forever if needed',
    'That was not the sound of forever',
    'You are making my pixels blush',
    'Even gravity wants you to say yes',
    'I am not moving until you do — just kidding, I will move, but still...',
    'How many tries does it take? Apparently more than this',
    'You are my favorite kind of stubborn',
    'Let us pretend that never happened and start over'
];
let noIdx = 0, lastNoMsg = -1;

document.getElementById('letterCard').addEventListener('click', openProposal);

function openProposal() {
    noIdx = 0; lastNoMsg = -1;
    const n = uName || 'you';
    const body = `My dearest ${n},<br><br>You make every ordinary day feel special. Just the thought of you warms my heart.<br><br>Will you be mine? Not for some grand reason — just because being with you feels like the most right thing in the world.`; const btns = `<div class="prop-area" id="propArea">
    <button class="prop-yes" id="pYes">Yes, always</button>
    <button class="prop-no" id="pNo">No</button>
  </div>
  <div id="prop-msg"></div>`;
    openModal('A letter for you', body, btns);
    initPropButtons();
}

function initPropButtons() {
    const area = document.getElementById('propArea');
    const yes = document.getElementById('pYes');
    const no = document.getElementById('pNo');
    if (!area || !yes || !no) return;
    const aw = area.offsetWidth, ah = area.offsetHeight;
    const yw = yes.offsetWidth, yh = yes.offsetHeight;
    const nw = no.offsetWidth, nh = no.offsetHeight;
    const gap = 26;
    const totalW = yw + nw + gap;
    const sx = Math.max(8, (aw - totalW) / 2);
    const sy = Math.max(0, (ah - yh) / 2);
    yes.style.left = sx + 'px'; yes.style.top = sy + 'px';
    no.style.left = (sx + yw + gap) + 'px'; no.style.top = sy + 'px';
    yes.style.opacity = '1';
    no.style.opacity = '1';
    yes.removeEventListener('click', onYes);
    no.removeEventListener('click', onNo);
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
}

function onNo() {
    noIdx++;
    let idx;
    do { idx = Math.floor(Math.random() * NO_MSGS.length); } while (idx === lastNoMsg && NO_MSGS.length > 1);
    lastNoMsg = idx;
    const msgEl = document.getElementById('prop-msg');
    if (msgEl) {
        msgEl.style.opacity = '0';
        setTimeout(() => { msgEl.textContent = NO_MSGS[idx]; msgEl.style.opacity = '1'; }, 80);
    }
    moveNo();
}

function moveNo() {
    const area = document.getElementById('propArea');
    const no = document.getElementById('pNo');
    const yes = document.getElementById('pYes');
    if (!area || !no || !yes) return;
    let currentX = parseFloat(no.style.left);
    let currentY = parseFloat(no.style.top);
    if (isNaN(currentX)) currentX = 0;
    if (isNaN(currentY)) currentY = 0;
    const aw = area.offsetWidth, ah = area.offsetHeight;
    const nw = no.offsetWidth, nh = no.offsetHeight;
    const yw = yes.offsetWidth, yh = yes.offsetHeight;
    const yesLeft = parseFloat(yes.style.left) || 0;
    const yesTop = parseFloat(yes.style.top) || 0;
    const yesRight = yesLeft + yw;
    const yesBottom = yesTop + yh;
    const margin = 15;
    const minJump = 150;
    const maxLeft = Math.max(0, aw - nw);
    const maxTop = Math.max(0, ah - nh);
    let validPositions = [];
    for (let i = 0; i < 100000; i++) {
        let x = Math.random() * maxLeft;
        let y = Math.random() * maxTop;
        const forceVertical = Math.random() < 0.3;
        if (forceVertical) { y = Math.random() < 0.5 ? 0 : maxTop; x = Math.random() * maxLeft; }
        const noRight = x + nw;
        const noBottom = y + nh;
        const overlap = !(noRight + margin < yesLeft || x - margin > yesRight || noBottom + margin < yesTop || y - margin > yesBottom);
        if (overlap) continue;
        const distance = Math.hypot(x - currentX, y - currentY);
        if (distance < minJump) continue;
        validPositions.push({ x, y });
    }
    if (validPositions.length > 0) {
        const rand = Math.floor(Math.random() * validPositions.length);
        const { x, y } = validPositions[rand];
        no.style.transition = 'left 0.32s cubic-bezier(0.2, 0.9, 0.4, 1.2), top 0.32s cubic-bezier(0.2, 0.9, 0.4, 1.2), opacity 0.2s ease';
        no.style.left = x + 'px';
        no.style.top = y + 'px';
        return;
    }
    const sides = ['left', 'right', 'top', 'bottom'];
    for (let attempt = 0; attempt < 50; attempt++) {
        const side = sides[Math.floor(Math.random() * sides.length)];
        let x, y;
        switch (side) {
            case 'left': x = Math.random() * (yesLeft - nw - margin - 20); x = Math.min(maxLeft, Math.max(0, x)); y = Math.random() < 0.4 ? (Math.random() < 0.5 ? 0 : maxTop) : Math.random() * maxTop; break;
            case 'right': x = yesRight + margin + 20 + Math.random() * (maxLeft - (yesRight + margin + 20)); x = Math.min(maxLeft, Math.max(0, x)); y = Math.random() < 0.4 ? (Math.random() < 0.5 ? 0 : maxTop) : Math.random() * maxTop; break;
            case 'top': x = Math.random() * maxLeft; y = Math.random() * (yesTop - nh - margin - 20); y = Math.min(maxTop, Math.max(0, y)); break;
            case 'bottom': x = Math.random() * maxLeft; y = yesBottom + margin + 20 + Math.random() * (maxTop - (yesBottom + margin + 20)); y = Math.min(maxTop, Math.max(0, y)); break;
        }
        if (isNaN(x) || isNaN(y)) continue;
        x = Math.min(maxLeft, Math.max(0, x));
        y = Math.min(maxTop, Math.max(0, y));
        const dist = Math.hypot(x - currentX, y - currentY);
        if (dist >= minJump) {
            no.style.transition = 'left 0.32s cubic-bezier(0.2, 0.9, 0.4, 1.2), top 0.32s cubic-bezier(0.2, 0.9, 0.4, 1.2), opacity 0.2s ease';
            no.style.left = x + 'px';
            no.style.top = y + 'px';
            return;
        }
    }
    const corners = [
        { x: 5 + Math.random() * 30, y: 5 + Math.random() * 30 },
        { x: maxLeft - 5 - Math.random() * 30, y: 5 + Math.random() * 30 },
        { x: 5 + Math.random() * 30, y: maxTop - 5 - Math.random() * 30 },
        { x: maxLeft - 5 - Math.random() * 30, y: maxTop - 5 - Math.random() * 30 },
        { x: maxLeft / 2 + (Math.random() - 0.5) * 40, y: 5 + Math.random() * 30 },
        { x: maxLeft / 2 + (Math.random() - 0.5) * 40, y: maxTop - 5 - Math.random() * 30 }
    ];
    const randCorner = corners[Math.floor(Math.random() * corners.length)];
    no.style.transition = 'left 0.32s cubic-bezier(0.2, 0.9, 0.4, 1.2), top 0.32s cubic-bezier(0.2, 0.9, 0.4, 1.2), opacity 0.2s ease';
    no.style.left = randCorner.x + 'px';
    no.style.top = randCorner.y + 'px';
}

function onYes() {
    closeModal();

    setTimeout(() => {
        launchConfetti();
        const a = document.getElementById('yesAudio');
        if (a) a.play().catch(() => { });
    }, 60);
}

const cvs = document.getElementById('confetti');
const cx = cvs.getContext('2d');
let cParts = [], cActive = false, cRefill = true, cRAF = null, cTmr = null;
let lastCvsW = 0, lastCvsH = 0;
let bgIntervalId = null;
const originalBgInterval = setInterval(() => {
    if (!cActive) {
        bgI = (bgI + 1) % bgPal.length;
        document.body.style.background = bgPal[bgI];
        document.body.style.transition = 'background 2.5s ease';
    }
}, 5500);

function resizeCvs() {
    const newW = innerWidth;
    const newH = innerHeight;
    if (cActive && cParts.length > 0 && lastCvsW > 0 && lastCvsH > 0) {
        const ratioX = newW / lastCvsW;
        const ratioY = newH / lastCvsH;
        for (let p of cParts) {
            p.x = p.x * ratioX;
            p.y = p.y * ratioY;
        }
    }
    cvs.width = newW;
    cvs.height = newH;
    lastCvsW = newW;
    lastCvsH = newH;
}

let resizeTimer;
window.addEventListener('resize', () => {
    if (resizeTimer) return;
    resizeTimer = requestAnimationFrame(() => {
        resizeCvs();
        resizeTimer = null;
    });
});

function mkP() {
    return {
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height - cvs.height,
        sz: Math.random() * 8 + 4,
        vy: Math.random() * 3.5 + 2.8,
        vx: (Math.random() - 0.5) * 1.2,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 0.08,
        hue: Math.random() * 30 + 335
    };
}

function launchConfetti() {
    if (cTmr) clearTimeout(cTmr);
    if (cRAF) cancelAnimationFrame(cRAF);

    document.body.classList.add('confetti-active');

    resizeCvs();
    lastCvsW = cvs.width;
    lastCvsH = cvs.height;

    cx.clearRect(0, 0, cvs.width, cvs.height);
    cvs.style.display = 'block';
    cActive = true;
    cRefill = true;

    cParts = [];
    for (let i = 0; i < 260; i++) cParts.push(mkP());

    drawC();
    cTmr = setTimeout(() => {
        cRefill = false;
        setTimeout(() => {
            document.body.classList.remove('confetti-active');
        }, 500);
    }, 22000);
}

function drawC() {
    if (!cActive) return;

    cx.clearRect(0, 0, cvs.width, cvs.height);

    const keep = [];
    const w = cvs.width;
    const h = cvs.height;
    const buffer = 80;

    for (let i = 0; i < cParts.length; i++) {
        const p = cParts[i];
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vr;

        if (p.y < h + buffer && p.x > -buffer && p.x < w + buffer) {
            cx.save();
            cx.translate(p.x, p.y);
            cx.rotate(p.rot);
            cx.fillStyle = `hsl(${p.hue}, 70%, 68%)`;
            cx.fillRect(-p.sz * 0.5, -p.sz * 0.5, p.sz, p.sz);
            cx.restore();
            keep.push(p);
        }
    }

    if (cRefill) {
        const need = 260 - keep.length;
        for (let i = 0; i < need; i++) keep.push(mkP());
    }

    cParts = keep;

    if (!cRefill && cParts.length === 0) {
        cActive = false;
        cvs.style.display = 'none';
        return;
    }

    cRAF = requestAnimationFrame(drawC);
}

const bgA = document.getElementById('bgAudio');
const musBtn = document.getElementById('musicBtn');
const musIco = document.getElementById('musIco');
let playing = false;

musBtn.addEventListener('click', () => {
    if (playing) {
        bgA.pause(); playing = false;
        musIco.innerHTML = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
    } else {
        bgA.play().then(() => {
            playing = true;
            musIco.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
        }).catch(() => { });
    }
});
bgA.addEventListener('ended', () => {
    playing = false;
    musIco.innerHTML = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
});

const bgPal = ['#FDF5F0', '#FBF0F5', '#FDF3EC', '#F9EEF6', '#FBF5F0'];
let bgI = 0;
setInterval(() => {
    bgI = (bgI + 1) % bgPal.length;
    document.body.style.background = bgPal[bgI];
    document.body.style.transition = 'background 2.5s ease';
}, 5500);