#!/usr/bin/env python3
"""Refaz imagens de Doctor Who 2005 e The Shards 2026 sem deixar cenas antigas."""
import json
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime, timezone
from importar_tmdb_filmes import ROOT, CDN, TMDB, webp, select_poster, select_scenes

CORRECT={
    "doctor-who":{"tmdb":57243,"year":"2005","origin":"GB","original":"Doctor Who"},
    "estilhacos":{"tmdb":298168,"year":"2026","origin":"US","original":"The Shards"},
}

def prepare(api, identifier, settings, stage):
    series=api.get(f"/tv/{settings['tmdb']}",{"language":"pt-BR"})
    yr=(series.get("first_air_date") or "")[:4]
    origin=series.get("origin_country") or []
    names=[series.get("name") or "",series.get("original_name") or ""]
    if yr!=settings["year"] or (origin and settings["origin"] not in origin):
        raise ValueError(f"{identifier}: TMDB não corresponde a {settings['year']} / {settings['origin']}: {yr}/{origin}")
    if not any(n.lower()==settings["original"].lower() for n in names):
        raise ValueError(f"{identifier}: nomes incorretos no TMDB: {names}")
    images=api.get(f"/tv/{settings['tmdb']}/images",{"include_image_language":"pt,en,null"})
    poster=select_poster(images,series)
    if not poster:
        raise ValueError(f"{identifier}: TMDB sem pôster")
    folder=stage/identifier
    webp(api.session,f"{CDN}/w780{poster}",folder/"poster.webp",600)
    scenes=select_scenes(images,10)
    if len(scenes)<10:
        season=api.get(f"/tv/{settings['tmdb']}/season/1",{"language":"en-US"})
        for episode in season.get("episodes",[]):
            frame=episode.get("still_path")
            if frame and frame not in scenes:
                scenes.append(frame)
            if len(scenes)>=10:break
    ok=[]
    for scene in scenes[:10]:
        try:
            file=folder/"cenas"/f"{len(ok)+1:02d}.webp"
            webp(api.session,f"{CDN}/w1280{scene}",file,1200)
            ok.append(scene)
        except Exception as e:
            print(f"Aviso: cena ignorada de {identifier}: {str(e)[:130]}",flush=True)
    if not ok:raise ValueError(f"{identifier}: nenhuma cena baixada, imagens antigas preservadas")
    return {"id":identifier,"tmdb_id":settings["tmdb"],"titulo_tmdb":series.get("name"),
            "ano":yr,"pais":origin,"cenas_no_github":len(ok),
            "poster_no_github":True,"fontes_cenas":ok}

def publish(identifier,stage):
    actual=ROOT/"assets"/"series"/identifier
    incoming=stage/identifier
    scenes=actual/"cenas"
    scenes.mkdir(parents=True,exist_ok=True)
    for old in scenes.iterdir():
        if old.is_file() and old.suffix.lower() in (".webp",".jpg",".jpeg",".png",".avif"):
            old.unlink()
    shutil.copy2(incoming/"poster.webp",actual/"poster.webp")
    for new in sorted((incoming/"cenas").glob("*.webp")):
        shutil.copy2(new,scenes/new.name)

def main():
    from importar_tmdb_filmes import KEY,TOKEN
    if not (KEY or TOKEN):
        raise SystemExit("Configure secrets TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN")
    api=TMDB()
    with TemporaryDirectory(prefix="series-corrigidas-") as d:
        stage=Path(d)
        results=[prepare(api,id,settings,stage) for id,settings in CORRECT.items()]
        for row in results:publish(row["id"],stage)
    timestamp=datetime.now(timezone.utc).isoformat()
    assets=ROOT/"assets"/"series"
    report={"status":"corrigido","gerado_em":timestamp,
            "descricao":"Doctor Who de 2005 e The Shards de 2026: pôster e cenas completamente substituídos",
            "itens":results}
    (assets/"RELATORIO_CORRECAO_DOCTOR_ESTILHACOS.json").write_text(
        json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    old_report=assets/"RELATORIO_TMDB.json"
    if old_report.exists():
        old=json.loads(old_report.read_text(encoding="utf-8"))
        for item in old.get("itens",[]):
            update=next((r for r in results if r["id"]==item.get("id")),None)
            if not update:continue
            item.update({"status":"corrigido","tmdb_id":update["tmdb_id"],
                         "titulo_tmdb":update["titulo_tmdb"],"primeira_exibicao":update["ano"],
                         "cenas_no_github":update["cenas_no_github"],
                         "cenas_disponiveis":update["cenas_no_github"],
                         "poster_no_github":True,
                         "motivo":"Identidade corrigida, imagens anteriores removidas"})
        old["correcao_identidade_em"]=timestamp
        old_report.write_text(json.dumps(old,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("SUCESSO:",json.dumps(results,ensure_ascii=False),flush=True)

if __name__=="__main__":main()
