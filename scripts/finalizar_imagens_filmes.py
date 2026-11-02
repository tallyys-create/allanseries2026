#!/usr/bin/env python3
"""Finaliza imagens dos dois últimos filmes pendentes da tier AllanWoodTV.

- Obsessão (2026) de Curry Barker: TMDB ID confirmado e verificação do diretor
- O Enigma: pôster promocional registrado no Filmow e miniaturas dos episódios
  oficiais publicados no canal Viih Tube (YouTube)
Não modifica imagens dos outros filmes nem sobrescreve arquivos já existentes.
"""
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image, ImageOps

from importar_tmdb_filmes import ROOT, CDN, TMDB, webp, select_poster, select_scenes, year

ASSETS = ROOT / "assets" / "filmes"
TMDB_ID = 1339713
ENIGMA_ID = "viih-tube-em-enigma"
OBSESSION_ID = "obsessao"

# Pôster promocional "O Enigma - Webserie (2018)" que a própria página
# https://filmow.com/o-enigma-webserie-t271505/ exibe como capa oficial.
POSTERS_ENIGMA = [
    "https://media.fstatic.com/bUWZLmQGFKA6e3umAA-PADkTva8%3D/350x525/smart/filters%3Aformat%28webp%29/media/movies/covers/2019/02/15752.jpg",
    "https://media.fstatic.com/4cMrxtcM18g8CiLg03s7hudGVww%3D/322x478/smart/filters%3Aformat%28webp%29/media/movies/covers/2019/02/15752.jpg",
    "https://img.quizur.com/f/img5c43cd1e6354c7.37245520.jpg?lastEdited=1547947309",
    "https://img.quizur.com/f/img5c43cd1e6354c7.37245520.jpg",
    "https://pt.quizur.com/_image?f=webp&h=600&href=https%3A%2F%2Fimg.quizur.com%2Ff%2Fimg5c43cd1e6354c7.37245520.jpg%3FlastEdited%3D1547947309&w=600",
    "https://i.ytimg.com/vi/F5bR0AuydCk/maxresdefault.jpg",
]

# Vídeos lançados pelo canal oficial "Viih Tube", identificados individualmente
# por registros do canal original e arquivos históricos de publicação.
# O conteúdo completo corresponde à compilação lançada em 2020.
VIDEOS_ENIGMA = [
    ("O Enigma - O Filme (2020)", "F5bR0AuydCk"),
    ("A chegada - episódio 1", "jWO7oX2WR3M"),
    ("A bomba - episódio 2", "IsXL2KRMs24"),
    ("O penhasco - episódio 3", "3DQ_RJr9c0Q"),
    ("O desmaio - episódio 4", "nMhjgO9bpxA"),
    ("A descoberta - episódio 7", "p7hGA4U4ghs"),
    ("A verdade - episódio 8", "si4wxfwk4Q4"),
    ("O fogo - episódio 9", "gho8TrBW8xU"),
    ("A morte - episódio 10", "B77QgikiHC0"),
]

def original_image(session, urls, min_width=300, min_height=180):
    errors = []
    for url in urls:
        try:
            response = session.get(url, timeout=30)
            response.raise_for_status()
            if len(response.content) > 12*1024*1024:
                raise ValueError("arquivo acima do limite permitido")
            with Image.open(io.BytesIO(response.content)) as im:
                im.verify()
            image = Image.open(io.BytesIO(response.content))
            if image.width < min_width or image.height < min_height:
                raise ValueError(f"resolução baixa: {image.width}x{image.height}")
            return image, url
        except Exception as exc:
            errors.append(f"{type(exc).__name__}: {str(exc)[:85]}")
    raise RuntimeError("Fonte indisponível: " + "; ".join(errors[:3]))

def save_webp(image, path, max_width=1200):
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "#16253b")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    if image.width > max_width:
        image = image.resize(
            (max_width, round(image.height*max_width/image.width)), Image.Resampling.LANCZOS
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=82, method=5)

def import_obsession(api):
    folder = ASSETS / OBSESSION_ID
    folder.mkdir(parents=True, exist_ok=True)
    result = api.get(f"/movie/{TMDB_ID}", {
        "language": "pt-BR", "append_to_response": "credits"
    })
    title = (result.get("title") or "").lower()
    directors = [
        x["name"] for x in result.get("credits", {}).get("crew", [])
        if x.get("job") == "Director"
    ]
    release_year = year(result.get("release_date"))
    if "curry barker" not in [x.lower() for x in directors]:
        raise RuntimeError(f"Direção TMDB inesperada para {TMDB_ID}: {directors}")
    if "obsess" not in title or release_year not in (2025, 2026):
        raise RuntimeError(f"Filme TMDB inesperado: {title} ({release_year})")
    images = api.get(f"/movie/{TMDB_ID}/images", {
        "include_image_language": "pt,en,null"
    })
    poster_path = select_poster(images, result)
    added = []
    dest_poster = folder / "poster.webp"
    if poster_path and not dest_poster.exists():
        webp(api.session, f"{CDN}/w780{poster_path}", dest_poster, 600)
        added.append("poster.webp")
    photos = select_scenes(images, 10)
    for n, file_path in enumerate(photos, 1):
        dest = folder / "cenas" / f"{n:02d}.webp"
        if not dest.exists():
            webp(api.session, f"{CDN}/w1280{file_path}", dest, 1200)
            added.append(f"cenas/{n:02d}.webp")
    return {
        "id": OBSESSION_ID,
        "titulo": result.get("title"),
        "fonte": "TMDB",
        "tmdb_id": TMDB_ID,
        "diretor_confirmado": directors,
        "ano_tmdb": release_year,
        "novos": added,
        "poster_presente": dest_poster.exists(),
        "cenas": len(list((folder/"cenas").glob("[0-9][0-9].webp"))),
    }

