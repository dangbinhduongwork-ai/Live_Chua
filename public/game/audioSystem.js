/**
 * audioSystem.js - Hệ thống Âm thanh Tâm linh Phật giáo & Giọng Đọc Chúc Phúc (Web Audio API + TTS)
 * - Tự động tổng hợp (procedural) Nhạc Thiền Ngũ Cung (Đàn Tranh / Guzheng, Harp, Chuông Xoay & Pad ấm áp)
 *   êm dịu, thanh tịnh, hoàn toàn bằng thuật toán âm thanh, không cần file MP3 ngoài.
 * - Tự động đọc Lời Chúc Bình An bằng giọng tiếng Việt truyền cảm khi có Phật tử lên dâng hương.
 */

class TempleAudioSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.reverbNode = null;
    this.ambientOscillators = [];
    this.isAmbientPlaying = false;
    this.userStoppedAmbient = false; // Ghi nhớ nếu người dùng chủ động tắt nhạc nền
    this.meritScore = 0;

    // Timers cho hệ thống nhạc nền tự sinh (Procedural Zen Music)
    this.melodyTimer = null;
    this.chordTimer = null;
    this.chimeTimer = null;
    this.currentChordIdx = 0;
    this.melodyStep = 0;

    // Hàng đợi đọc lời chúc bình an để không bị chồng giọng khi nhiều người dâng hương liên tiếp
    this.ttsQueue = [];
    this.isSpeaking = false;
    this.currentAudio = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }
    this.ctx = new AudioContext();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Ambient Sub-Gain (Nhạc nền dễ chịu, êm ái)
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.42, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Tạo hiệu ứng vang không gian Chánh Điện (Warm Stereo Delay Reverb Network)
    this.setupReverbNetwork();
  }

  setupReverbNetwork() {
    if (!this.ctx) return;
    const delay1 = this.ctx.createDelay(2.0);
    const delay2 = this.ctx.createDelay(2.0);
    delay1.delayTime.value = 0.36;
    delay2.delayTime.value = 0.54;

    const feedback1 = this.ctx.createGain();
    const feedback2 = this.ctx.createGain();
    feedback1.gain.value = 0.38;
    feedback2.gain.value = 0.32;

    const dampFilter = this.ctx.createBiquadFilter();
    dampFilter.type = 'lowpass';
    dampFilter.frequency.value = 1400;

    const wetGain = this.ctx.createGain();
    wetGain.gain.value = 0.35;

    // Kết nối vòng lặp vang ấm
    delay1.connect(dampFilter);
    dampFilter.connect(feedback1);
    feedback1.connect(delay2);
    delay2.connect(feedback2);
    feedback2.connect(delay1);

    delay1.connect(wetGain);
    delay2.connect(wetGain);
    wetGain.connect(this.ambientGain);

    this.reverbInput = delay1;
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    // Tự động bật nhạc nền dễ chịu ngay khi AudioContext sẵn sàng (nếu người dùng chưa chủ động tắt)
    if (!this.isAmbientPlaying && !this.userStoppedAmbient && this.ctx) {
      this.startAmbient();
      window.dispatchEvent(new CustomEvent('ambient-state-changed', { detail: { playing: true } }));
    }
  }

  /**
   * Thỉnh Chuông Đại Hồng Chung (Temple Bell / Chuông Chùa Ngân Vang)
   */
  playBell(options = {}) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const fundamental = options.frequency || 216;
    const intensity = options.intensity || 1.0;

    const harmonics = [
      { ratio: 0.5, gain: 0.7, decay: 8.0 },
      { ratio: 1.0, gain: 1.0, decay: 7.5 },
      { ratio: 1.414, gain: 0.65, decay: 6.0 },
      { ratio: 1.98, gain: 0.5, decay: 5.0 },
      { ratio: 2.76, gain: 0.35, decay: 4.0 },
      { ratio: 4.07, gain: 0.2, decay: 2.5 },
      { ratio: 5.42, gain: 0.1, decay: 1.5 }
    ];

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(2.2, t);
    lfoGain.gain.setValueAtTime(0.08, t);
    lfo.connect(lfoGain);
    lfo.start(t);
    lfo.stop(t + 8.5);

    harmonics.forEach(h => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * h.ratio, t);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 4, t);

      const targetGain = h.gain * 0.20 * intensity;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(targetGain, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + h.decay);

      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + h.decay + 0.1);
    });

    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(120, t);
    thudOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    thudGain.gain.setValueAtTime(0.25 * intensity, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);
    thudOsc.start(t);
    thudOsc.stop(t + 0.09);
  }

  /**
   * Tiếng Gõ Mõ Tụng Kinh (Wooden Fish)
   */
  playWoodblock() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    this.meritScore++;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(290, t + 0.035);

    oscGain.gain.setValueAtTime(0.001, t);
    oscGain.gain.exponentialRampToValueAtTime(0.38, t + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, t);
    filter.Q.setValueAtTime(7.0, t);

    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1400, t);
    clickOsc.frequency.exponentialRampToValueAtTime(300, t + 0.015);

    clickGain.gain.setValueAtTime(0.16, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.masterGain);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);
  }

  /**
   * Tiếng Chuông Bát Nhã / Chuông Xoay (Singing Bowl)
   */
  playSingingBowl(volumeScale = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const baseFreq = 432;

    [1.0, 2.76, 5.4].forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, t);

      const amp = (0.20 / (idx + 1)) * volumeScale;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 5.6);
    });
  }

  /**
   * Bật / Tắt Nhạc Thiền Nền Tự Sinh (Procedural Soothing Zen & Guzheng Music)
   */
  toggleAmbient(forceState) {
    if (!this.ctx) this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const shouldPlay = forceState !== undefined ? forceState : !this.isAmbientPlaying;
    if (shouldPlay === this.isAmbientPlaying) return this.isAmbientPlaying;

    if (shouldPlay) {
      this.userStoppedAmbient = false;
      this.startAmbient();
    } else {
      this.userStoppedAmbient = true;
      this.stopAmbient();
    }
    window.dispatchEvent(new CustomEvent('ambient-state-changed', { detail: { playing: this.isAmbientPlaying } }));
    return this.isAmbientPlaying;
  }

  /**
   * Khởi chạy Nhạc Nền Thiền Định Tự Sinh (Dễ chịu, thư thái, du dương):
   * 1. Lớp Pad Hòa Âm Ngũ Cung ấm áp chuyển hợp âm mượt mà
   * 2. Tiếng Đàn Tranh / Guzheng & Harp gảy giai điệu ngũ cung êm dịu
   * 3. Tiếng Sáo Thiền & Phong Linh thoảng nhẹ trong không gian
   */
  startAmbient() {
    if (!this.ctx || this.isAmbientPlaying) return;
    this.isAmbientPlaying = true;

    // 1. Vòng hợp âm Thiền (Warm Pentatonic Zen Chords)
    const chords = [
      [130.81, 196.00, 261.63, 329.63], // Cmaj9 ấm áp
      [110.00, 164.81, 220.00, 293.66], // Am7 tĩnh lặng
      [174.61, 220.00, 261.63, 349.23], // Fmaj7 thanh thản
      [146.83, 196.00, 246.94, 293.66]  // G6/D nhẹ nhàng
    ];

    const playNextChordPad = () => {
      if (!this.isAmbientPlaying || this.isMuted || !this.ctx) return;
      const chord = chords[this.currentChordIdx % chords.length];
      this.currentChordIdx++;
      this.playWarmPadChord(chord, 6.5);
    };

    // Phát hợp âm đầu tiên ngay lập tức và lặp mỗi 6 giây
    playNextChordPad();
    this.chordTimer = setInterval(playNextChordPad, 6000);

    // 2. Giai điệu Đàn Tranh (Guzheng / Harp) Ngũ Cung tự sinh dễ chịu
    // Thang âm Ngũ Cung chuẩn êm tai: C4, D4, E4, G4, A4, C5, D5, E5, G5, A5
    const pentatonicScale = [
      261.63, 293.66, 329.63, 392.00, 440.00,
      523.25, 587.33, 659.25, 783.99, 880.00
    ];

    // Các mẫu câu giai điệu thiền truyền thống (indices trong pentatonicScale)
    const peacefulPatterns = [
      [4, 5, 7, 5, 4, 2, 1, 0],
      [0, 2, 3, 4, 5, 4, 3, 2],
      [5, 7, 8, 7, 5, 4, 3, 4],
      [2, 4, 5, 4, 2, 0, 1, 2],
      [7, 5, 4, 5, 3, 2, 1, 0]
    ];
    let currentPattern = peacefulPatterns[0];
    let noteIdx = 0;

    const playNextMelodyNote = () => {
      if (!this.isAmbientPlaying || this.isMuted || !this.ctx) return;

      // Đôi khi nghỉ 1 nhịp để tạo khoảng lặng thiền định (breathing space)
      if (Math.random() < 0.18) {
        return;
      }

      const scaleIdx = currentPattern[noteIdx];
      const freq = pentatonicScale[scaleIdx] || 440;
      this.playGuzhengPluck(freq, 0.11 + Math.random() * 0.04);

      // Đôi khi gảy thêm nốt bè quãng 5 hoặc rải hợp âm nhẹ (arpeggio)
      if (noteIdx === 0 || noteIdx === 4) {
        const harmonyIdx = Math.max(0, scaleIdx - 2);
        setTimeout(() => {
          if (this.isAmbientPlaying && !this.isMuted) {
            this.playGuzhengPluck(pentatonicScale[harmonyIdx] * 0.5, 0.07);
          }
        }, 140);
      }

      noteIdx++;
      if (noteIdx >= currentPattern.length) {
        noteIdx = 0;
        currentPattern = peacefulPatterns[Math.floor(Math.random() * peacefulPatterns.length)];
        // Thỉnh thoảng ngân tiếng sáo trúc ấm hoặc chuông gió ở cuối câu nhạc
        if (Math.random() < 0.55) {
          this.playBambooFluteNote(pentatonicScale[4], 3.2);
        }
      }
    };

    this.melodyTimer = setInterval(playNextMelodyNote, 1150);

    // 3. Tiếng phong linh (Chuông gió) & Chuông xoay thoảng nhẹ
    this.chimeTimer = setInterval(() => {
      if (this.isAmbientPlaying && !this.isMuted) {
        if (Math.random() < 0.7) {
          this.playWindChime();
        } else {
          this.playSingingBowl(0.35);
        }
      }
    }, 6500);
  }

  /**
   * Phát hợp âm nền ấm áp (Warm Silk Pad) với bộ lọc Low-pass mềm mại
   */
  playWarmPadChord(freqs, duration = 6.5) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, t);

    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0.001, t);
    chordGain.gain.linearRampToValueAtTime(0.14, t + 2.2);
    chordGain.gain.linearRampToValueAtTime(0.10, t + duration - 2.0);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    filter.connect(chordGain);
    chordGain.connect(this.ambientGain);

    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.detune.setValueAtTime((idx - 1.5) * 4, t);

      const noteGain = this.ctx.createGain();
      noteGain.gain.setValueAtTime(0.25, t);

      osc.connect(noteGain);
      noteGain.connect(filter);

      osc.start(t);
      osc.stop(t + duration + 0.1);
    });
  }

  /**
   * Tiếng gảy Đàn Tranh / Guzheng / Harp thanh tao, êm dịu
   */
  playGuzhengPluck(freq, volume = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Âm chính (Sine ấm) + Âm sắc dây đàn (Triangle lọc mượt)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 2, t); // Họa âm bậc 2 nhẹ

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 1.2);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(volume, t + 0.018);
    env.gain.exponentialRampToValueAtTime(volume * 0.35, t + 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.18, t);
    harmGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc1.connect(filter);
    osc2.connect(harmGain);
    harmGain.connect(filter);

    filter.connect(env);
    env.connect(this.ambientGain);
    if (this.reverbInput) {
      env.connect(this.reverbInput);
    }

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.9);
    osc2.stop(t + 2.9);
  }

  /**
   * Tiếng Sáo Trúc Thiền Định (Soft Zen Bamboo Flute) ngân nhẹ
   */
  playBambooFluteNote(freq, duration = 3.0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Vibrato nhẹ nhàng tự nhiên của hơi sáo
    const vib = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vib.frequency.setValueAtTime(4.5, t);
    vibGain.gain.setValueAtTime(3.0, t);
    vib.connect(osc.frequency);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.055, t + 0.6);
    env.gain.linearRampToValueAtTime(0.045, t + duration - 0.8);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(env);
    env.connect(this.ambientGain);
    if (this.reverbInput) {
      env.connect(this.reverbInput);
    }

    vib.start(t);
    osc.start(t);
    vib.stop(t + duration + 0.1);
    osc.stop(t + duration + 0.1);
  }

  stopAmbient() {
    if (!this.ctx || !this.isAmbientPlaying) return;
    this.isAmbientPlaying = false;

    if (this.melodyTimer) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.chordTimer) {
      clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.chimeTimer) {
      clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }
  }

  /**
   * Tiếng Chuông Gió / Phong Linh (Wind Chime)
   */
  playWindChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const pentatonic = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
    const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.035, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

    osc.connect(gain);
    gain.connect(this.ambientGain);
    if (this.reverbInput) {
      gain.connect(this.reverbInput);
    }
    osc.start(t);
    osc.stop(t + 2.5);
  }

  /**
   * Làm sạch tên người dùng để đọc giọng nói tự nhiên
   */
  cleanNameForSpeech(rawName = 'Phật tử') {
    // Loại bỏ emoji và ký tự đặc biệt chỉ giữ chữ cái, số và khoảng trắng
    let cleaned = String(rawName || '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[_#@*~$%^+=|<>\\/?!.,:;"'()[\]{}-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 2) {
      return 'Quý Phật tử';
    }
    if (cleaned.length > 22) {
      cleaned = cleaned.slice(0, 22).trim();
    }
    return cleaned;
  }

  /**
   * Phân loại lời chúc theo tên quà tặng TikTok (Gia đình, Sự nghiệp, Tình yêu, Học hành, Bình an)
   */
  resolveBlessingCategory(giftName = '') {
    const g = String(giftName || '').toLowerCase().trim();
    if (g.includes('tiktok') || g.includes('gia đình') || g.includes('gia dinh') || g.includes('family')) {
      return 'gia_dinh';
    }
    if (g.includes('awesome') || g.includes('đỉnh') || g.includes('dinh') || g.includes('sự nghiệp') || g.includes('su nghiep') || g.includes('tài lộc')) {
      return 'su_nghiep';
    }
    if (g.includes('love') || g.includes('heart') || g.includes('yêu') || g.includes('yeu') || g.includes('tình yêu') || g.includes('tinh yeu') || g.includes('tim')) {
      return 'tinh_yeu';
    }
    if (g === 'gg' || g.includes('gg') || g.includes('glow') || g.includes('que phát sáng') || g.includes('học hành') || g.includes('hoc hanh') || g.includes('trí tuệ')) {
      return 'hoc_hanh';
    }
    if (g.includes('rose') || g.includes('hoa hồng') || g.includes('hoa hong') || g.includes('bình an') || g.includes('binh an') || g.includes('hoa sen')) {
      return 'binh_an';
    }
    return 'binh_an';
  }

  /**
   * Đọc Lời Chúc Ngắn Gọn, Trang Nghiêm Theo Nguyện Ước (~2.5 - 3s, khớp hoàn toàn với nhịp dâng hương)
   * Tự động hạ nhẹ âm lượng nhạc nền (audio ducking) để lời chúc nghe rõ ràng, không bao giờ bị chồng hay trễ nhịp
   */
  speakBlessing(donorName = 'Phật tử', giftName = '') {
    this.ensureContext();
    if (this.isMuted) return;

    const cleanName = this.cleanNameForSpeech(donorName);
    const category = this.resolveBlessingCategory(giftName);

    const categoryBlessings = {
      gia_dinh: [
        `Cảm tạ Phật tử ${cleanName}. Chúc gia đình thí chủ bình an, sum vầy hạnh phúc.`,
        `A Di Đà Phật. Chúc gia đạo Phật tử ${cleanName} luôn ấm êm, mạnh khỏe.`
      ],
      su_nghiep: [
        `Cảm tạ Phật tử ${cleanName}. Chúc thí chủ sự nghiệp hanh thông, tài lộc dồi dào.`,
        `A Di Đà Phật. Chúc Phật tử ${cleanName} công danh thăng tiến, vạn sự thành tựu.`
      ],
      tinh_yeu: [
        `Cảm tạ Phật tử ${cleanName}. Chúc thí chủ tình duyên viên mãn, trăm năm hạnh phúc.`,
        `A Di Đà Phật. Chúc Phật tử ${cleanName} thiện duyên gắn kết, hạnh phúc trọn vẹn.`
      ],
      hoc_hanh: [
        `Cảm tạ Phật tử ${cleanName}. Chúc thí chủ trí tuệ sáng suốt, thi cử đỗ đạt.`,
        `A Di Đà Phật. Chúc Phật tử ${cleanName} học hành tấn tới, bảng vàng vinh quy.`
      ],
      binh_an: [
        `Cảm tạ Phật tử ${cleanName}. Chúc thí chủ thân tâm an lạc, vạn sự bình an.`,
        `A Di Đà Phật. Chúc Phật tử ${cleanName} sức khỏe dồi dào, vạn sự cát tường.`
      ]
    };

    const list = categoryBlessings[category] || categoryBlessings.binh_an;
    const blessingText = list[Math.floor(Math.random() * list.length)];

    // Phát sự kiện để giao diện hiển thị dòng phụ đề lời chúc bình an và làm sáng ô lời chúc tương ứng
    window.dispatchEvent(new CustomEvent('blessing-spoken', {
      detail: { donorName: cleanName, blessingText, giftName, category }
    }));

    // Nếu câu trước vẫn còn đang đọc dở khi người mới đã lên dâng hương, ngắt câu cũ ngay để khớp 100% với người đang dâng hương
    this.stopCurrentSpeech();
    this.ttsQueue = [blessingText];
    this.processTtsQueue();
  }

  stopCurrentSpeech() {
    this.ttsQueue = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
      } catch (e) {
        // Ignore
      }
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignore
      }
    }
    this.isSpeaking = false;
  }

  processTtsQueue() {
    if (this.isSpeaking || this.ttsQueue.length === 0 || this.isMuted) return;

    const text = this.ttsQueue.shift();
    this.isSpeaking = true;

    // Hạ nhẹ nhạc nền xuống một chút để giọng đọc lời chúc bình an rõ ràng, truyền cảm
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.14, this.ctx.currentTime, 0.2);
    }

    const onFinish = () => {
      this.isSpeaking = false;
      this.currentAudio = null;
      // Khôi phục âm lượng nhạc nền êm dịu
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setTargetAtTime(0.42, this.ctx.currentTime, 0.4);
      }
      if (this.ttsQueue.length > 0) {
        setTimeout(() => this.processTtsQueue(), 100);
      }
    };

    // Ưu tiên phát qua luồng /api/tts tiếng Việt chuẩn giọng tự nhiên (tốc độ 1.28x gọn gàng, trang nghiêm)
    const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(ttsUrl);
    audio.volume = 0.95;
    audio.defaultPlaybackRate = 1.28;
    audio.playbackRate = 1.28;
    if ('preservesPitch' in audio) audio.preservesPitch = true;
    audio.onplay = () => {
      audio.playbackRate = 1.28;
    };
    this.currentAudio = audio;

    let handled = false;
    const finishOnce = () => {
      if (handled) return;
      handled = true;
      onFinish();
    };

    audio.onended = finishOnce;
    audio.onerror = () => {
      // Dự phòng bằng Web Speech API nếu không kết nối được /api/tts
      this.fallbackWebSpeech(text, finishOnce);
    };

    audio.play().catch(() => {
      this.fallbackWebSpeech(text, finishOnce);
    });
  }

  fallbackWebSpeech(text, onDone) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.rate = 1.24;
        utter.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang && v.lang.toLowerCase().includes('vi'));
        if (viVoice) utter.voice = viVoice;

        utter.onend = onDone;
        utter.onerror = onDone;
        window.speechSynthesis.speak(utter);
        setTimeout(onDone, 4000); // Safety timeout
        return;
      } catch (e) {
        // Ignore
      }
    }
    setTimeout(onDone, 800);
  }

  /**
   * Chế độ Tự Động Gõ Mõ Tụng Kinh (Auto Moktak Chanting Cadence)
   */
  toggleAutoMoktak(intervalMs = 1200) {
    this.ensureContext();
    if (this.moktakTimer) {
      clearInterval(this.moktakTimer);
      this.moktakTimer = null;
      return false;
    } else {
      this.playWoodblock();
      this.moktakTimer = setInterval(() => {
        if (!this.isMuted) {
          this.playWoodblock();
        }
      }, intervalMs);
      return true;
    }
  }

  /**
   * Chế độ Tự Động Thỉnh Chuông Định Kỳ (Auto Bell Chime)
   */
  toggleAutoBell(intervalMs = 45000) {
    this.ensureContext();
    if (this.bellTimer) {
      clearInterval(this.bellTimer);
      this.bellTimer = null;
      return false;
    } else {
      this.playBell({ intensity: 1.2 });
      this.bellTimer = setInterval(() => {
        if (!this.isMuted) {
          this.playBell({ intensity: 1.1 });
        }
      }, intervalMs);
      return true;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    if (this.isMuted && this.currentAudio) {
      this.currentAudio.pause();
    }
    return this.isMuted;
  }
}

export const templeAudio = new TempleAudioSystem();
