#!/usr/bin/env python3
"""Importa pôsteres e fundos do TMDB para Séries ou TV Allanzinho.

Uso: python scripts/importar_tmdb_tv.py --catalog series|tv-allanzinho
O arquivo não modifica a base nem os vereditos; apenas assets/<catalog>/.
"""
import argparse
import json
import re
import time
from datetime import datetime, timezone

from importar_tmdb_filmes import (
    ROOT, CDN, TMDB, norm, sim, year, webp, select_poster, select_scenes
)

# Estas buscas só ajudam a identificar corretamente o título original;
# um resultado diferente de ano/versão ainda é rejeitado.
EXTRA_QUERIES = {
    "o-pequeno-scooby-doo": ["A Pup Named Scooby-Doo"],
    "juniper-lee": ["The Life and Times of Juniper Lee"],
    "sakura-card-captors": ["Cardcaptor Sakura"],
    "sakura-card-captor": ["Cardcaptor Sakura"],
    "pokemon-jornadas": ["Pokémon Journeys", "Pocket Monsters (2019)"],
    "as-meninas-superpoderosas": ["The Powerpuff Girls"],
    "os-camundongos-aventureiros": ["The Country Mouse and the City Mouse Adventures"],
    "a-pequena-sereia-serie-animada": ["The Little Mermaid (1992)", "The Little Mermaid"],
    "power-rangers-tempestade-ninja": ["Power Rangers Ninja Storm"],
    "o-incrivel-mundo-de-gumball": ["The Amazing World of Gumball"],
    "bob-esponja-calca-quadrada": ["SpongeBob SquarePants"],
    "sailor-moon-classico": ["Sailor Moon"],
    "hora-de-aventura": ["Adventure Time"],
    "yu-gi-oh-gx": ["Yu-Gi-Oh! GX"],
    "chaves": ["El Chavo del Ocho", "El Chavo"],
    "tres-espias-demais": ["Totally Spies!"],
    "os-sete-monstrinhos": ["Seven Little Monsters"],
    "as-aventuras-de-piggley-winks": ["Jakers! The Adventures of Piggley Winks"],
    "o-segredo-alem-do-jardim": ["Over the Garden Wall"],
    "a-mansao-foster-para-amigos-imaginarios": ["Foster's Home for Imaginary Friends"],
    "screen-queens": ["Scream Queens"],
    "barbie-life-in-the-dreamhouse": ["Barbie: Life in the Dreamhouse"],
    "noobes": ["Noobees"],
    "h2o-meninas-sereias": ["H2O: Just Add Water"],
    "once-upon-a-time": ["Once Upon a Time"],
    "the-boyfriend-temporada-2": ["The Boyfriend"],
    "american-horror-story-13": ["American Horror Story"],
    "rebelde-mexico-2004": ["Rebelde"],
    "rebelde-way-erreway": ["Rebelde Way"],
    "cavaleiros-do-zodiaco-lost-canvas": ["Saint Seiya: The Lost Canvas"],
}

# Fixa as versões, impedindo importar a Doctor Who clássica ou a novela turca.
PINNED_TMDB_SERIES = {"doctor-who": 57243, "estilhacos": 298168}

# Fichas referentes a uma temporada de uma série, não a uma série nova.
# Conferir o ano original da produção, não o ano da temporada.
PARENT_SERIES_YEARS = {
    "the-boyfriend-temporada-2": 2024,
    "american-horror-story-13": 2011,
}

COUNTRIES = {
    "brasil": "BR", "mexico": "MX", "argentina": "AR", "colombia": "CO",
    "japao": "JP", "coreia do sul": "KR", "tailandia": "TH",
    "canada": "CA", "estados unidos": "US", "reino unido": "GB",
    "italia": "IT", "franca": "FR", "alemanha": "DE",
    "australia": "AU", "turquia": "TR", "irlanda": "IE",
}

def searches(show):
    names = [show.get("title", ""), *(show.get("aliases") or []),
             *EXTRA_QUERIES.get(show["id"], [])]
    results, seen = [], set()
    for value in names:
        # Remove qualificadores editoriais sem apagar nomes originais e números.
        value = re.sub(r"\([^)]*\)", " ", value)
        value = re.sub(r"\s+[—–-]\s*(?:\d+[ªaº]?\s*)?temporada\s*\d*\s*$", "", value, flags=re.I)
        value = re.sub(r"\s+\d+[ªaº]?\s+temporada$", "", value, flags=re.I)
        value = re.sub(r"\s*\b(ano)\s*8$", "", value, flags=re.I)
        value = re.sub(r"\s+", " ", value).strip()
        key = norm(value)
        if key and key not in seen and len(key) > 2:
            results.append(value)
            seen.add(key)
    return results[:8]

