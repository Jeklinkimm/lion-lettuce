/**
 * Lion Lettuce v5 — Core Game Engine
 * 핵심: 3단계 양배추 상태 변화 + 사자 하악 분리 애니메이션
 */

// ─── Asset Loader ───────────────────────────────────────────
const Assets = {
  lion: { upper: null, lower: null },
  lettuce: { normal: null, crush1: null, crush2: null },
  loaded: false,

  load(basePath = 'assets') {
    const files = {
      'lion.upper':   `${basePath}/head/upper_jaw.png`,
      'lion.lower':   `${basePath}/head/lower_jaw.png`,
      'lettuce.normal': `${basePath}/lettuce/lettuce_normal.png`,
      'lettuce.crush1': `${basePath}/lettuce/lettuce_crush1.png`,
      'lettuce.crush2': `${basePath}/lettuce/lettuce_crush2.png`,
    };
    const promises = Object.entries(files).map(([key, src]) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const [group, name] = key.split('.');
          this[group][name] = img;
          console.log(`Loaded: ${key} (${img.naturalWidth}x${img.naturalHeight})`);
          resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
      });
    });
    return Promise.all(promises).then(() => { this.loaded = true; });
  }
};


// ─── Sound Manager (Web Audio) ──────────────────────────────
class SoundManager {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.bgmNodes = null;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ready = true;
    } catch(e) { console.warn('Web Audio not available'); }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** 아삭! 첫 물기 사운드 — 양배추를 처음 잡을 때 */
  playBite() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;

    // Layer 1: 턱 "딱" 닫히는 어택 (짧고 강한 클릭)
    const click = ctx.createOscillator(), cg = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(400, now);
    click.frequency.exponentialRampToValueAtTime(80, now + 0.04);
    cg.gain.setValueAtTime(0.5, now);
    cg.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    click.connect(cg); cg.connect(ctx.destination);
    click.start(now); click.stop(now + 0.06);

    // Layer 2: 아삭 크런치 노이즈 (야채 부러지는 소리)
    const bufSize = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.pow(1 - i / bufSize, 0.5);
      // 불규칙 그레인 (씹는 질감)
      data[i] = (Math.random() * 2 - 1) * 0.6 * env;
      if (i % 50 < 20) data[i] *= 2.5;
      if (Math.random() < 0.05) data[i] *= 3; // 랜덤 스파이크 (바삭 느낌)
    }
    const noise = ctx.createBufferSource(), ng = ctx.createGain();
    const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1800;
    lp.type = 'lowpass'; lp.frequency.value = 6000;
    noise.buffer = buf;
    ng.gain.setValueAtTime(0.45, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    noise.connect(hp); hp.connect(lp); lp.connect(ng); ng.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.12);

    // Layer 3: 서브 임팩트 (묵직한 무는 느낌)
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    sg.gain.setValueAtTime(0.35, now);
    sg.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.12);
  }

  /** 와구작! 씹기 사운드 — stuck 양배추 물 때 (더 강한 와구작 타격감) */
  playCrunchBite() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;

    // Layer 1: "와구" 턱 충돌 (square 더블탭 느낌)
    for (let t = 0; t < 2; t++) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(500 - t * 150, now + t * 0.04);
      osc.frequency.exponentialRampToValueAtTime(50, now + t * 0.04 + 0.08);
      g.gain.setValueAtTime(0.45, now + t * 0.04);
      g.gain.exponentialRampToValueAtTime(0.01, now + t * 0.04 + 0.1);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + t * 0.04); osc.stop(now + t * 0.04 + 0.1);
    }

    // Layer 2: 으드득 크런치 노이즈 (길고 거친 씹기 질감)
    const bufSize = Math.floor(ctx.sampleRate * 0.22);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.pow(1 - i / bufSize, 0.4);
      data[i] = (Math.random() * 2 - 1) * 0.7 * env;
      // 이중 그레인: 거친 씹기 + 바삭 스파이크
      if (i % 40 < 15) data[i] *= 2.5;
      if (i % 120 < 10) data[i] *= 3;
    }
    const noise = ctx.createBufferSource(), ng = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.6;
    noise.buffer = buf;
    ng.gain.setValueAtTime(0.5, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    noise.connect(bp); bp.connect(ng); ng.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.22);

    // Layer 3: 바삭 고주파 (야채 조직 파괴 소리)
    const hiss = ctx.createOscillator(), hg = ctx.createGain();
    hiss.type = 'sawtooth';
    hiss.frequency.setValueAtTime(1200, now + 0.01);
    hiss.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    hg.gain.setValueAtTime(0.15, now + 0.01);
    hg.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    hiss.connect(hg); hg.connect(ctx.destination);
    hiss.start(now + 0.01); hiss.stop(now + 0.12);

    // Layer 4: 우적 서브 (깊은 무는 임팩트)
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.18);
    sg.gain.setValueAtTime(0.5, now);
    sg.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.2);
  }

  playEatComplete() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // 소멸 시 짧은 임팩트 + 성공 징글
    const impact = ctx.createOscillator(), ig = ctx.createGain();
    impact.type = 'square';
    impact.frequency.setValueAtTime(400, now);
    impact.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    ig.gain.setValueAtTime(0.5, now);
    ig.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    impact.connect(ig); ig.connect(ctx.destination);
    impact.start(now); impact.stop(now + 0.1);

    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + 0.06 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06 + i * 0.08 + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + 0.06 + i * 0.08); osc.stop(now + 0.06 + i * 0.08 + 0.35);
    });
  }

  /** 칭찬 음성 로드 (WAV 파일) */
  loadCheerVoices(basePath = 'assets') {
    this.cheerBuffers = [];
    const files = [
      `${basePath}/voice/cheer/voice_cheer_04.wav`,
      `${basePath}/voice/cheer/voice_cheer_07.wav`,
      `${basePath}/voice/cheer/voice_cheer_09.wav`,
      `${basePath}/voice/cheer/voice_cheer_12.wav`,
    ];
    files.forEach(url => {
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => this.ctx.decodeAudioData(buf))
        .then(decoded => { this.cheerBuffers.push(decoded); console.log('Loaded cheer:', url); })
        .catch(e => console.warn('Failed to load cheer:', url, e));
    });
  }

  /** 칭찬 음성 피드백 (녹음된 WAV 랜덤 재생) */
  playPraise(text) {
    if (!this.ready || !this.cheerBuffers || this.cheerBuffers.length === 0) return;
    const buf = this.cheerBuffers[Math.floor(Math.random() * this.cheerBuffers.length)];
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  playCrush() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }

  playFanfare() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // 축하 팡파레
    const melody = [523, 659, 784, 1047, 784, 1047, 1318];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = i < 4 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  startBGM() {
    if (!this.ready || this.bgmNodes) return;
    const ctx = this.ctx;
    this.bgmNodes = [];
    // 빠른 템포 신나는 BGM (BPM ~160)
    const beatDur = 0.375; // 한 비트 = 0.375초 (160 BPM)
    const barDur = beatDur * 4; // 한 마디 = 1.5초

    // 코드 진행: C → G → Am → F (밝고 신나는)
    const chords = [
      [261.6, 329.6, 392],   // C
      [196, 246.9, 293.7],   // G
      [220, 261.6, 329.6],   // Am
      [174.6, 220, 261.6],   // F
    ];

    // 멜로디 패턴 (마디당 8음, 16분음표)
    const melodies = [
      [523, 659, 784, 659, 523, 784, 659, 523],
      [392, 494, 587, 494, 392, 587, 494, 392],
      [440, 523, 659, 523, 440, 659, 523, 440],
      [349, 440, 523, 440, 349, 523, 440, 349],
    ];

    const scheduleLoop = () => {
      if (!this.bgmNodes) return;
      const now = ctx.currentTime;
      const loopLen = chords.length * barDur;

      chords.forEach((chord, ci) => {
        const barStart = now + ci * barDur;

        // 코드 패드 (스타카토 리듬)
        for (let beat = 0; beat < 4; beat++) {
          const t = barStart + beat * beatDur;
          chord.forEach(freq => {
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = beat % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(beat === 0 ? 0.06 : 0.035, t);
            gain.gain.exponentialRampToValueAtTime(0.005, t + beatDur * 0.8);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t); osc.stop(t + beatDur * 0.85);
          });
        }

        // 베이스라인 (옥타브 아래, 강한 비트)
        const bassFreq = chord[0] / 2;
        for (let beat = 0; beat < 4; beat++) {
          const t = barStart + beat * beatDur;
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = beat % 2 === 0 ? bassFreq : bassFreq * 1.5;
          gain.gain.setValueAtTime(beat === 0 ? 0.07 : 0.04, t);
          gain.gain.exponentialRampToValueAtTime(0.005, t + beatDur * 0.5);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + beatDur * 0.5);
        }

        // 멜로디 (16분음표 패턴)
        const mel = melodies[ci];
        const noteLen = beatDur / 2;
        mel.forEach((freq, ni) => {
          const t = barStart + ni * noteLen;
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.005, t + noteLen * 0.9);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + noteLen * 0.92);
        });

        // 하이햇 (매 비트, 노이즈 기반)
        for (let beat = 0; beat < 8; beat++) {
          const t = barStart + beat * (beatDur / 2);
          const bufSize = Math.floor(ctx.sampleRate * 0.02);
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let j = 0; j < bufSize; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / bufSize);
          const src = ctx.createBufferSource(), g = ctx.createGain();
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass'; hp.frequency.value = 8000;
          src.buffer = buf;
          g.gain.setValueAtTime(beat % 2 === 0 ? 0.06 : 0.03, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
          src.connect(hp); hp.connect(g); g.connect(ctx.destination);
          src.start(t); src.stop(t + 0.03);
        }
      });

      this._bgmTimer = setTimeout(scheduleLoop, loopLen * 1000 - 50);
    };
    scheduleLoop();
  }

  stopBGM() {
    if (this._bgmTimer) clearTimeout(this._bgmTimer);
    this.bgmNodes = null;
  }
}


