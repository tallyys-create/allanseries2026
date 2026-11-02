#!/usr/bin/env python3
"""Recupera imagens das 14 séries não identificadas no primeiro lote, sem confundir versões."""
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from importar_tmdb_filmes import ROOT, CDN, TMDB, webp, select_poster, select_scenes
from importar_tmdb_tv import load_catalog

# IDs revisados por título, país, ano e elenco. Séries derivadas não usam o ID da original.
TMDB_CONFIRMADOS = {
    "duang-with-you": (284828, 2026, "TH"),
    "maxton-hall": (250670, 2024, "DE"),
    "my-golden-blood": (237327, 2025, "TH"),
    "rebelde-netflix": (134949, 2022, "MX"),
    "thame-e-po": (252649, 2024, "TH"),
    "the-next-prince": (217810, 2025, "TH"),
    "the-boyfriend-temporada-2": (256220, 2024, "JP"),
}
# Estes títulos exigem temporadas específicas ou conteúdo de internet ausente do TMDB.
# URLs abaixo são materiais associados à obra (foto/capa, não imagens de séries homônimas).
PROMOCIONAIS = {
    "khemjira-forever": {
        "poster": ["https://i.ytimg.com/vi/aTi9XvIr66Q/maxresdefault.jpg",
                   "https://i.ytimg.com/vi/aTi9XvIr66Q/hqdefault.jpg"],
        "cenas": ["https://i.ytimg.com/vi/essHZG3cQu0/maxresdefault.jpg"],
        "nota": "Frames dos trailers oficiais do especial de 2026; não da série de 2025."
    },
    "la-banda": {
        "poster": ["https://static.wixstatic.com/media/cb2eac_43a684d0dc504750b8729312967d6210.png/v1/fill/w_800,h_800,al_c,q_90/cb2eac_43a684d0dc504750b8729312967d6210.png",
                   "https://images.squarespace-cdn.com/content/v1/569538aec21b86e162486620/1465821324763-A3EG08FCKKF8I98R4KED/image-asset.jpeg"],
        "cenas": ["https://images.squarespace-cdn.com/content/v1/569538aec21b86e162486620/1465821324763-A3EG08FCKKF8I98R4KED/image-asset.jpeg",
                  "https://st1.uvnimg.com/dc/fb/a67b2a524cf294fd4cec50dcf9aa/rv4-2523.jpg"],
        "nota": "Reality da Univision 2015 com Ricky Martin e CNCO."
    },
    "malhacao-2002": {
        "poster": ["https://is1-ssl.mzstatic.com/image/thumb/RBoAQOSpFfZeXImqorLrkw/1200x675.jpg"],
        "cenas": ["https://s2-gshow.glbimg.com/x4331CMW2RFUlRoEQNSGq1N4GJ8%3D/0x0%3A690x570/984x0/smart/filters%3Astrip_icc%28%29/s.glbimg.com/et/gs/f/original/2015/08/26/pedro_e_kailani.jpg"],
        "nota": "Material da edição de 2002 com Pedro e Júlia (não a série genérica de 1995)."
    },
    "malhacao-2018": {
        "poster": ["https://www.agenciadw3.com.br/landingpage/storage/app/public/pictures/XhUKm7vK1yZzRqyQsZBUp1hrjXvV1zP3qDJbn4HO.png"],
        "cenas": ["https://f.i.uol.com.br/fotografia/2018/03/16/15212420265aac4faaca458_1521242026_3x2_xl.jpg",
                  "https://s2-memoriaglobo.glbimg.com/CE48fgvC3h5w0pkeNPUwJGgP20I%3D/0x0%3A768x768/984x0/smart/filters%3Astrip_icc%28%29/i.s3.glbimg.com/v1/AUTH_ee6202d7f3f346a7a5d7affb807d8893/internal_photos/bs/2021/W/T/1H4rRpRIGeIiNMHyIAbA/assets-fotos-793-globo-has-three-nominations-for-the-2019-international-emmy-kids-awards-globo-recibe-tres-nominaciones-en-el-emmy-kids-internacional-2019-6803cfbde34c-768x768.jpg"],
        "nota": "Material de Vidas Brasileiras (2018), com a professora Gabriela."
    },
    "rebelde-brasil": {
        "poster": ["https://artworks.thetvdb.com/banners/v4/series/301280/posters/6095d3125c5e1.jpg",
                   "https://s2.glbimg.com/YLvwkd_JeRRQxBQHz-4qlpqUlKA%3D/smart/e.glbimg.com/og/ed/f/original/2022/02/16/rebelde_elenco.jpg"],
        "cenas": ["https://s2.glbimg.com/YLvwkd_JeRRQxBQHz-4qlpqUlKA%3D/smart/e.glbimg.com/og/ed/f/original/2022/02/16/rebelde_elenco.jpg"],
        "nota": "Record 2011, elenco Alice, Pedro, Roberta, Diego, Carla e Tomás."
    },
    "a-usurpadollra": {
        "poster": ["https://images.metroimg.com/2026/07/rodrigo-apresentador-protagoniza-a-usurpadollra-parodia-feita-com-ia-1.jpg"],
        "cenas": ["https://images.metroimg.com/2026/07/criador-do-bau-explica-alex-alves-tambem-integra-a-usurpadollra-1.jpg"],
        "nota": "Foto da novela-paródia de IA de Rodrigo Apresentador, 2026."
    },
    "corrida-das-blogueiras-8": {
        "poster": ["https://www.portaltela.com/s.01k8r8f7wx8pm/2026/04/corrida-das-blogueiras-8-temporada-e-confirmada-e-promete-edicao-historica.jpg"],
        "cenas": ["https://pbs.twimg.com/media/HF6DT__bEAAIJdn.jpg"],
        "nota": "Foto promocional do Ano 8, estética rococó, 2026."
    },
}
PENDENTES = set(TMDB_CONFIRMADOS) | set(PROMOCIONAIS)

