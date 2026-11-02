#!/usr/bin/env python3
"""Recuperação segura dos três títulos TV Allanzinho pendentes.

TMDB:
- Pokémon Jornadas: Pokémon (60572), temporada 23 (2019)
- Power Rangers: Tempestade Ninja: Power Rangers (2328), temporada 11 (2003)
- Madeline: The New Adventures Of Madeline (19283), temporada 1 (1993)
Apenas estas três pastas são afetadas, preservando imagens existentes.
"""
import json
import time
from datetime import datetime, timezone

from importar_tmdb_filmes import ROOT, CDN, TMDB, webp, year, select_poster, select_scenes

# Fotos de Madeline confirmadas em páginas da série animada de 1993.
# Fontes: Prime Video (1993), TV Guide (Madeline 1993) e BravePlus (S01 E11).
# Não misturar com o filme live-action nem com edições posteriores.
MADELINE_EXTERNAL = [
    {
        "source": "Prime Video - Madeline (1993)",
        "url": "https://m.media-amazon.com/images/S/pv-target-images/676a093e8de8e18a10c095c62cac3e09b5c943eabab1dd81e4b789fbf8714b32._SX1080_FMjpg_.jpg",
        "page": "https://www.primevideo.com/-/pt/detail/0O9LLXRD43CKKESBAZ5SMV841G",
    },
    {
        "source": "TV Guide - Madeline (1993)",
        "url": "https://cdn.jwplayer.com/thumbs/3bWshvcp-640.jpg",
        "page": "https://www.tvguide.com/tvshows/madeline/1030156128/",
    },
    {
        "source": "BravePlus - Madeline S01 E11",
        "url": "https://alpha.uscreencdn.com/1110xnull/images/programs/3498251/horizontal/big_c128bf4a-0cd6-4e6c-8c48-0c68d1f1acb4.jpg?auto=webp",
        "page": "https://watch.braveplus.com/programs/madeline-1-11",
    },
]

FOLDER = ROOT / "assets" / "tv-allanzinho"
TARGETS = {
    "pokemon-jornadas": {
        "title": "Pokémon Jornadas",
        "series_id": 60572,
        "season": 23,
        "year": 2019,
        "parent_year": 1997,
        "parent_name": "Pokémon",
        "season_name": "journeys",
        "poster_source": "season",
    },
    "power-rangers-tempestade-ninja": {
        "title": "Power Rangers: Tempestade Ninja",
        "series_id": 2328,
        "season": 11,
        "year": 2003,
        "parent_year": 1993,
        "parent_name": "Power Rangers",
        "season_name": "ninja storm",
        "poster_source": "season",
    },
    "madeline": {
        "title": "Madeline",
        "series_id": 19283,
        "season": 1,
        "year": 1993,
        "parent_year": 1993,
        "parent_name": "The New Adventures Of Madeline",
        "season_name": "",
        "poster_source": "series",
    },
}

def check_record(series, season, target):
    tmdb_name=(series.get("name") or series.get("original_name") or "").lower()
    if target["parent_name"].lower() not in tmdb_name:
        raise RuntimeError(
            f"Registro diferente do esperado: {series.get('name')} "
            f"(deveria ser {target['parent_name']})"
        )
    if year(series.get("first_air_date"))!=target["parent_year"]:
        raise RuntimeError(f"Ano do programa inesperado: {series.get('first_air_date')}")
    if season.get("season_number")!=target["season"]:
        raise RuntimeError(f"Numero de temporada incorreto: {season.get('season_number')}")
    if year(season.get("air_date"))!=target["year"]:
        raise RuntimeError(f"Temporada com ano inesperado: {season.get('air_date')}")
    if target["season_name"] not in (season.get("name") or "").lower():
        raise RuntimeError(f"Temporada incorreta: {season.get('name')}")

def collect_stills(api, series_id, season_number, season, limit=10):
    """Somente stills de episódios DA temporada correta, nunca da série genérica."""
    unique=[]
    for ep in season.get("episodes") or []:
        path=ep.get("still_path")
        if path and path not in unique:
            unique.append(path)
        if len(unique)>=limit:
            return unique
    # Alguns episódios possuem stills extras na API de imagens.
    for ep in (season.get("episodes") or [])[:14]:
        if len(unique)>=limit:
            break
        number=ep.get("episode_number")
        if number is None:
            continue
        try:
            data=api.get(
                f"/tv/{series_id}/season/{season_number}/episode/{number}/images",
                {"include_image_language": "en,null"}
            )
            for img in data.get("stills",[]):
                path=img.get("file_path")
                if path and img.get("aspect_ratio",0)>=1.35 and path not in unique:
                    unique.append(path)
                if len(unique)>=limit:
                    break
        except Exception as exc:
            print(f"AVISO: imagens extras do episodio {number}: {exc}",flush=True)
        time.sleep(.04)
    return unique[:limit]