// ─── Cabbage State Machine ──────────────────────────────────
const CABBAGE_STATES = { NORMAL: 0, CRUSH1: 1, CRUSH2: 2 };
const CABBAGE_MAX_HEALTH = 3;

class Cabbage {
  constructor(x, y, vx, vy, size, canvasW, canvasH) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.size = size;
    this.canvasW = canvasW; this.canvasH = canvasH;
    this.gravity = 350;
    this.bounciness = 0.72;
    this.health = CABBAGE_MAX_HEALTH;
    this.crushState = CABBAGE_STATES.NORMAL;
    this.phase = 'bouncing'; // bouncing, attracted, stuck, exploding
    this.crushScaleX = 1; this.crushScaleY = 1;
    this.shakeTimer = 0; this.squishScale = 1;
    this.flashTimer = 0;
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 6;
    this.spawnTime = performance.now();
    this.dead = false;
    this.opacity = 1; this.scale = 1;
    // attract
    this.attractX = 0; this.attractY = 0;
    this.attractTimer = 0;
    // explode
    this.explodeTimer = 0;
  }

  attractTo(x, y) {
    this.attractX = x; this.attractY = y;
    this.phase = 'attracted';
    this.attractTimer = 0.25;
  }

  bite() {
    if (this.dead || this.health <= 0) return false;
    this.health--;
    this.shakeTimer = 0.35; this.squishScale = 0.5; this.flashTimer = 0.2;
    if (this.health === 2) {
      this.crushState = CABBAGE_STATES.CRUSH1;
      this.crushScaleX = 1.15; this.crushScaleY = 0.88;
    } else if (this.health === 1) {
      this.crushState = CABBAGE_STATES.CRUSH2;
      this.crushScaleX = 1.3; this.crushScaleY = 0.75;
    } else if (this.health <= 0) {
      this.phase = 'exploding';
      this.explodeTimer = 0.08;
      return true;
    }
    return false;
  }

  getImage() {
    switch (this.crushState) {
      case CABBAGE_STATES.CRUSH1: return Assets.lettuce.crush1;
      case CABBAGE_STATES.CRUSH2: return Assets.lettuce.crush2;
      default: return Assets.lettuce.normal;
    }
  }

  update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.squishScale += (1 - this.squishScale) * Math.min(1, dt * 6);

    switch (this.phase) {
      case 'bouncing': {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotSpeed * dt;
        const r = this.size / 2;
        if (this.x - r < 0) { this.x = r; this.vx = Math.abs(this.vx) * this.bounciness; this.rotSpeed *= -0.8; }
        if (this.x + r > this.canvasW) { this.x = this.canvasW - r; this.vx = -Math.abs(this.vx) * this.bounciness; this.rotSpeed *= -0.8; }
        if (this.y - r < 0) { this.y = r; this.vy = Math.abs(this.vy) * this.bounciness; }
        if (this.y + r > this.canvasH) {
          this.y = this.canvasH - r;
          this.vy = -Math.abs(this.vy) * this.bounciness;
          this.vx *= 0.95;
        }
        // Keep minimum energy so it stays lively
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed < 80 && this.y + r >= this.canvasH - 5) {
          this.vy = -(150 + Math.random() * 100);
          this.vx += (Math.random() - 0.5) * 100;
        }
        break;
      }
      case 'attracted': {
        this.attractTimer -= dt;
        const t = Math.min(1, dt * 18);
        this.x += (this.attractX - this.x) * t;
        this.y += (this.attractY - this.y) * t;
        this.rotation *= 0.85;
        if (this.attractTimer <= 0) {
          this.phase = 'stuck';
        }
        break;
      }
      case 'stuck': {
        // Position is set externally by GameEngine
        this.rotation *= 0.95;
        break;
      }
      case 'exploding': {
        this.explodeTimer -= dt;
        this.scale = 1.5 + (0.08 - this.explodeTimer) * 10;
        this.opacity -= dt * 15;
        if (this.explodeTimer <= 0 || this.opacity <= 0) { this.dead = true; this.opacity = 0; }
        break;
      }
    }
  }

  draw(ctx) {
    if (this.dead || this.opacity <= 0) return;
    const img = this.getImage();
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      const i = this.shakeTimer / 0.35;
      shakeX = Math.sin(this.shakeTimer*60)*8*i; shakeY = Math.cos(this.shakeTimer*45)*4*i;
    }
    ctx.translate(this.x + shakeX, this.y + shakeY);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale*this.crushScaleX*this.squishScale, this.scale*this.crushScaleY*(2-this.squishScale));
    const hs = this.size / 2;
    ctx.drawImage(img, -hs, -hs, this.size, this.size);
    if (this.crushState === CABBAGE_STATES.CRUSH1) {
      ctx.globalAlpha = 0.15; ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(0, 0, hs*0.75, 0, Math.PI*2); ctx.fill();
    } else if (this.crushState === CABBAGE_STATES.CRUSH2) {
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#FF6B35';
      ctx.beginPath(); ctx.arc(0, 0, hs*0.75, 0, Math.PI*2); ctx.fill();
    }
    if (this.flashTimer > 0) {
      ctx.globalAlpha = this.flashTimer/0.2*0.6; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, hs*0.85, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  getHitRadius() { return this.size * 0.4 * this.scale; }
  isEdible() { return !this.dead && this.health > 0 && this.phase === 'bouncing'; }
  isStuck() { return !this.dead && this.phase === 'stuck'; }
}


