#!/usr/bin/env python3
"""Baixa fotogramas/capas de videoclipes oficiais para galerias Taylor Swift.
Dados: API de pesquisa pública Apple Music/iTunes. Mantém somente artista e faixa verificados.
Não mistura clips da gravação original com Taylor's Version."""
from __future__ import annotations
import io, json, re, time, unicodedata
from pathlib import Path
import requests
from PIL import Image, ImageOps

BASE=Path("assets/albuns/taylor-swift")
SOURCE={
"debut":(2006,["Tim McGraw","Teardrops on My Guitar","Our Song","Picture to Burn","Should've Said No"]),
"fearless":(2008,["Love Story","You Belong with Me","White Horse","Fifteen","Fearless"]),
"speak-now":(2010,["Mine","Back to December","Mean","The Story of Us","Sparks Fly","Ours"]),
"red":(2012,["We Are Never Ever Getting Back Together","I Knew You Were Trouble","22","Everything Has Changed","Begin Again","Red"]),
"1989":(2014,["Blank Space","Shake It Off","Style","Bad Blood","Wildest Dreams","Out of the Woods","New Romantics"]),
"reputation":(2017,["Look What You Made Me Do","...Ready for It?","End Game","Delicate"]),
"lover":(2019,["ME!","You Need to Calm Down","Lover","The Man"]),
"folklore":(2020,["cardigan","the 1","exile","betty"]),
"evermore":(2020,["willow","champagne problems","no body, no crime","coney island"]),
"fearless-tv":(2021,["Love Story (Taylor's Version)","Mr. Perfectly Fine","You All Over Me","That's When"]),
"red-tv":(2021,["All Too Well (10 Minute Version)","I Bet You Think About Me","Message in a Bottle (Taylor's Version)"]),
"midnights":(2022,["Anti-Hero","Bejeweled","Lavender Haze","Karma"]),
"speak-now-tv":(2023,["I Can See You","Castles Crumbling (Taylor's Version)","When Emma Falls in Love"]),
"1989-tv":(2023,["Is It Over Now? (Taylor's Version)","Slut! (Taylor's Version)","Say Don't Go (Taylor's Version)"]),
"ttpd":(2024,["Fortnight","I Can Do It with a Broken Heart"]),
"anthology":(2024,["The Black Dog","The Manuscript","So High School","The Prophecy"]),
"showgirl":(2025,["The Fate of Ophelia","Opalite","Elizabeth Taylor"]),
"encore":(2026,["Patient Zero","Cleveland!","Pink Clouding","Babylon"])
}
S=requests.Session()
S.headers["User-Agent"]="AllanWoodTV-Verified-MusicVideo-Stills/1.0"
def norm(text):
    return " ".join(re.sub(r"[^a-z0-9]+"," ",unicodedata.normalize("NFKD",text.lower().replace("’","'")).encode("ascii","ignore").decode()).split())
def check(video, song, year, is_tv, ident):
    if video.get("kind") not in ("music-video","musicVideo"):return False
    if "taylor swift" not in norm(video.get("artistName","")):return False
    title=norm(video.get("trackName",""))
    key=norm(song).replace(" taylor s version","")
    if not title.startswith(key):return False
    actual_year=int((video.get("releaseDate") or "0000")[:4])
    # Não usar videoclipe antigo para representar regravação específica.
    if is_tv and actual_year<year:return False
    if ident=="encore" and actual_year<2026:return False
    if not is_tv and not ident.endswith("tv") and ident not in ("encore","showgirl") and actual_year<year:return False
    if not is_tv and "taylor s version" in title:return False
    if ident not in ("showgirl","encore") and actual_year>2026:return False
    return True
def lookup(song, year, is_tv, ident):
    params={"term":"Taylor Swift "+song,"entity":"musicVideo","media":"music","country":"US","limit":100}
    try:
        r=S.get("https://itunes.apple.com/search",params=params,timeout=24);r.raise_for_status()
        choices=[x for x in r.json().get("results",[]) if check(x,song,year,is_tv,ident)]
        choices.sort(key=lambda x:(norm(x.get("trackName",""))==norm(song),-abs(int((x.get("releaseDate")or"0000")[:4])-year)),reverse=True)
        return choices[0] if choices else None
    except Exception as exc:
        print("BUSCA ERRO",ident,song,str(exc),flush=True)
        return None
def save_art(url,path):
    for size in ["1200x1200bb","800x800bb","600x600bb"]:
        src=re.sub(r"/\d+x\d+bb\.(?:jpg|png)$",f"/{size}.jpg",url)
        try:
            r=S.get(src,timeout=28);r.raise_for_status()
            pic=Image.open(io.BytesIO(r.content)).convert("RGB")
            if min(pic.size)<220:continue
            # Quadro editorial: mantém a composição inteira, sem esticar ou cortar rostos.
            pic.thumbnail((1080,720),resample=Image.Resampling.LANCZOS)
            path.parent.mkdir(parents=True,exist_ok=True)
            pic.save(path,"WEBP",quality=86,method=5)
            return src
        except Exception as e:
            print("DOWNLOAD ERRO",src,str(e),flush=True)
    return None
def main():
    report={}
    for ident,(year,songs) in SOURCE.items():
        entries=[]
        folder=BASE/ident/"cenas"
        saved=0
        for song in songs:
            if saved>=8:break
            video=lookup(song,year,ident.endswith("-tv"),ident)
            if not video:continue
            art=video.get("artworkUrl100")
            if not art:continue
            dest=folder/f"{saved+1:02d}.webp"
            url=save_art(art,dest)
            if url:
                saved+=1
                entries.append({"musica":song,"video":video.get("trackName"),"ano":video.get("releaseDate","")[:4],
                                "fonte":video.get("trackViewUrl"),"imagem":url,"arquivo":str(dest)})
                print("OK",ident,saved,song,flush=True)
            time.sleep(.15)
        report[ident]={"encontradas":saved,"total_tentadas":len(songs),"fotos":entries}
        print("ERA",ident,"fotogramas",saved,flush=True)
    (BASE/"RELATORIO_GALERIAS.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("TOTAL",sum(x["encontradas"] for x in report.values()),"imagens /",len(report),"eras",flush=True)
if __name__=="__main__":main()
