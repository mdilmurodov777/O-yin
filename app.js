/* ==========================================================
   SHADOW ARENA — 2 PLAYER BATTLE ENGINE (FULL IMPLEMENTATION)
   ========================================================== */

// --- 1. WEB AUDIO SYNTHESIZER (Tashqi faylsiz professional ovozlar) ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.7;
        this.bgmInterval = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, gainVal = 0.3, slideTo = null) {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        }

        gain.gain.setValueAtTime(gainVal * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    click() {
        this.playTone(620, 'sine', 0.08, 0.25, 900);
    }

    slash() {
        this.playTone(320, 'sawtooth', 0.14, 0.25, 90);
    }

    hit() {
        this.playTone(150, 'square', 0.18, 0.4, 45);
    }

    ultimate() {
        this.playTone(180, 'sawtooth', 0.55, 0.5, 40);
        setTimeout(() => this.playTone(520, 'sine', 0.4, 0.35, 110), 80);
    }

    roundStart() {
        this.playTone(440, 'triangle', 0.15, 0.3);
        setTimeout(() => this.playTone(660, 'triangle', 0.25, 0.35), 140);
    }

    victory() {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, idx) => {
            setTimeout(() => this.playTone(n, 'triangle', 0.28, 0.35), idx * 120);
        });
    }

    startAmbientLoop() {
        if (this.bgmInterval) return;
        const bassNotes = [65.41, 65.41, 77.78, 87.31, 65.41, 98.0, 87.31, 77.78];
        let step = 0;
        this.bgmInterval = setInterval(() => {
            if (this.enabled && gameState.screen === 'game' && !gameState.paused && !gameState.gameOver) {
                this.playTone(bassNotes[step % bassNotes.length], 'triangle', 0.28, 0.12);
                step++;
            }
        }, 320);
    }
}

const sound = new SoundEngine();

// --- 2. GLOBAL STATE VA SOZLAMALAR ---
const gameState = {
    screen: 'intro', // intro, menu, game
    paused: false,
    roundLocked: false,
    gameOver: false,
    round: 1,
    maxRounds: 3,
    scores: { p1: 0, p2: 0 },
    speedMultiplier: 1.0,
    screenShakeEnabled: true,
    shakeTime: 0,
    shakeIntensity: 0
};

const keys = {};

// --- 3. ORQA FON NEON ZARRACHALAR ---
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
let bgParticles = [];

function resizeBgCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', () => {
    resizeBgCanvas();
    resizeGameCanvas();
});
resizeBgCanvas();

for (let i = 0; i < 65; i++) {
    bgParticles.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        r: Math.random() * 2.2 + 0.6,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -Math.random() * 0.8 - 0.2,
        color: Math.random() > 0.5 ? '#00f3ff' : '#b537f2'
    });
}

function animateBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) p.y = bgCanvas.height;
        if (p.x < 0) p.x = bgCanvas.width;
        if (p.x > bgCanvas.width) p.x = 0;

        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fillStyle = p.color;
        bgCtx.shadowBlur = 10;
        bgCtx.shadowColor = p.color;
        bgCtx.fill();
    });
    requestAnimationFrame(animateBg);
}
animateBg();

// --- 4. KIRISH ANIMATSIYASI (INTRO LOADING) ---
const loadingBar = document.getElementById('loadingBar');
const loadingText = document.getElementById('loadingText');
const loadingBox = document.getElementById('loadingBox');
const startGameBtn = document.getElementById('startGameBtn');

let loadProgress = 0;
const loadTimer = setInterval(() => {
    loadProgress += Math.floor(Math.random() * 14) + 6;
    if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(loadTimer);
        loadingBar.style.width = '100%';
        loadingText.textContent = 'ARENA TAYYOR! 100%';
        setTimeout(() => {
            loadingBox.classList.add('hidden');
            startGameBtn.classList.remove('hidden');
        }, 350);
    } else {
        loadingBar.style.width = loadProgress + '%';
        loadingText.textContent = `TIZIM YUKLANMOQDA... ${loadProgress}%`;
    }
}, 90);