// ─── Lion (Split-Jaw) ───────────────────────────────────────
class Lion {
  constructor() {
    this.x = 480; this.y = 300; this.baseScale = 0.5;
    this.jawOpen = 0; this.jawTarget = 0;
    this.jawMaxOffset = 60;
    this.bellyScale = 0; this.maneGlow = 0;

    // 에셋 렌더링 크기 — 상악 크게, 하악 작게 (귀여운 비율)
    this.UPPER_W = 340;
    this.UPPER_H = 340 * (306 / 349);
    this.LOWER_W = 240;
    this.LOWER_H = 240 * (151 / 253);
  }

  setJawFromPose(openAmount) { this.jawTarget = Math.max(0, Math.min(1, openAmount)); }

  /** 턱 스냅 (우걱우걱 제거, 빠르게 휙 닫힘) */
  snapJaw() {
    this.maneGlow = 1;
    this.bellyScale = Math.min(1, this.bellyScale + 0.12);
  }

  update(dt) {
    // 빠른 스냅 — 닫힐 때 더 빠르게
    const closing = this.jawTarget < this.jawOpen;
    const speed = closing ? 35 : 20;
    this.jawOpen += (this.jawTarget - this.jawOpen) * Math.min(1, speed * dt);
    this.jawOpen = Math.max(0, Math.min(1, this.jawOpen));
    if (this.maneGlow > 0) this.maneGlow = Math.max(0, this.maneGlow - dt * 2);
    if (this.bellyScale > 0) this.bellyScale = Math.max(0, this.bellyScale - dt * 0.15);
  }

