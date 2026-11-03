#!/usr/bin/env python3
"""Importa capas de album verificadas pelo catalogo Apple iTunes.
Nunca substitui por faixas/singles ou edicoes diferentes so para preencher.
Uso: python scripts/importar_capas_taylor.py
"""
from __future__ import annotations
import io, json, re, sys, time, unicodedata
from pathlib import Path
from urllib.parse import quote
import requests
from PIL import Image, ImageOps

ROOT=Path("assets/albuns/taylor-swift")
ALBUMS=[
("debut","Taylor Swift",2006),
("fearless","Fearless",2008),
("speak-now","Speak Now",2010),
("red","Red",2012),
("1989","1989",2014),
("reputation","reputation",2017),
("lover","Lover",2019),
("folklore","folklore",2020),
("evermore","evermore",2020),
("fearless-tv","Fearless (Taylor's Version)",2021),
("red-tv","Red (Taylor's Version)",2021),
("midnights","Midnights",2022),
("speak-now-tv","Speak Now (Taylor's Version)",2023),
("1989-tv","1989 (Taylor's Version)",2023),
("ttpd","THE TORTURED POETS DEPARTMENT",2024),
("anthology","THE TORTURED POETS DEPARTMENT: THE ANTHOLOGY",2024),
("showgirl","The Life of a Showgirl",2025),
("encore","The Life of a Showgirl: The Encore",2026)
]
SESSION=requests.Session()
SESSION.headers["User-Agent"]="AllanWoodTV-Album-Art-Importer/1.0"
def norm(v):
    v=unicodedata.normalize("NFKD",v.lower().replace("’","'")).encode("ascii","ignore").decode()
    v=re.sub(r"[^a-z0-9]+"," ",v)
    return " ".join(v.split())
def valid_name(want,got):
    q=norm(want); a=norm(got)
    if q==a:return 200
    if q in a:
        remainder=a.replace(q,"",1).strip()
        allowed=("deluxe","edition","bonus","track","version","special","digital","international","platinum","explicit","amended","standard")
        # Para as edicoes especiais separadas, nao aceitar outro subtipo.
        if any(x in remainder for x in ["anthology","encore","taylor","acoustic collection","cabaret","show business"]): return -999
        return 90 if any(x in remainder for x in allowed) else 50
    # original vs Taylor's Version nao sao intercambiaveis
    return -999
def candidates(name):
    terms=[name,"Taylor Swift "+name]
    found={}
    for term in terms:
        params={"term":term,"entity":"album","media":"music","country":"US","limit":200}
        try:
            r=SESSION.get("https://itunes.apple.com/search",params=params,timeout=22)
            r.raise_for_status()
            for entry in r.json().get("results",[]):
                if entry.get("wrapperType")=="collection" and "taylor swift" in norm(entry.get("artistName","")):
                    found[entry.get("collectionId")]=entry
        except Exception as e:
            print("Consulta falhou",term,repr(e),flush=True)
        time.sleep(.25)
    return list(found.values())
def choose(name,year):
    ranked=[]
    for item in candidates(name):
        title=item.get("collectionName","")
        ns=valid_name(name,title)
        if ns<0:continue
        rel=int((item.get("releaseDate") or "0000")[:4])
        # Excluir edicoes de ano diferente, especialmente regravacoes
        if abs(rel-year)>1: continue
        score=ns + (45 if rel==year else 0) + (min(item.get("trackCount",0),31)/100)
        ranked.append((score,item))
    ranked.sort(reverse=True,key=lambda p:p[0])
    return ranked[0][1] if ranked and ranked[0][0]>=100 else None
def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    report={}
    ok=0
    for ident,name,year in ALBUMS:
        print("Procurando",ident,name,year,flush=True)
        item=choose(name,year)
        if not item:
            report[ident]={"status":"sem-correspondencia-segura","titulo":name}
            continue
        art=item.get("artworkUrl100") or item.get("artworkUrl60")
        if not art:
            report[ident]={"status":"sem-arte","titulo":name,"fonte":item.get("collectionName")}
            continue
        art=re.sub(r"/\d+x\d+bb\.(?:jpg|png)$","/1200x1200bb.jpg",art)
        try:
            r=SESSION.get(art,timeout=25);r.raise_for_status()
            pic=Image.open(io.BytesIO(r.content)).convert("RGB")
            if min(pic.size)<250:raise ValueError("resolucao muito pequena")
            pic=ImageOps.fit(pic,(700,700),method=Image.Resampling.LANCZOS)
            folder=ROOT/ident;folder.mkdir(parents=True,exist_ok=True)
            output=folder/"poster.webp"
            pic.save(output,format="WEBP",quality=88,method=6)
            ok+=1
            report[ident]={"status":"ok","titulo":name,"ano":year,"catalogo":item["collectionName"],
                "catalogo_ano":item["releaseDate"][:4],"collection_id":item["collectionId"],
                "fonte":item.get("collectionViewUrl"),"imagem":art,"arquivo":str(output),"bytes":output.stat().st_size}
            print("OK:",ident,item["collectionName"],output.stat().st_size,flush=True)
        except Exception as e:
            report[ident]={"status":"falhou-download","titulo":name,"erro":str(e)}
            print("Erro baixando",ident,str(e),flush=True)
    (ROOT/"RELATORIO_CAPAS.json").write_text(json.dumps({"quantidade":ok,"total":len(ALBUMS),"albuns":report},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("FINAL",ok,"de",len(ALBUMS),"capas importadas.",flush=True)
if __name__=="__main__":
    main()
