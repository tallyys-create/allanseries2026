# Importar pôsteres e cenas TMDB — TV Allanzinho

O catálogo TV Allanzinho reúne 23 produções. A importação é separada de Filmes e das demais tiers.

## Executar no GitHub

1. Abra **Actions → Importar posters e cenas - TV Allanzinho (TMDB)**.
2. Clique **Run workflow** e escolha a branch **main**.
3. Para um teste, use `start = 0`, `limit = 5`, `scenes = 10`.
4. Para verificar o catálogo inteiro, use `start = 0`, `limit = 0`, `scenes = 10`.
5. Consulte o relatório gerado em `assets/tv-allanzinho/RELATORIO_TMDB.json`.

A chave `TMDB_API_KEY` ou `TMDB_READ_ACCESS_TOKEN` configurada em **Settings → Secrets and variables → Actions** é reutilizada. **Não copie o valor da chave para nenhum arquivo do repositório.**

## Organização das imagens

- `assets/tv-allanzinho/<id>/poster.webp`: pôster usado tanto na miniatura quanto na ficha.
- `assets/tv-allanzinho/<id>/cenas/01.webp` a `10.webp`: até dez imagens horizontais disponíveis.
- O site detecta os arquivos da pasta `cenas` e mostra automaticamente as imagens na galeria/tela cheia.
- O script preserva as imagens existentes e acrescenta somente as que faltam. Não cria `poster-mini`.
- Se o TMDB tiver menos de dez fundos, fica com os disponíveis; não há mínimo obrigatório.

## O que não encontrar

Se não for encontrada correspondência suficientemente segura, o item será marcado como `revisar` no relatório e **não receberá a capa de outra produção**. Se o título correto existir no TMDB, mas não houver imagens, aparecerá como `sem_imagens`. Erros técnicos são registrados como `erro`. Esses itens podem ser inseridos manualmente depois, sem alterar o ranking salvo.

Algumas fichas de TV Allanzinho são temporadas específicas ou obras independentes difíceis de localizar. A busca considera nomes alternativos e anos; temporadas podem aproveitar imagens da série original quando a correspondência for confirmada. Obras que não constam no TMDB não serão substituídas por semelhantes.

### Créditos

Fonte: [The Movie Database (TMDB)](https://www.themoviedb.org/). Este projeto utiliza a API do TMDB, mas não é endossado nem certificado pelo TMDB. As imagens pertencem aos seus respectivos titulares.