  drawLowerJaw(ctx) {
    if (!Assets.lion.lower) return;
    const sc = this.baseScale;
    const jawDown = this.jawOpen * this.jawMaxOffset;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(sc, sc);
    if (this.bellyScale > 0.01) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFE8A8';
      ctx.beginPath();
      ctx.ellipse(0, this.LOWER_H*0.6+jawDown, 50*this.bellyScale, 30*this.bellyScale, 0, 0, Math.PI*2);
      ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(0, jawDown);
    ctx.drawImage(Assets.lion.lower, -this.LOWER_W/2, 0, this.LOWER_W, this.LOWER_H);
    ctx.restore();
    ctx.restore();
  }

  drawUpperJaw(ctx) {
    if (!Assets.lion.upper) return;
    const sc = this.baseScale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(sc, sc);
    if (this.maneGlow > 0) { ctx.shadowColor = 'rgba(255,220,80,0.6)'; ctx.shadowBlur = 30 * this.maneGlow; }
    ctx.drawImage(Assets.lion.upper, -this.UPPER_W/2, -this.UPPER_H * 0.72, this.UPPER_W, this.UPPER_H);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  draw(ctx) { this.drawLowerJaw(ctx); this.drawUpperJaw(ctx); }

  /** 충돌 범위 = 상악 이미지 + 하악 이미지 + 사이 공간 전체 (월드 좌표) */
  getCollisionBounds() {
    const sc = this.baseScale;
    const jawDown = this.jawOpen * this.jawMaxOffset * sc;
    const w = Math.max(this.UPPER_W, this.LOWER_W) * sc;
    const top = this.y - this.UPPER_H * 0.72 * sc;
    const bottom = this.y + jawDown + this.LOWER_H * sc;
    return {
      left: this.x - w / 2,
      top: top,
      right: this.x + w / 2,
      bottom: bottom,
      width: w,
      height: bottom - top,
      centerX: this.x,
      centerY: (top + bottom) / 2,
    };
  }

  /** 디버그: 충돌 범위 붉은 쉐이드 그리기 */
  drawCollisionDebug(ctx) {
    const b = this.getCollisionBounds();
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(b.left, b.top, b.width, b.height);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.left, b.top, b.width, b.height);
    ctx.restore();
  }
}


// ─── Particle System ────────────────────────────────────────
class ParticleSystem {
  constructor() { this.particles = []; }