def first_year(result):
    return year(result.get("first_air_date"))

def score_candidate(show, result, wanted_year):
    names = searches(show)
    titles = [result.get("name", ""), result.get("original_name", "")]
    similarities = [sim(a, b) for a in names for b in titles if b]
    similarity = max(similarities, default=0.0)
    released = first_year(result)
    if wanted_year and released:
        gap = abs(wanted_year - released)
        if gap > 1:
            return -1.0
    elif wanted_year and not released:
        return -1.0
    # Não aceitar variantes sem correspondência de título realmente confiável.
    if similarity < .86:
        return -1.0
    result_score = similarity + (.08 if wanted_year and released == wanted_year else 0)
    country = norm(show.get("country", ""))
    origin_countries = result.get("origin_country") or []
    known_codes = [code for name, code in COUNTRIES.items() if name in country]
    if known_codes and origin_countries:
        if any(code in origin_countries for code in known_codes):
            result_score += .04
        elif len(known_codes) == 1:
            result_score -= .09
    return round(result_score, 4)

def choose_result(show, api):
    pinned = PINNED_TMDB_SERIES.get(show["id"])
    if pinned:
        item = api.get(f"/tv/{pinned}", {"language":"pt-BR"})
        expected, actual = year(show.get("year")), first_year(item)
        if not actual or (expected and actual != expected):
            raise RuntimeError(f"TMDB {pinned}: ano incorreto ({actual}; esperado {expected})")
        country = "GB" if show["id"] == "doctor-who" else "US"
        origin = item.get("origin_country") or []
        if origin and country not in origin:
            raise RuntimeError(f"TMDB {pinned}: país incorreto ({origin})")
        return item, 1.12, "ok"
    wanted_year = PARENT_SERIES_YEARS.get(show["id"], year(show.get("year")))
    candidates = {}
    for query in searches(show)[:6]:
        response = api.get("/search/tv", {"query": query, "language": "pt-BR",
                                          "include_adult": "false"})
        for item in (response.get("results") or [])[:15]:
            candidates[item["id"]] = item
        # Continua consultando os nomes alternativos quando a correspondência não for forte.
        if candidates and max(score_candidate(show, item, wanted_year)
                              for item in candidates.values()) >= 1.07:
            break
        time.sleep(.12)
    ranked = sorted(candidates.values(), key=lambda item:
                    score_candidate(show, item, wanted_year), reverse=True)
    if not ranked:
        return None, 0, "nao_encontrado"
    best = ranked[0]
    best_score = score_candidate(show, best, wanted_year)
    if best_score < .90:
        return None, best_score, "correspondencia_insegura"
    if len(ranked) > 1:
        second = score_candidate(show, ranked[1], wanted_year)
        if best_score - second < .035 and best_score < 1.05:
            return None, best_score, "titulo_ambiguo"
    return best, best_score, "ok"

