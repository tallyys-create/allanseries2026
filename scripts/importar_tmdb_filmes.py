#!/usr/bin/env python3
"""Importa posters e backdrops oficiais do TMDB para assets/filmes."""
import argparse
import io
import json
import os
import re
import time
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.themoviedb.org/3"
CDN = "https://image.tmdb.org/t/p"
KEY = os.environ.get("TMDB_API_KEY", "").strip()
TOKEN = os.environ.get("TMDB_READ_ACCESS_TOKEN", "").strip()

# IDs confirmados individualmente para franquias com nomes genéricos.
# Evita confundir os musicais Z-O-M-B-I-E-S da Disney com filmes de terror.
PINNED_TMDB_IDS = {
    "zombies-disney-channel": 483980,          # Z-O-M-B-I-E-S (2018)
    "zombies-2": 599521,                       # Z-O-M-B-I-E-S 2 (2020)
    "zombies-3": 809107,                       # Z-O-M-B-I-E-S 3 (2022)
    "zombies-4-dawn-of-the-vampires": 1243341, # Z-O-M-B-I-E-S 4 (2025)
}

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or "").lower())
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = re.sub(r"\([^)]*\)", " ", value)
    return " ".join(re.findall(r"[a-z0-9]+", value))

def queries(movie):
    found = []
    for text in [movie["title"], *(movie.get("aliases") or [])]:
        text = re.sub(r"\([^)]*\)", " ", text).strip()
        for name in [text, re.split(r"\s+[—–]\s+", text)[0].strip()]:
            if len(name) > 2 and norm(name) not in {norm(x) for x in found}:
                found.append(name)
    return found[:5]

