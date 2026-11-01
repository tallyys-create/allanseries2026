# AllanWoodTV — Tribunal de Tiers

Portal público com versões separadas para o Allan e os telespectadores.

- Página inicial: `index.html`
- Tier oficial de Séries 2026: `series-2026.html`
- Tier do público: `series-2026-publico.html`
- Estilos globais para todas as tiers presentes e futuras: `tier-global.css`

## Pôsteres e cenas

Para cada série, use apenas **`assets/series/<id>/poster.webp`**. O mesmo arquivo aparece na miniatura do catálogo, dentro da categoria e na ficha da série. **Não crie `poster-mini.webp`.** Caso não exista o pôster local, o site tenta a imagem externa cadastrada na ficha.

As cenas ficam em **`assets/series/<id>/cenas/`** e podem ser vistas em tela ampliada com setas e navegação por toque. O índice `assets/series/INDICE.csv` indica as pastas das séries.

A opção **Extragrandes** amplia capas sem modificar os vereditos já salvos.

## Organização

As melhorias globais de interface devem ser aplicadas às duas versões de cada tier. Preferências visuais e rankings do Allan e do público permanecem separados.