def load_catalog(category):
    if category == "series":
        text = (ROOT / "series-2026.html").read_text(encoding="utf-8")
        marker = "const DEFAULT_SHOWS="
        start = text.find(marker)
        if start < 0:
            raise RuntimeError("Catálogo de séries não encontrado")
        start += len(marker)
        end = text.find("];", start)
        if end < 0:
            raise RuntimeError("Fim do catálogo de séries não encontrado")
        result = json.loads(text[start:end+1])
        if len(result) < 80:
            raise RuntimeError("Catálogo de séries incompleto")
        return result
    text = (ROOT / "catalogos-extra.js").read_text(encoding="utf-8")
    marker = "window.ALLAN_CATALOG_TV_ALLANZINHO="
    start = text.find(marker)
    if start < 0:
        raise RuntimeError("Catálogo TV Allanzinho não encontrado")
    start += len(marker)
    # O próprio JSON pode conter ";" nas descrições.
    # raw_decode lê o array completo sem cortar prematuramente.
    result, _ = json.JSONDecoder().raw_decode(text[start:].lstrip())
    if len(result) < 20:
        raise RuntimeError("Catálogo TV Allanzinho incompleto")
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", choices=["series", "tv-allanzinho"], required=True)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--scenes", type=int, default=10)
    parser.add_argument("--force", action="store_true",
                        help="Substitui as imagens importadas anteriormente (não recomendado)")
    args = parser.parse_args()
    if not 1 <= args.scenes <= 10:
        parser.error("--scenes deve estar entre 1 e 10")
    if args.start < 0 or args.limit < 0:
        parser.error("--start e --limit precisam ser >= 0")
    # TMDB lê autorização exclusivamente dos GitHub Actions secrets.
    from importar_tmdb_filmes import KEY, TOKEN
    if not KEY and not TOKEN:
        parser.error("Configure TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN em GitHub Secrets.")
    shows = load_catalog(args.catalog)
    selected = shows[args.start:args.start+args.limit if args.limit else None]
    api = TMDB()
    records = []
    for index, show in enumerate(selected, 1):
        folder = ROOT / "assets" / args.catalog / show["id"]
        poster = folder / "poster.webp"
        scene_folder = folder / "cenas"
        previous_scenes = sorted(scene_folder.glob("[0-9][0-9].webp"))
        # Estes tres titulos sao temporadas especificas ou versoes historicas.
        # Foram verificados e recuperados num importador dedicado, inclusive Madeline
        # com cenas de fontes externas. Nao buscar imagens da franquia generica.
        season_specific={"pokemon-jornadas", "power-rangers-tempestade-ninja", "madeline"}
        if (poster.exists() and previous_scenes and show["id"] in season_specific):
            records.append({"id": show["id"], "titulo": show["title"],
                            "status": "ja_existe", "cenas_no_github": len(previous_scenes),
                            "motivo": "Recuperado por temporada especifica; imagens preservadas"})
            continue
        if poster.exists() and len(previous_scenes) >= args.scenes and not args.force:
            records.append({"id": show["id"], "titulo": show["title"],
                            "status": "ja_existe", "cenas_no_github": len(previous_scenes)})
            continue
        try:
            found, confidence, reason = choose_result(show, api)
            if found is None:
                print(f"[{index}/{len(selected)}] REVISAR {show['title']}: {reason}", flush=True)
                records.append({"id": show["id"], "titulo": show["title"],
                                "status": "revisar", "motivo": reason,
                                "similaridade": confidence})
                continue
            tmdb_id = found["id"]
            images = api.get(f"/tv/{tmdb_id}/images",
                             {"include_image_language": "pt,en,null"})
            files = []
            poster_path = select_poster(images, found)
            if poster_path and (args.force or not poster.exists()):
                webp(api.session, f"{CDN}/w780{poster_path}", poster, 600)
                files.append("poster.webp")
            chosen_scenes = select_scenes(images, args.scenes)
            for n, backdrop in enumerate(chosen_scenes, 1):
                path = scene_folder / f"{n:02d}.webp"
                if path.exists() and not args.force:
                    continue
                webp(api.session, f"{CDN}/w1280{backdrop}", path, 1200)
                files.append(f"cenas/{n:02d}.webp")
            current_scenes = len(list(scene_folder.glob("[0-9][0-9].webp")))
            has_poster = poster.exists()
            status = ("importado" if files else
                      "ja_existe" if has_poster or current_scenes else "sem_imagens")
            print(f"[{index}/{len(selected)}] {status.upper()} {show['title']}: "
                  f"TMDB {tmdb_id}, {current_scenes} cenas, {len(files)} novos", flush=True)
            records.append({
                "id": show["id"], "titulo": show["title"], "status": status,
                "tmdb_id": tmdb_id, "titulo_tmdb": found.get("name"),
                "primeira_exibicao": found.get("first_air_date"),
                "similaridade": confidence, "poster_no_github": has_poster,
                "cenas_disponiveis": len(chosen_scenes),
                "cenas_no_github": current_scenes, "arquivos_novos": files
            })
        except Exception as exc:
            print(f"[{index}/{len(selected)}] ERRO {show['title']}: {exc}", flush=True)
            records.append({"id": show["id"], "titulo": show["title"],
                            "status": "erro", "motivo": str(exc)[:250]})
        time.sleep(.18)
    stats = {status: sum(x["status"] == status for x in records)
             for status in ("importado", "ja_existe", "revisar", "sem_imagens", "erro")}
    report = {
        "fonte": "The Movie Database (TMDB) – TV API",
        "catalogo": args.catalog, "gerado_em": datetime.now(timezone.utc).isoformat(),
        "total_catalogo": len(shows), "processados": len(selected),
        "inicio": args.start, "limite_cenas": args.scenes, **stats, "itens": records
    }
    root = ROOT / "assets" / args.catalog
    root.mkdir(parents=True, exist_ok=True)
    (root / "RELATORIO_TMDB.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("RESUMO:", json.dumps({k: v for k, v in report.items() if k != "itens"},
                                ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