def baixar(session, sources, path, width=900):
    for source in sources:
        try:
            webp(session, source, path, width)
            if path.exists() and path.stat().st_size > 4000:
                return source
        except Exception as exc:
            print("  Falha em fonte:", source[:90], str(exc)[:110], flush=True)
    return None

def serie_tmdb(api, item, folder):
    serie_id, ano, pais = TMDB_CONFIRMADOS[item["id"]]
    serie = api.get(f"/tv/{serie_id}", {"language": "pt-BR"})
    ano_real = int((serie.get("first_air_date") or "0000")[:4])
    origens = serie.get("origin_country") or []
    if abs(ano_real - ano) > 1 or (origens and pais not in origens):
        raise ValueError(f"TMDB {serie_id} contradiz ano/país: {ano_real}, {origens}")
    imagens = api.get(f"/tv/{serie_id}/images", {"include_image_language": "pt,en,null"})
    poster = select_poster(imagens, serie)
    fundos = select_scenes(imagens, 10)
    scene_sources = [f"{CDN}/w1280{p}" for p in fundos]
    fonte_poster = f"{CDN}/w780{poster}" if poster else None
    if item["id"] == "the-boyfriend-temporada-2":
        # Exclusivamente temporada 2 de 2026: não usar cenas ou pôster genéricos da 1ª.
        season = api.get(f"/tv/{serie_id}/season/2", {"language": "pt-BR"})
        if int((season.get("air_date") or "0000")[:4]) != 2026:
            raise ValueError("Temporada 2 de The Boyfriend não reconhecida como 2026")
        season_poster = season.get("poster_path")
        if season_poster:
            fonte_poster = f"{CDN}/w780{season_poster}"
        scene_sources = [f"{CDN}/w1280{ep['still_path']}" for ep in season.get("episodes", [])
                         if ep.get("still_path") and str(ep.get("air_date","")).startswith("2026")][:10]
        if not scene_sources:
            raise ValueError("Sem fotografias de episódios da segunda temporada; não usar primeira")
    if fonte_poster:
        baixar(api.session, [fonte_poster], folder/"poster.webp", 600)
    scene_dir = folder/"cenas"
    for i, source in enumerate(scene_sources[:10], 1):
        baixar(api.session, [source], scene_dir/f"{i:02d}.webp", 1200)
    return {"tmdb_id": serie_id, "titulo_tmdb": serie.get("name"),
            "ano_tmdb": ano_real, "origem_tmdb": origens,
            "fonte": "TMDB (temporada 2 específica)" if item["id"] == "the-boyfriend-temporada-2" else "TMDB"}

def serie_promocional(api, item, folder):
    dados = PROMOCIONAIS[item["id"]]
    poster_fonte = baixar(api.session, dados["poster"], folder/"poster.webp", 600)
    fontes = []
    for i, source in enumerate(dados["cenas"][:10], 1):
        result = baixar(api.session, [source], folder/"cenas"/f"{i:02d}.webp", 1200)
        if result: fontes.append(result)
    return {"fonte": "Foto promocional / trailer específico", "url_poster": poster_fonte,
            "url_cenas": fontes, "nota": dados["nota"]}

def main():
    from importar_tmdb_filmes import KEY, TOKEN
    if not (KEY or TOKEN):
        raise SystemExit("Secrets TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN necessários")
    api = TMDB()
    catalogo = load_catalog("series")
    registros = []
    for show in catalogo:
        if show["id"] not in PENDENTES: continue
        pasta = ROOT/"assets"/"series"/show["id"]
        try:
            detalhe = (serie_tmdb(api, show, pasta) if show["id"] in TMDB_CONFIRMADOS
                       else serie_promocional(api, show, pasta))
            poster = (pasta/"poster.webp").is_file()
            cenas = len(list((pasta/"cenas").glob("[0-9][0-9].webp")))
            estado = "recuperado" if poster and cenas else "parcial" if poster or cenas else "pendente"
            registros.append({"id":show["id"], "titulo":show["title"], "status":estado,
                              "poster":poster, "cenas":cenas, **detalhe})
            print(f"{show['title']}: {estado}, poster={poster}, cenas={cenas}", flush=True)
        except Exception as exc:
            registros.append({"id":show["id"],"titulo":show["title"],"status":"erro","motivo":str(exc)[:350]})
            print(f"ERRO {show['title']}: {exc}", flush=True)
        time.sleep(.15)
    resultado = {"fonte":"TMDB com IDs verificados + fotografias promocionais específicas",
                 "gerado_em":datetime.now(timezone.utc).isoformat(),
                 "processados":len(registros), "com_poster":sum(x.get("poster",False) for x in registros),
                 "com_cenas":sum(x.get("cenas",0)>0 for x in registros),
                 "itens":registros}
    destino=ROOT/"assets"/"series"/"RELATORIO_RECUPERACAO_14.json"
    destino.write_text(json.dumps(resultado,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("RESUMO",json.dumps({k:v for k,v in resultado.items() if k!="itens"},ensure_ascii=False),flush=True)

if __name__=="__main__":
    main()
