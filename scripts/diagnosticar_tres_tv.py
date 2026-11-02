#!/usr/bin/env python3
"""Diagnóstico restrito aos três títulos TV Allanzinho pendentes no TMDB."""
import json
from datetime import datetime, timezone
from importar_tmdb_filmes import ROOT, TMDB

QUERIES={
    "pokemon-jornadas":["Pokémon Journeys", "Pokémon", "Pocket Monsters", "ポケットモンスター", "Poketto Monsutā", "Pokemon Journeys The Series"],
    "power-rangers-tempestade-ninja":["Power Rangers Ninja Storm","Power Rangers", "Ninja Storm"],
    "madeline":["Madeline", "The New Adventures of Madeline", "Les Nouvelles Aventures de Madeline"],
}
PARENTS={
    "pokemon-jornadas":["Pokémon", "Pocket Monsters"],
    "power-rangers-tempestade-ninja":["Power Rangers"],
    "madeline":["Madeline"],
}

def main():
    api=TMDB()
    report={"generated":datetime.now(timezone.utc).isoformat(),"entries":{}}
    for entry,qs in QUERIES.items():
        records={}
        for q in qs:
            for lang in ["en-US","pt-BR"]:
                response=api.get("/search/tv",{"query":q,"language":lang,"include_adult":"false"})
                for item in response.get("results",[])[:12]:
                    if item["id"] not in records:
                        records[item["id"]]={"id":item["id"],"name":item.get("name"),"original":item.get("original_name"),"first_air_date":item.get("first_air_date"),"countries":item.get("origin_country"),"poster":bool(item.get("poster_path")),"image":bool(item.get("backdrop_path")),"found_by":[]}
                    records[item["id"]]["found_by"].append(q+" ["+lang+"]")
        values=list(records.values())
        values.sort(key=lambda c:(2019 if entry=="pokemon-jornadas" else 2003 if entry=="power-rangers-tempestade-ninja" else 1993)==int(str(c["first_air_date"] or "0")[:4]),reverse=True)
        parents=[]
        for item in values[:25]:
            title=(str(item.get("name") or "")+" "+str(item.get("original") or "")).lower()
            if any(name.casefold() in title.casefold() for name in PARENTS[entry]):
                if entry=="power-rangers-tempestade-ninja" and item.get("first_air_date","").startswith("1993") or entry=="pokemon-jornadas" and item.get("first_air_date","").startswith(("1997","2019")) or entry=="madeline" and item.get("first_air_date","").startswith(("1988","1993","1995")):
                    try:
                        detail=api.get(f"/tv/{item['id']}",{"language":"en-US"})
                        seasons=[{"season_number":s.get("season_number"),"name":s.get("name"),"air_date":s.get("air_date"),"poster":bool(s.get("poster_path"))} for s in detail.get("seasons",[])]
                        focus=seasons if entry=="madeline" else [s for s in seasons if entry=="pokemon-jornadas" and (s["air_date"] or "").startswith(("2019","2020")) or entry=="power-rangers-tempestade-ninja" and (s["air_date"] or "").startswith(("2003","2004")) or "ninja storm" in (s["name"] or "").lower() or "journeys" in (s["name"] or "").lower()]
                        parents.append({"id":item["id"],"title":detail.get("name"),"year":detail.get("first_air_date"),"num_seasons":len(seasons),"seasons":focus[:25]})
                    except Exception as err:parents.append({"id":item["id"],"error":str(err)})
        report["entries"][entry]={"candidates":values[:35],"parent_seasons":parents}
        print(f"{entry}: {len(values)} candidatos; {len(parents)} programas com temporadas analisadas",flush=True)
    path=ROOT/"assets/tv-allanzinho/RELATORIO_BUSCA_PENDENTES.json"
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Diagnóstico concluído",flush=True)
if __name__=="__main__":
    main()