  emitEat(x, y, intensity = 1) {
    const count = Math.floor(18 * intensity);
    const emojis = ['🥬', '⭐', '💚', '🌿', '✨', '🎉', '💥', '🔥'];
    const colors = ['#CFEFCF', '#E8D7FF', '#FFD6E8', '#FFE8A8', '#FFD700', '#FF6B6B', '#FF8C00'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = (120 + Math.random() * 220) * Math.max(1, intensity * 0.7);
      this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-100*intensity,
        life: 1.2+Math.random()*1.0*intensity, age: 0, size: (8+Math.random()*12)*Math.min(2.5, intensity*0.7),
        color: colors[Math.floor(Math.random()*colors.length)],
        emoji: Math.random()<0.6 ? emojis[Math.floor(Math.random()*emojis.length)] : null });
    }
  }

  emitCrush(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*120, vy: -50-Math.random()*80,
        life: 0.6+Math.random()*0.3, age: 0, size: 4+Math.random()*6,
        color: ['#B8E6B8','#CFEFCF','#A6D9A6','#FFE8A8'][Math.floor(Math.random()*4)],
        emoji: Math.random()<0.3 ? '💥' : null });
    }
  }

  emitBiteSparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI*2/6)*i;
      this.particles.push({ x, y, vx: Math.cos(a)*60, vy: Math.sin(a)*60,
        life: 0.4, age: 0, size: 3+Math.random()*4, color: '#fff', emoji: null });
    }
  }

  update(dt) {
    for (let i = this.particles.length-1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt; p.vy += 500*dt; p.x += p.vx*dt; p.y += p.vy*dt;
      if (p.age >= p.life) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, 1-p.age/p.life);
      ctx.globalAlpha = alpha;
      if (p.emoji) {
        ctx.font = `${p.size*2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}


// ─── Confetti / Ending System ───────────────────────────────
class EndingSystem {
  constructor(cw, ch) {
    this.CW = cw; this.CH = ch;
    this.active = false;
    this.confetti = [];      // 초기 폭발 콘페티
    this.fallingPieces = []; // box2d 스타일 떨어지는 조각들
    this.floorMap = [];      // 바닥 높이맵 (쌓이는 효과)
    this.timer = 0;
    this.spawnTimer = 0;
    this.COLS = 48;          // 높이맵 컬럼 수
    this.score = 0;
    this.totalBites = 0;
    this.textAlpha = 0;
  }

  start(score, totalBites, levelCleared = false, level = 1) {
    this.active = true;
    this.score = score;
    this.totalBites = totalBites;
    this.levelCleared = levelCleared;
    this.level = level;
    this.timer = 0;
    this.spawnTimer = 0;
    this.textAlpha = 0;
    this.displayScore = 0; // 카운트업 애니메이션용
    this.titleScale = 0;   // 줌인 등장용
    this.starCount = Math.min(3, Math.floor(score / 3) + (score > 0 ? 1 : 0)); // 별 등급
    this.confetti = [];
    this.fallingPieces = [];
    this.floorMap = new Array(this.COLS).fill(0);

    // 초기 폭발 콘페티 (여러 발)
    for (let burst = 0; burst < 3; burst++) {
      const bx = this.CW * (0.25 + burst * 0.25);
      const by = this.CH * 0.35;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 200 + Math.random() * 400;
        this.confetti.push({
          x: bx, y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 300,
          size: 4 + Math.random() * 8,
          color: this._randomColor(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 15,
          life: 2 + Math.random() * 2,
          age: 0 + burst * 0.3,
          type: Math.random() < 0.3 ? 'circle' : 'rect',
        });
      }
    }
  }

  stop() {
    this.active = false;
    this.confetti = [];
    this.fallingPieces = [];
  }

  _randomColor() {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6B9D',
                    '#C084FC','#FB923C','#34D399','#F472B6','#FBBF24',
                    '#A78BFA','#38BDF8','#FFE8A8','#CFEFCF','#FFD6E8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  _randomEmoji() {
    const emojis = ['🥬','⭐','🎉','🎊','💚','✨','🦁','🌟','🏆','💫','🎈','🎀'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    // 텍스트 페이드인 + 제목 줌인 + 점수 카운트업
    if (this.textAlpha < 1) this.textAlpha = Math.min(1, this.textAlpha + dt * 2);
    if (this.titleScale < 1) this.titleScale = Math.min(1, this.titleScale + dt * 3);
    if (this.timer > 0.5 && this.displayScore < this.score) {
      this.displayScore = Math.min(this.score, this.displayScore + dt * Math.max(3, this.score * 1.5));
    }

    // 폭발 콘페티 업데이트
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.age += dt;
      if (c.age < 0) continue; // 딜레이
      c.vy += 400 * dt; // gravity
      c.vx *= 0.99;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.rotSpeed * dt;
      if (c.age >= c.life) this.confetti.splice(i, 1);
    }

    // (떨어지는 이모티콘 쌓기 제거됨)
  }

  draw(ctx) {
    if (!this.active) return;

    // 폭발 콘페티
    for (const c of this.confetti) {
      if (c.age < 0) continue;
      const alpha = Math.max(0, 1 - c.age / c.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      if (c.type === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, c.size, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-c.size, -c.size * 0.4, c.size * 2, c.size * 0.8);
      }
      ctx.restore();
    }

    // (떨어지는 이모티콘 그리기 제거됨)

    // 텍스트 오버레이 (드라마틱 연출)
    if (this.textAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.textAlpha;

      // 반투명 배경 (더 넓고 진하게)
      const bgGrad = ctx.createLinearGradient(0, this.CH * 0.1, 0, this.CH * 0.65);
      bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bgGrad.addColorStop(0.15, 'rgba(0,0,0,0.5)');
      bgGrad.addColorStop(0.85, 'rgba(0,0,0,0.5)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, this.CH * 0.1, this.CW, this.CH * 0.55);

      const cx = this.CW / 2;

      // 메인 텍스트 (줌인 바운스 등장)
      const bounce = Math.sin(this.timer * 3) * 4;
      const titleEase = this.titleScale < 1 ? Math.pow(this.titleScale, 0.5) * 1.2 : 1 + Math.sin(this.timer * 2) * 0.03;
      ctx.save();
      ctx.translate(cx, this.CH * 0.24 + bounce);
      ctx.scale(titleEase, titleEase);
      // 글로우 이펙트
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFD700';
      ctx.font = "bold 68px 'Apple SD Gothic Neo', sans-serif";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5;
      const titleText = this.levelCleared ? `레벨 ${this.level} 클리어!` : '잘했어요!';
      ctx.strokeText(titleText, 0, 0);
      ctx.fillText(titleText, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      // 별 등급 표시
      if (this.timer > 0.4) {
        const starY = this.CH * 0.33;
        const starSize = 36;
        ctx.font = `${starSize}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const starX = cx + (i - 1) * 50;
          const delay = 0.4 + i * 0.2;
          if (this.timer > delay) {
            const pop = Math.min(1, (this.timer - delay) * 5);
            const popScale = pop < 1 ? pop * 1.3 : 1 + Math.sin(this.timer * 4 + i) * 0.05;
            ctx.save();
            ctx.translate(starX, starY);
            ctx.scale(popScale, popScale);
            ctx.globalAlpha = this.textAlpha * (i < this.starCount ? 1 : 0.2);
            ctx.fillText(i < this.starCount ? '⭐' : '☆', 0, 0);
            ctx.restore();
          }
        }
        ctx.globalAlpha = this.textAlpha;
      }

      // 점수 (카운트업 애니메이션)
      if (this.timer > 0.5) {
        const ds = Math.floor(this.displayScore);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 38px 'Apple SD Gothic Neo', sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
        const scoreText = `🥬 ${ds}개 먹었어요!`;
        ctx.strokeText(scoreText, cx, this.CH * 0.42);
        ctx.fillText(scoreText, cx, this.CH * 0.42);
        ctx.shadowBlur = 0;

        ctx.font = "600 22px 'Apple SD Gothic Neo', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`총 ${this.totalBites}번 물었어요`, cx, this.CH * 0.50);
      }

      // 격려 메시지
      if (this.timer > 1.5) {
        const messages = this.levelCleared ? '완벽해요! 다음 레벨로!' : this.score >= 10 ? '대단해요! 최고!' : this.score >= 5 ? '정말 잘했어!' : this.score >= 1 ? '잘했어요!' : '다음엔 더 잘할 수 있어요!';
        const msgAlpha = Math.min(1, (this.timer - 1.5) * 2);
        ctx.globalAlpha = this.textAlpha * msgAlpha;
        ctx.fillStyle = '#FFE8A8';
        ctx.font = "bold 26px 'Apple SD Gothic Neo', sans-serif";
        ctx.fillText(messages, cx, this.CH * 0.57);
        ctx.globalAlpha = this.textAlpha;
      }

      // 다시하기 안내 (깜빡이)
      if (this.timer > 2.5) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.timer * 4);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 20px 'Apple SD Gothic Neo', sans-serif";
        const restartText = this.levelCleared ? '스페이스바를 눌러 다음 레벨!' : '스페이스바를 눌러 다시 시작!';
        ctx.fillText(restartText, cx, this.CH * 0.64);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}