def sim(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    ta, tb = set(a.split()), set(b.split())
    return .58 * SequenceMatcher(None, a, b).ratio() + .42 * len(ta & tb) / len(ta | tb)

def year(value):
    m = re.search(r"\b(?:19|20)\d{2}\b", str(value or ""))
    return int(m.group()) if m else None

def confidence(movie, result):
    terms = [movie["title"], *(movie.get("aliases") or []), *queries(movie)]
    titles = [result.get("title", ""), result.get("original_title", "")]
    s = max(sim(a, b) for a in terms for b in titles)
    want, got = year(movie.get("year")), year(result.get("release_date"))
    if want and got:
        gap = abs(want - got)
        s += .07 if gap == 0 else (.01 if gap == 1 else (-.08 if gap == 2 else -min(.6, .19+(gap-2)*.08)))
    if not result.get("poster_path"):
        s -= .04
    return round(s, 3)

class TMDB:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json", "User-Agent": "AllanWoodTV-TMDB-Importer/1.0"})
        if TOKEN:
            self.session.headers["Authorization"] = "Bearer " + TOKEN

    def get(self, path, params=None):
        params = dict(params or {})
        if KEY and not TOKEN:
            params["api_key"] = KEY
        for attempt in range(4):
            r = self.session.get(API + path, params=params, timeout=30)
            if r.status_code in (429, 500, 502, 503, 504):
                wait = r.headers.get("Retry-After", "2")
                time.sleep(min(35, (int(wait) if wait.isdigit() else 2) + 2**attempt))
                continue
            r.raise_for_status()
            return r.json()
        raise RuntimeError("TMDB indisponível: " + path)

    def find(self, movie):
        pinned = PINNED_TMDB_IDS.get(movie["id"])
        if pinned is not None:
            result = self.get(f"/movie/{pinned}", {"language": "pt-BR"})
            wanted, released = year(movie.get("year")), year(result.get("release_date"))
            if wanted and released and abs(wanted-released) > 1:
                raise RuntimeError(f"TMDB {pinned}: ano inconsistente ({wanted} vs {released})")
            if not result.get("poster_path"):
                raise RuntimeError(f"TMDB {pinned}: filme sem poster")
            return result, 1.10
        results = {}
        for title in queries(movie)[:4]:
            response = self.get("/search/movie", {"query": title, "language": "pt-BR", "include_adult": "false"})
            for result in response.get("results", [])[:12]:
                results[result["id"]] = result
            if results and max(confidence(movie, r) for r in results.values()) >= 1.04:
                break
            time.sleep(.15)
        ranked = sorted(results.values(), key=lambda r: confidence(movie, r), reverse=True)
        if not ranked:
            return None, 0
        best, score = ranked[0], confidence(movie, ranked[0])
        expected, actual = year(movie.get("year")), year(best.get("release_date"))
        # Nunca confundir remakes, versões animadas ou sequências homônimas.
        if expected and not actual:
            return None, score
        if expected and actual and abs(expected - actual) > 2:
            return None, score
        if score < .80:
            return None, score
        if len(ranked)>1 and score-confidence(movie,ranked[1])<.04:
            if not (expected and actual==expected and score>=.99):
                return None, score
        return best, score

def webp(session, url, target, width):
    response = session.get(url, timeout=45)
    response.raise_for_status()
    if len(response.content)>15*1024*1024:
        raise RuntimeError("Arquivo de imagem muito grande")
    with Image.open(io.BytesIO(response.content)) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        if img.mode == "RGBA":
            base = Image.new("RGB", img.size, "#17261b")
            base.paste(img, mask=img.getchannel("A"))
            img = base
        if img.width>width:
            img = img.resize((width, round(img.height*width/img.width)), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        img.save(target, format="WEBP", quality=81, method=5)

def select_poster(images, selected):
    posters = images.get("posters", [])
    posters = sorted(posters, key=lambda a:(
        a.get("iso_639_1")=="pt", a.get("iso_639_1")=="en",
        a.get("vote_count", 0), a.get("height", 0)), reverse=True)
    return (posters[0].get("file_path") if posters else None) or selected.get("poster_path")

def select_scenes(images, count):
    backdrops = sorted(images.get("backdrops", []), key=lambda a:(
        a.get("iso_639_1") is None, a.get("vote_count", 0), a.get("width", 0)), reverse=True)
    paths = []
    for img in backdrops:
        p = img.get("file_path")
        if p and img.get("aspect_ratio", 0)>=1.45 and p not in paths:
            paths.append(p)
        if len(paths)>=count:
            break
    return paths

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0, help="0 para todos")
    parser.add_argument("--scenes", type=int, default=4)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not KEY and not TOKEN:
        raise SystemExit("ERRO: Configure o secret TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN no GitHub.")
    raw = (ROOT/"catalogos-extra.js").read_text(encoding="utf-8")
    match = re.search(r"window\.ALLAN_CATALOG_FILMES\s*=\s*(\[.*?\]);", raw, re.S)
    if not match:
        raise SystemExit("Não encontrei o catálogo de filmes.")
    movies = json.loads(match.group(1))
    chosen = movies[max(0, args.start):]
    if args.limit>0:
        chosen = chosen[:args.limit]
    tmdb = TMDB()
    records = []
    for number, movie in enumerate(chosen, 1):
        folder = ROOT/"assets"/"filmes"/movie["id"]
        poster = folder/"poster.webp"
        scenes_dir = folder/"cenas"
        if poster.exists() and len(list(scenes_dir.glob("[0-9][0-9].webp")))>=args.scenes and not args.force:
            records.append({"id":movie["id"],"titulo":movie["title"],"status":"ja_existe"})
            continue
        try:
            result, score = tmdb.find(movie)
            if not result:
                print(f"[{number}/{len(chosen)}] Revisar: {movie['title']} ({score})", flush=True)
                records.append({"id":movie["id"],"titulo":movie["title"],"status":"revisar","similaridade":score})
                continue
            movie_id = result["id"]
            images = tmdb.get(f"/movie/{movie_id}/images", {"include_image_language":"pt,en,null"})
            added = []
            poster_file = select_poster(images, result)
            if poster_file and (args.force or not poster.exists()):
                webp(tmdb.session, f"{CDN}/w780{poster_file}", poster, 600)
                added.append("poster.webp")
            for i, file_path in enumerate(select_scenes(images,args.scenes),1):
                dest = scenes_dir / f"{i:02d}.webp"
                if dest.exists() and not args.force:
                    continue
                webp(tmdb.session, f"{CDN}/w1280{file_path}", dest, 1200)
                added.append(f"cenas/{i:02d}.webp")
            print(f"[{number}/{len(chosen)}] OK {movie['title']} => TMDB {movie_id}, {len(added)} arquivos", flush=True)
            records.append({"id":movie["id"],"titulo":movie["title"],"status":"importado",
                "tmdb_id":movie_id,"titulo_tmdb":result.get("title"),
                "similaridade":score,"arquivos_novos":added})
        except Exception as exc:
            print(f"[{number}/{len(chosen)}] ERRO {movie['title']}: {str(exc)[:130]}", flush=True)
            records.append({"id":movie["id"],"titulo":movie["title"],"status":"erro","motivo":str(exc)[:250]})
        time.sleep(.25)
    report = {"fonte":"The Movie Database (TMDB)","gerado_em":datetime.now(timezone.utc).isoformat(),
        "total_catalogo":len(movies),"processados":len(chosen),
        "importados":sum(x["status"]=="importado" for x in records),
        "revisar":sum(x["status"]=="revisar" for x in records),
        "erros":sum(x["status"]=="erro" for x in records),"itens":records}
    (ROOT/"assets"/"filmes"/"RELATORIO_TMDB.json").write_text(
        json.dumps(report,ensure_ascii=False,indent=2)+"\n", encoding="utf-8")
    print("RESUMO:", json.dumps({k:v for k,v in report.items() if k!="itens"}, ensure_ascii=False), flush=True)

if __name__=="__main__":
    main()