// --- 5. EKRANLAR VA MENYU NAVIGATSIYASI ---
function switchScreen(targetId, stateName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    gameState.screen = stateName;
}

startGameBtn.addEventListener('click', () => {
    sound.init();
    sound.click();
    switchScreen('mainMenu', 'menu');
});

document.getElementById('btnPlay').addEventListener('click', () => {
    sound.click();
    switchScreen('gameScreen', 'game');
    resizeGameCanvas();
    startNewMatch();
    sound.startAmbientLoop();
});

// Modallarni ochish/yopish
function openModal(id) {
    sound.click();
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    sound.click();
    document.getElementById(id).classList.remove('open');
}

document.getElementById('btnHowToPlay').addEventListener('click', () => openModal('modalHowTo'));
document.getElementById('btnSettings').addEventListener('click', () => openModal('modalSettings'));
document.getElementById('btnAbout').addEventListener('click', () => openModal('modalAbout'));

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.target));
});

// Sound Toggle
const btnSoundToggle = document.getElementById('btnSoundToggle');
const soundToggleText = document.getElementById('soundToggleText');
btnSoundToggle.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    soundToggleText.textContent = sound.enabled ? 'SOUND: ON 🔊' : 'SOUND: OFF 🔇';
    if (sound.enabled) sound.click();
});

// Settings Controls
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    volumeValue.textContent = `${val}%`;
    sound.volume = val / 100;
});

document.getElementById('speedSelect').addEventListener('change', (e) => {
    gameState.speedMultiplier = parseFloat(e.target.value);
    sound.click();
});

document.getElementById('shakeToggle').addEventListener('change', (e) => {
    gameState.screenShakeEnabled = e.target.checked;
    sound.click();
});

// Pause va Game Over tugmalari
document.getElementById('btnPause').addEventListener('click', togglePause);
document.getElementById('btnResume').addEventListener('click', togglePause);

document.getElementById('btnRestartMatch').addEventListener('click', () => {
    closeModal('pauseOverlay');
    gameState.paused = false;
    startNewMatch();
});

document.getElementById('btnPauseMainMenu').addEventListener('click', () => {
    closeModal('pauseOverlay');
    gameState.paused = false;
    switchScreen('mainMenu', 'menu');
});

document.getElementById('btnRematch').addEventListener('click', () => {
    closeModal('gameOverOverlay');
    startNewMatch();
});

document.getElementById('btnOverMainMenu').addEventListener('click', () => {
    closeModal('gameOverOverlay');
    switchScreen('mainMenu', 'menu');
});

function togglePause() {
    if (gameState.screen !== 'game' || gameState.gameOver) return;
    sound.click();
    gameState.paused = !gameState.paused;
    const overlay = document.getElementById('pauseOverlay');
    if (gameState.paused) {
        overlay.classList.add('open');
    } else {
        overlay.classList.remove('open');
    }
}

// --- 6. KLAVIATURA VA MOBIL TOUCH BOSHQARUVI ---
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    if (e.code === 'Escape') {
        togglePause();
        return;
    }

    if (!keys[e.code]) {
        keys[e.code] = true;
        handleAttackTrigger(e.code);
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mobil virtual tugmalar
document.querySelectorAll('.t-btn').forEach(btn => {
    const code = btn.dataset.key;
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        if (!keys[code]) {
            keys[code] = true;
            handleAttackTrigger(code);
        }
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        keys[code] = false;
    }, { passive: false });
});

// --- 7. JANG ARENASI VA PERSONAJLAR FIZIKASI ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeGameCanvas() {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    canvas.width = wrapper.clientWidth || 1000;
    canvas.height = wrapper.clientHeight || 520;
}