def save_target(api, slug, target):
    folder=FOLDER/slug
    poster=folder/"poster.webp"
    scene_folder=folder/"cenas"
    series_id=target["series_id"]
    series=api.get(f"/tv/{series_id}",{"language":"en-US"})
    season=api.get(f"/tv/{series_id}/season/{target['season']}",{"language":"en-US"})
    check_record(series,season,target)
    result={
        "id": slug,
        "title": target["title"],
        "tmdb_series_id": series_id,
        "tmdb_series_name": series.get("name"),
        "season_number": target["season"],
        "season_name": season.get("name"),
        "season_year": year(season.get("air_date")),
        "poster_source":target["poster_source"],
        "new_files":[],
        "warnings":[],
    }
    if not poster.exists():
        candidate=(
            season.get("poster_path") if target["poster_source"]=="season"
            else series.get("poster_path")
        )
        if not candidate and target["poster_source"]=="season":
            # Se não houver pôster da temporada, não usar o pôster da
            # franquia genérica: marcá-lo para revisão.
            result["warnings"].append("Sem poster especifico da temporada no TMDB")
        elif not candidate:
            result["warnings"].append("Sem poster do programa de 1993 no TMDB")
        else:
            try:
                webp(api.session,f"{CDN}/w780{candidate}",poster,600)
                result["new_files"].append("poster.webp")
            except Exception as exc:
                result["warnings"].append(f"Falha no poster: {str(exc)[:150]}")
    stills=collect_stills(api,series_id,target["season"],season,10)
    if slug=="madeline" and not stills:
        # Série independente de 1993: pode usar seus próprios backdrops.
        try:
            images=api.get(f"/tv/{series_id}/images",{"include_image_language":"en,null"})
            stills=select_scenes(images,10)
            result["fallback"]="backdrops da serie de 1993"
        except Exception as exc:
            result["warnings"].append(f"Falha ao buscar cenas da serie: {str(exc)[:150]}")
    for index,path in enumerate(stills[:10],1):
        dest=scene_folder/f"{index:02d}.webp"
        if dest.exists():
            continue
        try:
            webp(api.session,f"{CDN}/w1280{path}",dest,1200)
            result["new_files"].append(f"cenas/{index:02d}.webp")
        except Exception as exc:
            result["warnings"].append(f"Falha na cena {index:02d}: {str(exc)[:150]}")
    if slug=="madeline" and not list(scene_folder.glob("[0-9][0-9].webp")):
        # O TMDB tem o pôster correto, mas não tem imagens de episódios.
        # Usar apenas fotos reais atribuídas à série de 1993.
        import requests
        session=requests.Session()
        session.headers.update({
            "User-Agent":"Mozilla/5.0 (compatible; AllanWoodTV/1.0)",
            "Accept":"image/webp,image/jpeg,image/*",
        })
        result["external_images"]=[]
        for source in MADELINE_EXTERNAL:
            index=len(result["external_images"])+1
            dest=scene_folder/f"{index:02d}.webp"
            try:
                webp(session,source["url"],dest,1200)
                result["new_files"].append(f"cenas/{index:02d}.webp")
                result["external_images"].append(source)
            except Exception as exc:
                result["warnings"].append(
                    f"Imagem externa {source['source']}: {str(exc)[:160]}"
                )
    result["poster_exists"]=poster.exists()
    result["scene_count"]=len(list(scene_folder.glob("[0-9][0-9].webp")))
    result["stills_at_tmdb"]=len(stills)
    result["status"]=(
        "completo" if result["poster_exists"] and result["scene_count"]>0
        else "parcial" if result["poster_exists"] or result["scene_count"] else "revisar"
    )
    print(
        f"{slug}: {result['status']}; poster={result['poster_exists']}; "
        f"cenas={result['scene_count']}; novos={len(result['new_files'])}",
        flush=True
    )
    return result

def main():
    api=TMDB()
    report={
        "source":"TMDB TV / temporadas especificas",
        "generated":datetime.now(timezone.utc).isoformat(),
        "total_catalog":23,
        "requested":len(TARGETS),
        "items":[],
    }
    for slug,target in TARGETS.items():
        try:
            result=save_target(api,slug,target)
        except Exception as exc:
            result={
                "id":slug,"title":target["title"],
                "status":"erro","reason":str(exc)[:300],
            }
            print(f"ERRO {slug}: {exc}",flush=True)
        report["items"].append(result)
    report["completed"]=sum(x["status"]=="completo" for x in report["items"])
    report["partial"]=sum(x["status"]=="parcial" for x in report["items"])
    report["errors"]=sum(x["status"]=="erro" for x in report["items"])
    FOLDER.mkdir(parents=True,exist_ok=True)
    file=FOLDER/"RELATORIO_RECUPERACAO_TV.json"
    file.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("RESULTADO:",json.dumps({k:v for k,v in report.items() if k!="items"},ensure_ascii=False),flush=True)

if __name__=="__main__":
    main()
