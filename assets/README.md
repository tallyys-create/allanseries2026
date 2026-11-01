# Imagens do Tribunal do Allan — AllanWoodTV

Esta pasta foi preparada para as séries do catálogo e funciona no GitHub Pages.

## Pastas

- `assets/interface/`: foto de perfil do Allan, fundo, ícones e outros elementos próprios.
- `assets/series/<nome-da-serie>/`: imagens de cada produção.
- `assets/series/<nome-da-serie>/cenas/`: fotografias da galeria de cenas.

Todas as 78 séries já têm suas pastas. Use `assets/series/INDICE.csv` para localizar o nome da pasta de cada obra.

## Nomes dos arquivos

Dentro de cada pasta de série:

- `poster.webp`: pôster grande para a ficha (aproximadamente 700 × 1050 px).
- `poster-mini.webp`: versão leve para o catálogo (aproximadamente 300 × 450 px).
- `cenas/01.webp`, `cenas/02.webp`, `cenas/03.webp` etc.: imagens da galeria, preferencialmente até 1280 px de largura.

Use letras minúsculas, números e hífens nos nomes de arquivos; evite espaços e acentos. Se a série tiver somente pôster, não é preciso adicionar fotos em `cenas/`.

## Como colocar imagens pelo site GitHub

1. Entre no repositório `tallyys-create/allanseries2026`.
2. Abra `assets/series/` e escolha a pasta da série.
3. Clique em **Add file > Upload files** e envie o arquivo `poster.webp` e, se desejar, `poster-mini.webp`.
4. Para fotos de cenas, abra a pasta `cenas/` dessa série e envie `01.webp`, `02.webp` etc.
5. Confirme em **Commit changes**.

Os arquivos `.gitkeep` são apenas marcadores para as pastas aparecerem no GitHub. Podem permanecer.

## Importante: etapa de conexão

**A versão atual do `index.html` permanece intacta e ainda mostra as imagens externas.** Subir um arquivo nesta pasta **não muda imediatamente** a imagem exibida no site. Depois de enviar as imagens, é preciso atualizar o HTML para usar os caminhos locais (ou configurar um carregador com fallback). Essa etapa será feita sem apagar as fichas, o ranking ou as tags já cadastradas.

Exemplos de caminhos relativos ao `index.html`:

```text
assets/series/alice-in-borderland/poster.webp
assets/series/alice-in-borderland/poster-mini.webp
assets/series/alice-in-borderland/cenas/01.webp
assets/series/one-piece/poster.webp
assets/interface/foto-allan.webp
```

Recomenda-se verificar a licença e o uso permitido de pôsteres e fotografias promocionais antes de hospedá-los publicamente.
