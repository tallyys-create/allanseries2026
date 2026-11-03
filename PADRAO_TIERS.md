# Padrão de componentes das tiers — AllanWoodTV

Este documento é a referência para manter **Séries**, **Filmes**, **TV Allanzinho** e **Álbuns** visualmente e funcionalmente consistentes. Ao criar uma nova tier, preservar os recursos do Tribunal e alterar apenas os elementos específicos do conteúdo.

## Motor comum de posicionamento

Arquivo: `tier-drag-shared.js`. É carregado antes do script principal das páginas de séries e filmes e antes de `albuns-taylor-drag.js`. Expõe `window.AllanTierDrag`:

- `insertionAnchor(dock, x, y, selector, excluded)`: calcula a posição real entre as capas, inclusive quando há quebra em mais de uma linha
- `catalogAnchor(dock, id, items, excluded)`: devolve a capa ao catálogo na ordem original
- `previewHasPointer(preview, x, y)`: impede oscilações da prévia enquanto o cursor já está no espaço reservado
- `scrollVelocity(...)`: cálculo comum de rolagem nas bordas

Em Séries/Filmes o cartão usa `.series-card`; em Álbuns usa `.album` quadrado. **Não criar outra regra de encaixe em cada tier.** Os quatro arquivos principais de séries e filmes já consultam o mesmo motor, preservando fallback para o código anterior.

O controlador específico da tier musical, `albuns-taylor-drag.js`, cuida de desktop, toque longo, prévia, cancelamento e integração com `TAYLOR_APP.move`. Não deve coexistir com handlers `ondragover`/`ondrop` adicionais em `albuns-taylor.js`: dois sistemas simultâneos geravam comportamento inconsistente.

## Componentes e comportamentos obrigatórios

1. Cabeçalho com foto original do Allan, botão de retorno e identificação clara de Allan ou público.
2. Banner "Tribunal do Allan" para anfitrião; banner "O seu veredito" e apelido para o público.
3. Catálogo lateral no desktop e abaixo no celular, com rolagem independente quando lateral.
4. Seis vereditos com descrição e contador; nomes/cores personalizáveis.
5. Tamanho de capa pequeno, médio, grande e extragrande.
6. Modo foco, modo live, sorteio, desfazer, zerar, backup/importação e exportação PNG.
7. Arrastar com prévia *durante* o movimento, destacar destino, permitir inserir no início/meio/fim e mover de um tier para outro ou de volta ao catálogo; o ranking só muda após soltar.
8. Ficha com galeria e tela cheia; adaptar informações por categoria. Álbuns usam capa 1:1, slideshow automático e tracklist em janela separada.
9. Persistir ordenação e classificação entre recarregamentos, sem misturar ranking do Allan com o do público.
10. Após qualquer mudança em componente comum, executar testes em **todas** as tiers, não só na página alterada.

## Regressões automatizadas

- `scripts/testar_tier_taylor.mjs`: capas, fichas, galeria, sorteio, foco e classificação
- `scripts/auditar_paridade_tiers.mjs`: posições, funcionalidades, telas pequenas e versões Allan/público
- `scripts/testar_drag_tiers.mjs`: arrasto real com mouse e prévia, reordenação, troca de nível, retorno ao catálogo e cancelamento, além de compatibilidade de séries e filmes
- `.github/workflows/testar-tier-taylor.yml`: executa o Chromium e arquiva os relatórios em `assets/albuns/taylor-swift/`

## Notas

O catálogo de álbuns tem 18 itens, por isso filtros não foram incluídos. Fotos de eras devem ser corretamente atribuídas à edição; não preencher uma galeria com imagem de outra edição apenas para aumentar a quantidade.

**A centralização é incremental:** o motor de *posicionamento* já é compartilhado pelas três categorias. Outros elementos de layout ainda têm CSS/JS específicos e não devem ser considerados automaticamente sincronizados até sua migração explícita.