// ─── Collision Detection (Lion 이미지 기반) ─────────────────
function checkLionCollision(lion, cabbage) {
  const b = lion.getCollisionBounds();
  const r = cabbage.getHitRadius();
  const cx = cabbage.x, cy = cabbage.y;
  // 원(cabbage) vs 사각형(lion bounds) 충돌
  const closestX = Math.max(b.left, Math.min(cx, b.right));
  const closestY = Math.max(b.top, Math.min(cy, b.bottom));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx * dx + dy * dy) <= (r * r);
}


// ─── Floating Text ──────────────────────────────────────────
class FloatingText {
  constructor() { this.texts = []; }
  add(text, x, y, color = '#fff', size = 28) {
    this.texts.push({ text, x, y, color, size, age: 0, life: 1.2 });
  }
  update(dt) {
    for (let i = this.texts.length-1; i >= 0; i--) {
      const t = this.texts[i]; t.age += dt; t.y -= 40*dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const t of this.texts) {
      const alpha = Math.max(0, 1-t.age/t.life);
      const scale = 1 + Math.sin(t.age*8)*0.06;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y); ctx.scale(scale, scale);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px 'Apple SD Gothic Neo', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.strokeText(t.text, 0, 0); ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}


// ─── Screen Shake ───────────────────────────────────────────
class ScreenShake {
  constructor() { this.offsetX = 0; this.offsetY = 0; this.intensity = 0; this.timer = 0; this.duration = 0.2; }
  trigger(intensity = 8, duration = 0.2) {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = Math.max(duration, this.timer);
    this.timer = this.duration;
  }
  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt; const t = Math.max(0, this.timer / this.duration);
      this.offsetX = (Math.random()-0.5)*2*this.intensity*t;
      this.offsetY = (Math.random()-0.5)*2*this.intensity*t;
    } else { this.offsetX = 0; this.offsetY = 0; this.intensity = 0; }
  }
}


