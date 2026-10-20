// Música de fundo e efeitos sonoros. Usa <audio> (funciona também abrindo o jogo via file://).

const SFX = ['click', 'pick', 'drop', 'merge', 'hint', 'win', 'theme', 'locked'] as const;
export type Sfx = (typeof SFX)[number];
const PLAYLIST = ['audio/music-1.mp3', 'audio/music-2.mp3', 'audio/music-3.mp3'];
const MUSIC_VOLUME = 0.35;
const SFX_VOLUME: Partial<Record<Sfx, number>> = { pick: 0.5, theme: 0.5, drop: 0.7, locked: 0.6 };

const pools = new Map<Sfx, HTMLAudioElement[]>();
let musicEl: HTMLAudioElement | null = null;
let track = Math.floor(Math.random() * PLAYLIST.length);
let musicOn = true;
let sfxOn = true;
let unlocked = false;

function pool(name: Sfx): HTMLAudioElement[] {
  let list = pools.get(name);
  if (!list) {
    const base = new Audio(`audio/${name}.mp3`);
    base.preload = 'auto';
    list = [base];
    pools.set(name, list);
  }
  return list;
}

export function play(name: Sfx) {
  if (!sfxOn || !unlocked) return;
  const list = pool(name);
  // reaproveita um elemento livre; se todos estiverem tocando, cria outro (até 4)
  let el = list.find((a) => a.paused || a.ended);
  if (!el) {
    if (list.length >= 4) return;
    el = list[0].cloneNode() as HTMLAudioElement;
    list.push(el);
  }
  el.volume = SFX_VOLUME[name] ?? 0.8;
  el.currentTime = 0;
  void el.play().catch(() => {});
}

function startMusic() {
  if (!musicOn || !unlocked) return;
  if (!musicEl) {
    musicEl = new Audio(PLAYLIST[track]);
    musicEl.volume = MUSIC_VOLUME;
    musicEl.addEventListener('ended', () => {
      track = (track + 1) % PLAYLIST.length;
      musicEl!.src = PLAYLIST[track];
      void musicEl!.play().catch(() => {});
    });
  }
  void musicEl.play().catch(() => {});
}

export function setMusic(on: boolean) {
  musicOn = on;
  if (on) startMusic();
  else musicEl?.pause();
}

export function setSfx(on: boolean) {
  sfxOn = on;
}

/** Navegadores só liberam áudio depois do primeiro toque ou clique. */
export function initAudio(music: boolean, sfx: boolean) {
  musicOn = music;
  sfxOn = sfx;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    for (const name of SFX) pool(name);
    startMusic();
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
  // pausa a música quando a aba fica oculta
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) musicEl?.pause();
    else startMusic();
  });
}
