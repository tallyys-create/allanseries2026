# Capas e fotos da tier de álbuns da Taylor Swift

A tier já funciona sem imagens. Cada álbum tem um identificador em `albuns-taylor-dados.js`.

Para importar as imagens, crie a pasta `assets/albuns/taylor-swift/<id>/` correspondente ao identificador do álbum.

- `poster.webp` — capa oficial, em formato 1:1. O mesmo arquivo será usado na miniatura do catálogo e nos rankings.
- `cenas/01.webp` até `cenas/10.webp` — imagens da era, clipes, fotos promocionais e bastidores. A janela do álbum carrega automaticamente as que existirem e dá prioridade visual à galeria.

Não há filtro, pôster mini nem imagens duplicadas. Cada Taylor's Version e edição especial tem pasta própria.

Exemplos de IDs: `debut`, `fearless`, `fearless-tv`, `1989-tv`, `ttpd`, `anthology`, `showgirl`, `encore`.

**Importante:** não importar imagens de outras eras para preencher espaços automaticamente. Quando uma pasta não contém fotos, aparece uma mensagem de galeria em preparação.
## Importação das capas oficiais

As 18 capas foram obtidas por meio de busca de álbuns do catálogo Apple Music/iTunes, verificando o título e ano de lançamento. O script de importação é `scripts/importar_capas_taylor.py` e o workflow é `.github/workflows/importar-capas-taylor.yml`.

Cada imagem é convertida para WebP quadrado de 700 × 700 px e gravada como `assets/albuns/taylor-swift/<id>/poster.webp`. O relatório `RELATORIO_CAPAS.json` contém título correspondente, ano, fonte, identificador e tamanho do arquivo. Não substituir a arte de uma edição pela de outra.

## Layout compartilhado

A tier é publicada em `albuns-taylor.html` (Allan) e `albuns-taylor-publico.html` (público), com dados em `albuns-taylor-dados.js` e `albuns-taylor-faixas-*.js`. A implementação do ranking e modal ficam em `albuns-taylor.js` e `albuns-taylor-modal.js`. Os estilos e controles adicionais de layout vivem em `albuns-taylor-upgrades.css` e `albuns-taylor-upgrades.js`.

Recursos: foto original compartilhada `assets/interface/allan-avatar.jpg`, layout lateral padrão no desktop, modo foco, modo live, tamanhos de capa pequenos/médios/grandes/extragrandes, edição de categorias, arrastar/soltar e reordenação no mesmo tier (incluindo toque longo no celular). Preferências e rankings do Allan e do público são independentes.
