# Capas e fotos da tier de álbuns da Taylor Swift

A tier já funciona sem imagens. Cada álbum tem um identificador em `albuns-taylor-dados.js`.

Para importar as imagens, crie a pasta `assets/albuns/taylor-swift/<id>/` correspondente ao identificador do álbum.

- `poster.webp` — capa oficial, em formato 1:1. O mesmo arquivo será usado na miniatura do catálogo e nos rankings.
- `cenas/01.webp` até `cenas/10.webp` — imagens da era, clipes, fotos promocionais e bastidores. A janela do álbum carrega automaticamente as que existirem e dá prioridade visual à galeria.

Não há filtro, pôster mini nem imagens duplicadas. Cada Taylor's Version e edição especial tem pasta própria.

Exemplos de IDs: `debut`, `fearless`, `fearless-tv`, `1989-tv`, `ttpd`, `anthology`, `showgirl`, `encore`.

**Importante:** não importar imagens de outras eras para preencher espaços automaticamente. Quando uma pasta não contém fotos, aparece uma mensagem de galeria em preparação.