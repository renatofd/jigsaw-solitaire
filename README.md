# Jigsaw Solitaire (webgame)

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