def save_poster_enigma(image, dest):
    # Manter a arte promocional íntegra: não cortar os créditos nem o título.
    # Para imagem quadrada/horizontal, completar a proporção 2:3 com fundo desfocado.
    from PIL import ImageFilter
    width, height = 600, 900
    background = ImageOps.fit(image.convert("RGB"), (width, height))
    background = background.filter(ImageFilter.GaussianBlur(26))
    background = Image.blend(background, Image.new("RGB", (width,height), "#0f1d2e"), 0.48)
    artwork = ImageOps.contain(image.convert("RGB"), (width, height), Image.Resampling.LANCZOS)
    position = ((width-artwork.width)//2, (height-artwork.height)//2)
    background.paste(artwork, position)
    dest.parent.mkdir(parents=True, exist_ok=True)
    background.save(dest, "WEBP", quality=85, method=5)

def import_enigma():
    folder = ASSETS / ENIGMA_ID
    folder.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; AllanWoodTV/1.0)", "Accept": "image/webp,image/jpeg,image/*"})
    added = []
    failure = []
    poster = folder / "poster.webp"
    poster_source = "https://filmow.com/o-enigma-webserie-t271505/"
    if not poster.exists():
        try:
            im, poster_url = original_image(session, POSTERS_ENIGMA, min_width=450, min_height=250)
            save_poster_enigma(im, poster)
            poster_source = poster_url
            added.append("poster.webp")
        except Exception as exc:
            failure.append({"arquivo": "poster.webp", "erro": str(exc)[:250]})
    records = []
    for n, (label, code) in enumerate(VIDEOS_ENIGMA, 1):
        path = folder / "cenas" / f"{n:02d}.webp"
        src = f"https://www.youtube.com/watch?v={code}"
        record = {"numero": n, "video": label, "url": src}
        if not path.exists():
            try:
                urls = [
                    f"https://i.ytimg.com/vi/{code}/maxresdefault.jpg",
                    f"https://i.ytimg.com/vi/{code}/sddefault.jpg",
                    f"https://i.ytimg.com/vi/{code}/hqdefault.jpg",
                ]
                im, used_url = original_image(session, urls, min_width=460, min_height=250)
                save_webp(im, path, max_width=1200)
                record["imagem_origem"] = used_url
                added.append(f"cenas/{n:02d}.webp")
            except Exception as exc:
                failure.append({"arquivo": path.name, "erro": str(exc)[:250]})
        record["presente"] = path.exists()
        records.append(record)
    return {
        "id": ENIGMA_ID,
        "titulo": "O Enigma — O Filme (compilação da websérie de 2018)",
        "fonte_poster": poster_source,
        "fonte_cenas": "Miniaturas dos vídeos oficiais do canal Viih Tube no YouTube",
        "poster_presente": poster.exists(),
        "cenas": len(list((folder/"cenas").glob("[0-9][0-9].webp"))),
        "novos": added,
        "videos": records,
        "falhas": failure,
    }

def main():
    api = TMDB()
    records = []
    for key, operation in [
        (OBSESSION_ID, lambda: import_obsession(api)),
        (ENIGMA_ID, import_enigma),
    ]:
        try:
            item = operation()
            item["status"] = "completo" if item.get("poster_presente") and item.get("cenas") else "parcial"
            print(f"{key}: {item['status']}; pôster={item.get('poster_presente')}; cenas={item.get('cenas')}", flush=True)
            records.append(item)
        except Exception as exc:
            print(f"ERRO em {key}: {exc}", flush=True)
            records.append({"id": key, "status": "erro", "motivo": str(exc)[:300]})
    report = {
        "fonte": "TMDB (Obsessão); Filmow e vídeos oficiais da Viih Tube no YouTube (O Enigma)",
        "gerado_em": datetime.now(timezone.utc).isoformat(), "itens": records,
    }
    out = ASSETS / "RELATORIO_FINAL_PENDENTES.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("RESULTADO:", json.dumps([{k:v for k,v in x.items() if k in ("id", "status", "poster_presente", "cenas")} for x in records], ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
