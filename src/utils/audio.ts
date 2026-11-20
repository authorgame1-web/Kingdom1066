const MUTE_KEY = 'k1066_muted';

// Semua file .mp3 di src/assets/music/ otomatis masuk playlist (urut nama file). Folder kosong = tanpa musik.
const MUSIC_FILES = import.meta.glob('../assets/music/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const MUSIC_VOLUME = 0.35;

class SoundFX {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private playlist: string[] = Object.keys(MUSIC_FILES)
    .sort()
    .map((k) => MUSIC_FILES[k]);
  private audioEl: HTMLAudioElement | null = null;
  private trackIdx = 0;
  private musicPlaying = false;
  private errorCount = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
    this.initMusicAutoplay();
  }

  public hasMusic(): boolean {
    return this.playlist.length > 0;
  }

  private ensureMusicEl(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined' || !this.playlist.length) return null;
    if (!this.audioEl) {
      const a = new Audio();
      a.preload = 'auto';
      a.volume = MUSIC_VOLUME;
      a.loop = this.playlist.length === 1;
      a.addEventListener('ended', () => this.nextTrack());
      a.addEventListener('error', () => {
        this.errorCount += 1;
        if (this.errorCount < this.playlist.length) this.nextTrack();
      });
      this.trackIdx = Math.floor(Math.random() * this.playlist.length);
      a.src = this.playlist[this.trackIdx];
      this.audioEl = a;
    }
    return this.audioEl;
  }

  private nextTrack(): void {
    const a = this.audioEl;
    if (!a || this.playlist.length < 2) return;
    this.trackIdx = (this.trackIdx + 1) % this.playlist.length;
    a.src = this.playlist[this.trackIdx];
    if (!this.muted && this.musicPlaying) a.play().catch(() => {});
  }

  public startMusic(): void {
    if (this.muted) return;
    const a = this.ensureMusicEl();
    if (!a) return;
    this.musicPlaying = true;
    a.play().catch(() => {});
  }

  public pauseMusic(): void {
    if (this.audioEl) this.audioEl.pause();
  }

  // Android memblokir autoplay: musik baru mulai setelah ketukan pertama pemain.
  private initMusicAutoplay(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !this.playlist.length) return;
    const onFirstTouch = () => this.startMusic();
    window.addEventListener('pointerdown', onFirstTouch, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.pauseMusic();
      else if (this.musicPlaying && !this.muted) this.audioEl?.play().catch(() => {});
    });
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    if (this.muted) this.pauseMusic();
    else this.startMusic();
    return this.muted;
  }

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playChime(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  public playDrum(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playClick(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const sfx = new SoundFX();
