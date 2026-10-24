// Integração com o SDK do Poki (https://developers.poki.com/guide/sdk-html5).
// O script vem do CDN do Poki no <head>; se não carregar (bloqueador, offline, file://),
// todas as chamadas viram nada e o jogo segue normal.

interface PokiSDKApi {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  measure(category: string, what: string, action: string): void;
}

const sdk = (): PokiSDKApi | undefined => (window as unknown as { PokiSDK?: PokiSDKApi }).PokiSDK;

function call(fn: (s: PokiSDKApi) => void) {
  const s = sdk();
  if (!s) return;
  try { fn(s); } catch { /* o SDK nunca derruba o jogo */ }
}

/** Inicia o SDK. Sempre resolve: o jogo começa mesmo se o Poki falhar ou demorar. */
export function initPoki(): Promise<void> {
  const s = sdk();
  if (!s) return Promise.resolve();
  const init = Promise.resolve().then(() => s.init()).catch(() => {});
  const timeout = new Promise<void>((r) => setTimeout(r, 3000));
  return Promise.race([init, timeout]);
}

let loadingDone = false;
export function loadingFinished() {
  if (loadingDone) return;
  loadingDone = true;
  call((s) => s.gameLoadingFinished());
}

// O Poki pede para nunca mandar o mesmo evento duas vezes seguidas.
let playing = false;
export function gameplayStart() {
  if (playing) return;
  playing = true;
  call((s) => s.gameplayStart());
}
export function gameplayStop() {
  if (!playing) return;
  playing = false;
  call((s) => s.gameplayStop());
}

/**
 * Game event (https://developers.poki.com/guide/game-events).
 * Ações especiais: start/complete/fail (funil) e visible/interact (botões); o resto é livre.
 * "/" e "^" são reservados pelo Poki, então são trocados por "-".
 */
export function measure(category: string, what: string | number, action: string) {
  const clean = (v: string | number) => String(v).replace(/[/^]/g, '-');
  call((s) => s.measure(clean(category), clean(what), clean(action)));
}
