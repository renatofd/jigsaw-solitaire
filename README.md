# Jigsaw Cards (webgame)

Protótipo do passo 1: grade de cartas, arrastar para trocar, grupos que se movem juntos, encaixe em cadeia e vitória.

- `src/logic.ts`: regras puras (tabuleiro, grupos, movimento, embaralhar).
- `src/images.ts`: ilustrações geradas por código (sem fotos com direitos).
- `src/main.ts`: renderização PixiJS, arrastar com mouse/toque, fases.

## Rodar
    npm install
    npm run dev        # ou: npx vite
    npx vite build     # site estático em dist/
    npx vite build -c vite.artifact.config.ts   # arquivo único em dist-single/

Teste automático (resolve a fase 1 no PC e no celular): `npx vite preview` e depois `node tests/playtest.mjs`.

## Poki
O SDK do Poki vem de `game-cdn.poki.com` no `<head>` (`src/poki.ts`). Se não carregar (bloqueador, offline), o jogo segue normal.
- `init()` antes de montar a tela inicial; `gameLoadingFinished()` quando ela aparece.
- `gameplayStart()` ao abrir um nível (sempre por toque do jogador); `gameplayStop()` na vitória e ao voltar para o menu. Nunca repete o mesmo evento seguido.
- Setas, espaço e roda do mouse não rolam a página do Poki. Ainda sem anúncios (`commercialBreak`).

Game events (`measure(categoria, o quê, ação)`):

| categoria | o quê | ações |
|---|---|---|
| `level` | id da imagem (`paisagens-01`) | `start`, `resume` (partida salva), `complete`, `quit` |
| `tutorial` | `first-move` | `start`, `complete`, `fail` (saiu antes do primeiro encaixe) |
| `button` | `hint` | `visible` (a cada nível), `interact` (usou dica) |
| `button` | `theme-next`, `theme-prev`, `settings`, `collection` | `interact` |
| `hint` | `empty` | `tap` (tocou sem dicas) |
| `difficulty` | `grid-3` … `grid-7` | `moves-up-to-1x/2x/3x`, `moves-over-3x` (movimentos ÷ cartas), `hints-0` … `hints-4-plus` |
| `progress` | `levels-1`, `levels-2`, `levels-3`, `levels-5`, `levels-10` … `levels-70` | `reached` |
| `theme` | id do tema | `complete` |
| `collection` | `picture` | `view` |
| `settings` | `music`, `sfx` / `language` / `reset-progress` | `on`/`off` / código do idioma / `confirm` |

Teste com SDK falso (tutorial + ordem dos eventos): `npx vite preview` e `node tests/poki.mjs`.
