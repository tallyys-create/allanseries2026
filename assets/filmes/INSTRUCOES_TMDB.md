# Importação de pôsteres e fundos dos filmes via TMDB

O catálogo da tier de Filmes tem 148 produções. O importador usa a **API oficial do The Movie Database (TMDB)** e salva o material em cada pasta do projeto.

## Preparação — uma vez só

1. Obtenha uma chave API v3 em https://www.themoviedb.org/settings/api (consulte as condições de uso).
2. No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret**.
3. Nome do secret: `TMDB_API_KEY`. Valor: a chave v3, sem aspas. Outra opção é o token de leitura nomeado `TMDB_READ_ACCESS_TOKEN`. Nunca salve a chave em código, arquivo ou commit.
4. Abra **Actions → Importar posters e cenas TMDB → Run workflow** e execute com **start = 0** e **limit = 0** para conferir todos os filmes.

## Arquivos

- `assets/filmes/<id>/poster.webp` — capa oficial da obra para miniatura e ficha.
- `assets/filmes/<id>/cenas/01.webp` até `10.webp` — até dez imagens horizontais do TMDB, se disponíveis. Não cria imagens artificiais quando há menos cenas.
- `assets/filmes/RELATORIO_TMDB.json` — resultados dos pareamentos, itens encontrados e pendências.

O importador verifica nomes e anos para evitar confundir refilmagens, continuações e animações. Um filme ambíguo fica marcado como **revisar**, sem receber uma capa possivelmente incorreta. Obras sem pôster ou com poucos fundos disponíveis ficam apenas com a quantidade existente no TMDB (mesmo quando são menos de seis imagens).

O campo **scenes** do workflow define o **máximo de cenas por filme**. Recomenda-se `10`; também é possível usar `6`, `7`, `8` ou `9`. A importação é incremental: ao executar novamente com `10`, o script mantém `01.webp` até `04.webp` e acrescenta `05.webp` até `10.webp`, conforme a disponibilidade, sem substituir as cenas já importadas.

A galeria do site detecta automaticamente os arquivos da pasta `cenas/` e exibe quantas imagens estiverem disponíveis.

Usa WebP otimizado (pôster com até 600 px de largura; fundos até 1200 px), evita substituir imagens já presentes, e envia novos arquivos ao próprio GitHub. Não usa `poster-mini`.

## Créditos

As imagens e os dados têm origem no TMDB. Consulte `creditos.html` e as [condições da API](https://developer.themoviedb.org/docs/faq). O uso gratuito da API é destinado a fins não comerciais, com atribuição; imagens podem ter direitos de seus respectivos titulares.