class Fighter {
    constructor({ id, x, y, color, secondaryColor, facing }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 26;
        this.color = color;
        this.secondaryColor = secondaryColor;
        this.facing = facing; // 1 o'ngga, -1 chapga
        this.vx = 0;
        this.vy = 0;
        this.speed = 5.4;
        this.hp = 100;
        this.maxHp = 100;
        this.energy = 0;
        this.maxEnergy = 100;
        this.attackCooldown = 0;
        this.attackAnim = 0;
        this.hitFlash = 0;
        this.dashTrail = [];
    }

    reset(x, y, facing) {
        this.x = x;
        this.y = y;
        this.facing = facing;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.energy = 0;
        this.attackCooldown = 0;
        this.attackAnim = 0;
        this.hitFlash = 0;
        this.dashTrail = [];
    }

    update(controls, bounds) {
        let moveX = 0;
        let moveY = 0;

        if (keys[controls.up]) moveY -= 1;
        if (keys[controls.down]) moveY += 1;
        if (keys[controls.left]) {
            moveX -= 1;
            this.facing = -1;
        }
        if (keys[controls.right]) {
            moveX += 1;
            this.facing = 1;
        }

        // Diagonal harakatni normallashtirish
        if (moveX !== 0 && moveY !== 0) {
            const inv = 0.7071;
            moveX *= inv;
            moveY *= inv;
        }

        const currentSpeed = this.speed * gameState.speedMultiplier;
        this.vx = moveX * currentSpeed;
        this.vy = moveY * currentSpeed;

        this.x += this.vx;
        this.y += this.vy;

        // Arena chegaralari (2.5D pol zonasi)
        const margin = this.radius + 14;
        const topLimit = bounds.height * 0.24;
        const bottomLimit = bounds.height - margin;

        this.x = Math.max(margin, Math.min(bounds.width - margin, this.x));
        this.y = Math.max(topLimit, Math.min(bottomLimit, this.y));

        // Harakat izi (Neon trail)
        if (Math.abs(this.vx) > 0.2 || Math.abs(this.vy) > 0.2) {
            this.dashTrail.push({ x: this.x, y: this.y, alpha: 0.5 });
        }
        this.dashTrail.forEach(t => t.alpha -= 0.04);
        this.dashTrail = this.dashTrail.filter(t => t.alpha > 0);

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackAnim > 0) this.attackAnim--;
        if (this.hitFlash > 0) this.hitFlash--;
    }

    draw(ctx) {
        // Harakat izi
        this.dashTrail.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.radius * 0.85, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = t.alpha * 0.35;
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 2.5D Yerdagi soya
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius + 4, this.radius * 1.1, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fill();

        // 100% Energiya aurasi
        if (this.energy >= 100) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 12 + Math.sin(Date.now() * 0.015) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd000';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ffd000';
            ctx.stroke();
        }

        // Hujum to'lqini animatsiyasi
        if (this.attackAnim > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const arcRadius = this.radius + 36;
            const startAngle = this.facing === 1 ? -0.9 : Math.PI - 0.9;
            const endAngle = this.facing === 1 ? 0.9 : Math.PI + 0.9;

            ctx.beginPath();
            ctx.arc(0, 0, arcRadius, startAngle, endAngle);
            ctx.strokeStyle = this.hitFlash > 0 ? '#fff' : this.color;
            ctx.lineWidth = 10 * (this.attackAnim / 12);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 25;
            ctx.shadowColor = this.color;
            ctx.stroke();
            ctx.restore();
        }

        // Personaj tanasi (Kiber jangchi)
        ctx.save();
        ctx.translate(this.x, this.y);

        // Tashqi neon halqa
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#0f1429';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.stroke();

        // Ichki yadro va kiber-vizor (ko'z)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = this.secondaryColor;
        ctx.fill();

        // Yo'nalish ko'rsatuvchi kiber-ko'z
        const eyeX = this.facing * 10;
        ctx.beginPath();
        ctx.roundRect(eyeX - 7, -6, 14, 7, 3);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.fill();

        // Energiya qilichi / Kiber-tig'
        const bladeAngle = this.attackAnim > 0 ? this.facing * 1.1 : this.facing * -0.35;
        ctx.rotate(bladeAngle);
        ctx.beginPath();
        ctx.moveTo(this.facing * 18, -4);
        ctx.lineTo(this.facing * 46, 0);
        ctx.lineTo(this.facing * 18, 4);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();
    }
}

