#!/usr/bin/env python3
"""Recupera APENAS os 14 filmes marcados como 'revisar' na importação anterior.

Confere título original, ano e, quando possível, TMDB ID de fonte externa.
Não altera dados nem imagens das outras 134 produções.
"""
import json
import re
import time
from datetime import datetime, timezone

from importar_tmdb_filmes import ROOT, CDN, TMDB, norm, sim, year, webp, select_poster, select_scenes

PENDING = {
    "viih-tube-em-enigma": [],
    "princesinha-sofia-elena-e-o-segredo-de-avalor": [
        "Elena and the Secret of Avalor",
        "Elena of Avalor: The Secret of Avalor",
        "Sofia the First: Elena and the Secret of Avalor",
    ],
    "after-sundown": ["After Sundown", "Dab Saeng Rawee", "ดับแสงรวี"],
    "um-estranho-a-beira-mar-the-stranger-by-the-shore": [
        "The Stranger by the Shore", "Umibe no Étranger", "Umibe no Etranger", "海辺のエトランゼ",
    ],
    "diva-la-vie-beauty-and-the-beat": ["Diva La Vie", "Beauty and the Beat"],
    "as-irmas-vampiras-2": [
        "Die Vampirschwestern 2", "Vampire Sisters 2", "The Vampire Sisters 2",
    ],
    "as-irmas-vampiras-3": [
        "Die Vampirschwestern 3", "Die Vampirschwestern 3 - Reise nach Transsilvanien",
        "Vampire Sisters 3", "Vampire Sisters 3: Journey to Transylvania",
    ],
    "frozen-2": ["Frozen II", "Frozen 2"],
    "obsessao": [],  # Nome sem ano/sinopse distintivos: aguardar confirmação do usuário.
    "entre-facas-e-segredos-3-acorde-defunto-acorde": [
        "Wake Up Dead Man: A Knives Out Mystery", "Wake Up Dead Man", "Knives Out 3",
    ],
    "tudo-por-um-popstar": ["Tudo por um Popstar", "Tudo Por Um Pop Star"],
    "aventuras-de-babas": ["Adventures in Babysitting", "Babysitting", "Babysitters em Apuros"],
    "kally-s-mashup-o-filme": [
        "Kally's Mashup: Un cumpleaños muy Kally", "Kally's Mashup: A Very Kally's Birthday",
        "Kally's Mashup: Um Aniversário Muito Kally",
    ],
    "espirito-adolescente-teen-spirit": ["Teen Spirit", "Espírito Adolescente"],
}

# Identificadores confirmados por referências externas; conferir ano no TMDB.
PINNED = {
    "after-sundown": 1113085,
    "um-estranho-a-beira-mar-the-stranger-by-the-shore": 642121,
    "frozen-2": 330457,
    "entre-facas-e-segredos-3-acorde-defunto-acorde": 812583,
    "aventuras-de-babas": 360606,
}

def load_films():
    raw = (ROOT / "catalogos-extra.js").read_text(encoding="utf-8")
    marker = "window.ALLAN_CATALOG_FILMES="
    start = raw.index(marker) + len(marker)
    catalog, _ = json.JSONDecoder().raw_decode(raw[start:].lstrip())
    return {film["id"]: film for film in catalog}

def queries(movie):
    values = [movie["title"], *(movie.get("aliases") or []),
              *PENDING.get(movie["id"], [])]
    unique = []
    seen = set()
    for name in values:
        s = str(name).strip()
        if not s or norm(s) in seen:
            continue
        seen.add(norm(s))
        unique.append(s)
    return unique

def candidate_info(item, movie, aliases):
    release_year = year(item.get("release_date"))
    expected_year = year(movie.get("year"))
    title = item.get("title", "")
    original = item.get("original_title", "")
    matches = [sim(a, b) for a in aliases for b in (title, original) if b]
    best = max(matches or [0])
    exact = any(norm(a) == norm(b) for a in aliases for b in (title, original) if b)
    year_ok = bool(expected_year and release_year and abs(expected_year-release_year) <= 1)
    return {
        "id": item["id"],
        "title": title,
        "original_title": original,
        "year": release_year,
        "score": round(best, 3),
        "exact_alias": exact,
        "year_match": year_ok,
        "has_poster": bool(item.get("poster_path")),
        "popularity": item.get("popularity", 0),
    }

def discover(api, movie):
    names = queries(movie)
    candidates = {}
    for query in names[:9]:
        try:
            response = api.get("/search/movie", {
                "query": query, "language": "pt-BR", "include_adult": "false"
            })
            for item in (response.get("results") or [])[:17]:
                candidates[item["id"]] = item
        except Exception as exc:
            print(f"AVISO: busca de {query!r}: {str(exc)[:100]}", flush=True)
        time.sleep(.10)
    ranked = sorted(
        (candidate_info(item, movie, names) for item in candidates.values()),
        key=lambda x: (x["year_match"], x["exact_alias"], x["score"],
                       x["has_poster"], x["popularity"]),
        reverse=True,
    )
    return ranked[:12]