// ─── Game Engine ────────────────────────────────────────────
class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.CW = canvas.width; this.CH = canvas.height;
    this.lion = new Lion();
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingText();
    this.screenShake = new ScreenShake();
    this.sound = new SoundManager();
    this.ending = new EndingSystem(canvas.width, canvas.height);
    this.cabbages = [];
    this.score = 0; this.totalBites = 0; this.totalEaten = 0;
    this.timeLeft = 60; this.totalTime = 60;
    this.running = false; this.paused = false;
    this.gameEnded = false;
    this.flashAlpha = 0; this.flashColor = '#fff';
    this.config = { cabbageSize: 100, fxIntensity: 1, maxCabbages: 5, spawnWaitSec: 10, clearGoal: 10 };
    this.level = 1;
    this.levelCleared = false;
    this._lastTime = 0;
  }

  async init() {
    await Assets.load();
    this.sound.init();
    this.sound.loadCheerVoices();
    this.lion.x = this.CW / 2;
    this.lion.y = this.CH * 0.55;
  }

  start() {
    this.running = true; this.paused = false; this.gameEnded = false;
    this.levelCleared = false;
    this.score = 0; this.totalBites = 0; this.totalEaten = 0;
    this.cabbages = [];
    this.particles.particles = []; this.floatingText.texts = [];
    this.lion.bellyScale = 0; this.lion.jawOpen = 0;
    this._lastTime = performance.now();
    this.ending.stop();
    this.sound.resume(); this.sound.startBGM();
    this.spawnCabbage();
  }

  stop() {
    this.running = false;
    this.sound.stopBGM();
  }

  startNextLevel() {
    this.level++;
    this.running = true; this.paused = false; this.gameEnded = false;
    this.levelCleared = false;
    this.totalEaten = 0;
    this.cabbages = [];
    this.particles.particles = []; this.floatingText.texts = [];
    this.lion.jawOpen = 0;
    this.timeLeft = 60; this.totalTime = 60;
    this._lastTime = performance.now();
    this.ending.stop();
    this.sound.resume(); this.sound.startBGM();
    this.spawnCabbage();
  }

  spawnCabbage() {
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -60 : this.CW + 60;
    const startY = this.CH * (0.1 + Math.random() * 0.3);
    const vx = fromLeft ? (180 + Math.random() * 220) : -(180 + Math.random() * 220);
    const vy = -(120 + Math.random() * 180);
    const c = new Cabbage(startX, startY, vx, vy, this.config.cabbageSize, this.CW, this.CH);
    this.cabbages.push(c);
  }

  flash(color = '#fff', alpha = 0.3) { this.flashColor = color; this.flashAlpha = alpha; }

  tryBite() {
    if (!this.running || this.paused) return;
    this.totalBites++;
    this.sound.resume();
    this.lion.snapJaw();

    const bounds = this.lion.getCollisionBounds();
    const mouthX = bounds.centerX;
    const sc = this.lion.baseScale;
    const jawDown = this.lion.jawOpen * this.lion.jawMaxOffset * sc;
    const upperBottom = this.lion.UPPER_H * 0.28 * sc;
    const mouthY = this.lion.y + upperBottom + jawDown * 0.35;

    const praisePool = ['잘했어!', '대단해!', '최고야!', '멋져!', '와 잘한다!', '굿!'];

    // 1) 이미 끼여있는 양배추가 있으면 그것을 물기
    let stuck = this.cabbages.find(c => c.isStuck());
    if (stuck) {
      const fullyEaten = stuck.bite();
      this.sound.playCrunchBite(); // 와구작 크런치 사운드
      this.particles.emitBiteSparkle(stuck.x, stuck.y);

      if (fullyEaten) {
        this.score++; this.totalEaten++;
        // 최대 타격감 폭발!
        this.particles.emitEat(stuck.x, stuck.y, 5);
        this.floatingText.add('+1 🥬', stuck.x, stuck.y - 30, '#FFD700', 52);
        this.sound.playEatComplete();
        this.screenShake.trigger(35, 0.6);
        this.flash('#FFD700', 0.7);
        // 2차 지연 쉐이크 (여운)
        setTimeout(() => { this.screenShake.trigger(18, 0.3); this.flash('#fff', 0.25); }, 120);
        // 칭찬 피드백 (매 먹을 때 + 특별 칭찬)
        const praise = praisePool[this.totalEaten % praisePool.length];
        this.floatingText.add(praise, this.CW/2, this.CH*0.15, '#fff', 40);
        this.sound.playPraise(praise);
        if (this.totalEaten % 5 === 0) {
          this.floatingText.add('🏆 ' + this.totalEaten + '개 달성!', this.CW/2, this.CH*0.22, '#FFD700', 36);
        }
      } else {
        this.particles.emitCrush(stuck.x, stuck.y);
        this.sound.playCrush();
        this.screenShake.trigger(16, 0.3);
        this.flash('#fff', 0.3);
        const r = stuck.health;
        this.floatingText.add(r===2 ? '아삭! 🥬' : '우적! 💥', stuck.x, stuck.y-20, r===2 ? '#8fc98f' : '#FF8C00', 34);
      }
      return;
    }

    // 2) 가장 가까운 bouncing 양배추를 잡아서 끌어오기
    let best = null, bestDist = Infinity;
    for (const c of this.cabbages) {
      if (!c.isEdible()) continue;
      const dx = c.x - mouthX, dy = c.y - mouthY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < bestDist) { bestDist = dist; best = c; }
    }

    if (!best) return;

    // 양배추를 입으로 끌어당기고 첫 물기
    best.attractTo(mouthX, mouthY);
    const fullyEaten = best.bite();
    this.sound.playBite();
    this.particles.emitBiteSparkle(mouthX, mouthY);
    this.particles.emitCrush(best.x, best.y);
    this.sound.playCrush();
    this.screenShake.trigger(6, 0.15);
    this.flash('#fff', 0.12);
    this.floatingText.add('아삭! 🥬', best.x, best.y-20, '#8fc98f', 30);

    if (fullyEaten) {
      this.score++; this.totalEaten++;
      this.particles.emitEat(best.x, best.y, 5);
      this.floatingText.add('+1 🥬', best.x, best.y-30, '#FFD700', 52);
      this.sound.playEatComplete();
      this.screenShake.trigger(35, 0.6);
      this.flash('#FFD700', 0.7);
      setTimeout(() => { this.screenShake.trigger(18, 0.3); this.flash('#fff', 0.25); }, 120);
      const praise = praisePool[this.totalEaten % praisePool.length];
      this.floatingText.add(praise, this.CW/2, this.CH*0.15, '#fff', 40);
      this.sound.playPraise(praise);
    }
  }

  tick(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    // 엔딩 업데이트 (게임 끝나도 계속)
    if (this.ending.active) this.ending.update(dt);

    // 게임 끝나도 사자/파티클/쉐이크 계속 업데이트 (화면 freeze 방지)
    this.lion.update(dt);
    this.particles.update(dt);
    this.floatingText.update(dt);
    this.screenShake.update(dt);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);

    if (!this.running || this.paused) return;

    this.timeLeft -= dt;
    // 게임 종료 조건: 시간 종료 OR 클리어 목표 달성
    const timeUp = this.timeLeft <= 0;
    const goalReached = this.totalEaten >= this.config.clearGoal;
    if (timeUp || goalReached) {
      if (timeUp) this.timeLeft = 0;
      this.levelCleared = goalReached;
      this.stop();
      this.gameEnded = true;
      this.ending.start(this.score, this.totalBites, this.levelCleared, this.level);
      this.sound.playFanfare();
      this.flash('#FFD700', 0.6);
      this.screenShake.trigger(15, 0.4);
      const endPraise = goalReached ? '레벨 클리어! 대단해!' : this.score >= 10 ? '대단해요! 정말 최고야!' : this.score >= 5 ? '와 정말 잘했어!' : this.score >= 1 ? '잘했어요!' : '수고했어요!';
      setTimeout(() => this.sound.playPraise(endPraise), 800);
      if (this.onGameEnd) this.onGameEnd(this.score, this.levelCleared);
      return;
    }

    // 스폰 로직: 0개면 즉시 스폰. 10초 이상 먹히지 않은 양배추가 있으면 +1 (최대 5개)
    const alive = this.cabbages.filter(c => !c.dead);
    const now = performance.now();
    if (alive.length === 0) {
      this.spawnCabbage();
    } else if (alive.length < this.config.maxCabbages) {
      const oldest = alive.reduce((a, b) => a.spawnTime < b.spawnTime ? a : b);
      const newest = alive.reduce((a, b) => a.spawnTime > b.spawnTime ? a : b);
      if (now - oldest.spawnTime > this.config.spawnWaitSec * 1000 &&
          now - newest.spawnTime > this.config.spawnWaitSec * 1000) {
        this.spawnCabbage();
      }
    }

    // stuck 양배추는 사자 턱 사이 위치로 고정
    const sc = this.lion.baseScale;
    const jawDown = this.lion.jawOpen * this.lion.jawMaxOffset * sc;
    for (const c of this.cabbages) {
      if (c.phase === 'stuck') {
        c.x = this.lion.x;
        const upperBottom = this.lion.UPPER_H * 0.28 * sc;
        c.y = this.lion.y + upperBottom + jawDown * 0.35;
      }
      c.update(dt);
    }
    this.cabbages = this.cabbages.filter(c => !c.dead);
  }

  renderCameraBackground(video) {
    if (!video || video.readyState < 2) return;
    const ctx = this.ctx;
    ctx.save(); ctx.translate(this.CW, 0); ctx.scale(-1, 1);
    const vw = video.videoWidth||640, vh = video.videoHeight||480;
    const va = vw/vh, ca = this.CW/this.CH;
    let sx=0,sy=0,sw=vw,sh=vh;
    if (va>ca) { const nw=vh*ca; sx=(vw-nw)/2; sw=nw; }
    else { const nh=vw/ca; sy=(vh-nh)/2; sh=nh; }
    ctx.drawImage(video, sx,sy,sw,sh, 0,0, this.CW,this.CH);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0,0, this.CW,this.CH);
  }
}


// ─── Export ─────────────────────────────────────────────────
window.GameEngine = GameEngine;
window.Assets = Assets;
window.Lion = Lion;
window.Cabbage = Cabbage;
window.ParticleSystem = ParticleSystem;
window.FloatingText = FloatingText;
window.SoundManager = SoundManager;
window.ScreenShake = ScreenShake;
window.EndingSystem = EndingSystem;
window.CABBAGE_STATES = CABBAGE_STATES;
window.checkLionCollision = checkLionCollision;