const player1 = new Fighter({
    id: 'p1',
    x: 220,
    y: 300,
    color: '#00f3ff',
    secondaryColor: '#0051ff',
    facing: 1
});

const player2 = new Fighter({
    id: 'p2',
    x: 780,
    y: 300,
    color: '#ff2a5f',
    secondaryColor: '#990026',
    facing: -1
});

// Zarba zarrachalari va portlashlar
let particles = [];
let shockwaves = [];
let floatingTexts = [];

function spawnHitEffects(x, y, color, isUltimate = false) {
    const count = isUltimate ? 42 : 18;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isUltimate ? 11 : 6) + 2;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * (isUltimate ? 6 : 4) + 2,
            color: i % 3 === 0 ? '#ffffff' : color,
            life: 1.0
        });
    }

    shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: isUltimate ? 150 : 70,
        color: isUltimate ? '#ffd000' : color,
        alpha: 1
    });

    if (gameState.screenShakeEnabled) {
        gameState.shakeTime = isUltimate ? 18 : 8;
        gameState.shakeIntensity = isUltimate ? 14 : 6;
    }
}

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({
        x,
        y: y - 25,
        text,
        color,
        life: 1.0
    });
}

// Hujum mexanikasi
function handleAttackTrigger(code) {
    if (gameState.screen !== 'game' || gameState.paused || gameState.roundLocked || gameState.gameOver) return;

    // 1-o'yinchi hujumlari (F = oddiy yoki 100% bo'lsa ult, G = maxsus ult)
    if (code === 'KeyF') {
        if (player1.energy >= 100) {
            performAttack(player1, player2, true);
        } else {
            performAttack(player1, player2, false);
        }
    } else if (code === 'KeyG' && player1.energy >= 100) {
        performAttack(player1, player2, true);
    }

    // 2-o'yinchi hujumlari (Enter = oddiy yoki 100% bo'lsa ult, Shift = maxsus ult)
    if (code === 'Enter' || code === 'NumpadEnter') {
        if (player2.energy >= 100) {
            performAttack(player2, player1, true);
        } else {
            performAttack(player2, player1, false);
        }
    } else if ((code === 'ShiftRight' || code === 'ShiftLeft') && player2.energy >= 100) {
        performAttack(player2, player1, true);
    }
}

function performAttack(attacker, defender, isUltimate) {
    if (attacker.attackCooldown > 0 && !isUltimate) return;

    attacker.attackCooldown = isUltimate ? 28 : 16;
    attacker.attackAnim = 12;

    if (isUltimate) {
        attacker.energy = 0;
        sound.ultimate();
        spawnHitEffects(attacker.x, attacker.y, '#ffd000', true);
    } else {
        sound.slash();
    }

    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.hypot(dx, dy);

    // Masofa va yo'nalish tekshiruvi
    const reach = isUltimate ? 165 : 96;
    const facingCorrect = isUltimate || (attacker.facing === 1 && dx >= -15) || (attacker.facing === -1 && dx <= 15);

    if (dist <= reach && facingCorrect) {
        const damage = isUltimate ? 34 : 12;
        defender.hp = Math.max(0, defender.hp - damage);
        defender.hitFlash = 8;

        // Orqaga itarish (Knockback)
        const angle = Math.atan2(dy, dx);
        const knockback = isUltimate ? 48 : 22;
        defender.x += Math.cos(angle) * knockback;
        defender.y += Math.sin(angle) * knockback;

        if (!isUltimate) {
            attacker.energy = Math.min(100, attacker.energy + 25);
            sound.hit();
        }

        spawnHitEffects(defender.x, defender.y, attacker.color, isUltimate);
        spawnFloatingText(
            defender.x,
            defender.y,
            isUltimate ? `-${damage} CRITICAL!` : `-${damage}`,
            isUltimate ? '#ffd000' : '#ffffff'
        );

        updateHUD();
        checkRoundEnd();
    }
}

