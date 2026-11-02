#!/usr/bin/env python3
"""Reconstrói INDICE.csv a partir dos arquivos reais (sem contagens antigas)."""
import csv
import json
from pathlib import Path
from importar_tmdb_tv import ROOT, load_catalog

def main():
    pasta=ROOT/"assets"/"series"
    catalogo=load_catalog("series")
    caminho=pasta/"INDICE.csv"
    with caminho.open("w",encoding="utf-8",newline="") as arquivo:
        writer=csv.writer(arquivo)
        writer.writerow(["titulo","pasta","poster","quantidade_de_cenas_no_catalogo"])
        for serie in catalogo:
            local=pasta/serie["id"]
            cenas=list((local/"cenas").glob("[0-9][0-9].webp"))
            poster=local/"poster.webp"
            writer.writerow([serie["title"],f"assets/series/{serie['id']}",
                             f"assets/series/{serie['id']}/poster.webp" if poster.is_file() else "",
                             len(cenas)])
    qtd_poster=sum((pasta/s["id"]/"poster.webp").is_file() for s in catalogo)
    qtd_cenas=sum(len(list((pasta/s["id"]/"cenas").glob("[0-9][0-9].webp"))) for s in catalogo)
    print(f"ÍNDICE atualizado: {len(catalogo)} séries, {qtd_poster} pôsteres, {qtd_cenas} cenas",flush=True)
if __name__=="__main__":
    main()