def choose_match(api, movie, candidates):
    movie_id = movie["id"]
    if movie_id == "obsessao":
        return None, "ambiguidade: Obsessão possui várias versões, sem ano confirmado"
    pinned = PINNED.get(movie_id)
    if pinned:
        detail = api.get(f"/movie/{pinned}", {"language": "pt-BR"})
        expect, actual = year(movie.get("year")), year(detail.get("release_date"))
        if not detail.get("id") == pinned or not expect or not actual or abs(expect - actual) > 1:
            return None, "ID verificado com ano incompatível"
        return detail, "id_confirmado"
    # Não assumir resultado com título genérico ou de outra época.
    possibilities = [
        c for c in candidates
        if c["year_match"] and c["exact_alias"] and c["has_poster"]
    ]
    if len(possibilities) != 1:
        return None, "sem correspondência exata, única e compatível com o ano"
    winner = possibilities[0]
    return api.get(f"/movie/{winner['id']}", {"language": "pt-BR"}), "titulo_original_e_ano"

def main():
    films = load_films()
    report_path = ROOT / "assets/filmes/RELATORIO_TMDB.json"
    old = json.loads(report_path.read_text(encoding="utf-8"))
    old_pending = {item["id"] for item in old["itens"] if item["status"] == "revisar"}
    ids = [movie_id for movie_id in PENDING if movie_id in old_pending]
    if len(ids) != 14:
        raise RuntimeError(
            f"Esperados 14 pendentes, mas há {len(ids)}: {ids}. "
            "Importação cancelada para proteger outras produções."
        )
    if any(movie_id not in films for movie_id in ids):
        raise RuntimeError("Há IDs ausentes do catálogo.")
    api = TMDB()
    records = []
    for i, movie_id in enumerate(ids, 1):
        movie = films[movie_id]
        folder = ROOT / "assets/filmes" / movie_id
        poster = folder / "poster.webp"
        scenes = folder / "cenas"
        item = {"id": movie_id, "titulo": movie["title"]}
        try:
            if poster.exists() or list(scenes.glob("[0-9][0-9].webp")):
                item.update(status="ja_existia", motivo="Arquivos preexistentes preservados")
                records.append(item)
                continue
            options = discover(api, movie)
            item["candidatos"] = options
            selection, method = choose_match(api, movie, options)
            if selection is None:
                item.update(status="revisar", motivo=method)
                print(f"[{i}/14] REVISAR {movie['title']}: {method}", flush=True)
                records.append(item)
                continue
            tmdb_id = selection["id"]
            item["tmdb_id"] = tmdb_id
            item["titulo_tmdb"] = selection.get("title")
            item["titulo_original_tmdb"] = selection.get("original_title")
            item["ano_tmdb"] = year(selection.get("release_date"))
            item["criterio"] = method
            images = api.get(f"/movie/{tmdb_id}/images", {
                "include_image_language": "pt,en,null"
            })
            poster_path = select_poster(images, selection)
            backdrops = select_scenes(images, 10)
            imported = []
            if poster_path:
                webp(api.session, f"{CDN}/w780{poster_path}", poster, 600)
                imported.append("poster.webp")
            for n, image_path in enumerate(backdrops, 1):
                target = scenes / f"{n:02d}.webp"
                webp(api.session, f"{CDN}/w1280{image_path}", target, 1200)
                imported.append(f"cenas/{n:02d}.webp")
            item["arquivos"] = imported
            item["cenas"] = len(backdrops)
            item["status"] = "importado" if imported else "sem_imagens"
            print(f"[{i}/14] {item['status'].upper()} {movie['title']}: "
                  f"TMDB {tmdb_id}, {len(imported)} arquivos", flush=True)
        except Exception as exc:
            item.update(status="erro", motivo=str(exc)[:260])
            print(f"[{i}/14] ERRO {movie['title']}: {exc}", flush=True)
        records.append(item)
        time.sleep(.12)
    summary = {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "total_analisado": len(records),
        "importados": sum(x["status"] == "importado" for x in records),
        "revisar": sum(x["status"] == "revisar" for x in records),
        "erros": sum(x["status"] == "erro" for x in records),
        "itens": records,
    }
    path = ROOT / "assets/filmes/RELATORIO_RECUPERACAO_TMDB.json"
    path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    print("RESUMO:", json.dumps({k: v for k,v in summary.items() if k != "itens"},
                               ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