// --- 8. HUD VA RAUND BOSHQARUVI ---
function updateHUD() {
    document.getElementById('p1HpBar').style.width = `${player1.hp}%`;
    document.getElementById('p1HpText').textContent = `${player1.hp} / 100`;
    document.getElementById('p1EnergyBar').style.width = `${player1.energy}%`;
    document.getElementById('p1EnergyText').textContent = player1.energy >= 100 ? 'SUPER READY!' : `ENERGY ${player1.energy}%`;
    document.getElementById('p1EnergyBar').classList.toggle('ready', player1.energy >= 100);

    document.getElementById('p2HpBar').style.width = `${player2.hp}%`;
    document.getElementById('p2HpText').textContent = `${player2.hp} / 100`;
    document.getElementById('p2EnergyBar').style.width = `${player2.energy}%`;
    document.getElementById('p2EnergyText').textContent = player2.energy >= 100 ? 'SUPER READY!' : `ENERGY ${player2.energy}%`;
    document.getElementById('p2EnergyBar').classList.toggle('ready', player2.energy >= 100);

    document.getElementById('p1Score').textContent = gameState.scores.p1;
    document.getElementById('p2Score').textContent = gameState.scores.p2;
    document.getElementById('roundBadge').textContent = `ROUND ${gameState.round} / ${gameState.maxRounds}`;

    // Raund nuqtalari
    const p1Dots = document.querySelectorAll('#p1Dots .dot');
    const p2Dots = document.querySelectorAll('#p2Dots .dot');
    p1Dots.forEach((dot, i) => dot.classList.toggle('won', i < gameState.scores.p1));
    p2Dots.forEach((dot, i) => dot.classList.toggle('won', i < gameState.scores.p2));
}

function showBanner(text, duration = 1200) {
    const banner = document.getElementById('announceBanner');
    banner.textContent = text;
    banner.classList.remove('hidden');
    // Animatsiyani qayta ishga tushirish
    banner.style.animation = 'none';
    banner.offsetHeight;
    banner.style.animation = '';

    setTimeout(() => {
        banner.classList.add('hidden');
    }, duration);
}

function startNewMatch() {
    gameState.round = 1;
    gameState.scores = { p1: 0, p2: 0 };
    gameState.gameOver = false;
    gameState.paused = false;
    setupRound();
}

function setupRound() {
    gameState.roundLocked = true;
    particles = [];
    shockwaves = [];
    floatingTexts = [];

    const w = canvas.width || 1000;
    const h = canvas.height || 520;
    player1.reset(w * 0.22, h * 0.58, 1);
    player2.reset(w * 0.78, h * 0.58, -1);

    updateHUD();
    sound.roundStart();
    showBanner(`ROUND ${gameState.round}`, 1000);

    setTimeout(() => {
        showBanner('FIGHT!', 700);
        gameState.roundLocked = false;
    }, 1050);
}

function checkRoundEnd() {
    if (gameState.roundLocked || gameState.gameOver) return;

    if (player1.hp <= 0 || player2.hp <= 0) {
        gameState.roundLocked = true;
        const p1Won = player2.hp <= 0;

        if (p1Won) {
            gameState.scores.p1++;
            showBanner('P1 ROUND WIN!', 1400);
        } else {
            gameState.scores.p2++;
            showBanner('P2 ROUND WIN!', 1400);
        }

        updateHUD();

        // 2 ta raund yutgan g'olib bo'ladi (Best of 3)
        if (gameState.scores.p1 >= 2 || gameState.scores.p2 >= 2) {
            setTimeout(() => {
                endMatch(p1Won ? '1-O\'YINCHI (CYBER SHADOW)' : '2-O\'YINCHI (CRIMSON PHANTOM)');
            }, 1500);
        } else {
            gameState.round++;
            setTimeout(() => {
                setupRound();
            }, 1600);
        }
    }
}

function endMatch(winnerName) {
    gameState.gameOver = true;
    sound.victory();
    document.getElementById('winnerTitle').textContent = `${winnerName} G'OLIB!`;
    document.getElementById('finalScoreText').textContent = `YAKUNIY HISOB: ${gameState.scores.p1} — ${gameState.scores.p2}`;
    openModal('gameOverOverlay');
}

// --- 9. 2.5D ARENA CHIZISH VA ASOSIY RENDER LOOP ---
function drawArena(ctx, w, h) {
    // Yuqori kiber devor
    const wallH = h * 0.24;
    const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
    wallGrad.addColorStop(0, '#050714');
    wallGrad.addColorStop(1, '#121838');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, wallH);

    // Devordagi neon chiziq
    ctx.beginPath();
    ctx.moveTo(0, wallH);
    ctx.lineTo(w, wallH);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f3ff';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2.5D Perspektiv pol (Grid)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.14)';
    ctx.lineWidth = 1;

    // Gorizontal perspektiv chiziqlar
    for (let i = 1; i <= 6; i++) {
        const ratio = Math.pow(i / 6, 1.3);
        const y = wallH + (h - wallH) * ratio;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Vertikal perspektiv chiziqlar
    const cols = 12;
    for (let i = 0; i <= cols; i++) {
        const topX = (w / cols) * i;
        const offset = (i - cols / 2) * 45;
        ctx.beginPath();
        ctx.moveTo(topX, wallH);
        ctx.lineTo(topX + offset, h);
        ctx.stroke();
    }

    // Markaziy Arena halqasi
    ctx.save();
    ctx.translate(w / 2, h * 0.62);
    ctx.scale(1, 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(181, 55, 242, 0.45)';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#b537f2';
    ctx.stroke();
    ctx.restore();
}

function gameLoop() {
    if (gameState.screen === 'game') {
        const w = canvas.width;
        const h = canvas.height;

        ctx.save();

        // Screen shake effekti
        if (gameState.shakeTime > 0 && !gameState.paused) {
            const sx = (Math.random() - 0.5) * gameState.shakeIntensity;
            const sy = (Math.random() - 0.5) * gameState.shakeIntensity;
            ctx.translate(sx, sy);
            gameState.shakeTime--;
        }

        ctx.clearRect(0, 0, w, h);
        drawArena(ctx, w, h);

        if (!gameState.paused && !gameState.gameOver) {
            if (!gameState.roundLocked) {
                player1.update({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }, { width: w, height: h });
                player2.update({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }, { width: w, height: h });

                // O'yinchilar bir-birining ichiga kirib ketmasligi uchun to'qnashuv
                const dx = player2.x - player1.x;
                const dy = player2.y - player1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = player1.radius + player2.radius;
                if (dist < minDist && dist > 0) {
                    const overlap = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    player1.x -= nx * overlap;
                    player1.y -= ny * overlap;
                    player2.x += nx * overlap;
                    player2.y += ny * overlap;
                }
            }
        }

        // Y-koordinata bo'yicha chuqurlik tartibi (2.5D Depth Sorting)
        const fighters = [player1, player2].sort((a, b) => a.y - b.y);
        fighters.forEach(f => f.draw(ctx));

        // Shockwaves render
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            if (!gameState.paused) {
                sw.radius += (sw.maxRadius - sw.radius) * 0.18;
                sw.alpha -= 0.05;
            }
            if (sw.alpha <= 0) {
                shockwaves.splice(i, 1);
                continue;
            }
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = sw.alpha;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Zarba zarrachalari render
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            if (!gameState.paused) {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.life -= 0.035;
            }
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Zarar raqamlari (Floating Damage Text)
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            if (!gameState.paused) {
                ft.y -= 1.2;
                ft.life -= 0.025;
            }
            if (ft.life <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = ft.life;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#000';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);