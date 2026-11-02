import requests, re, os
from bs4 import BeautifulSoup
s=requests.Session()
s.headers.update({'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0 Safari/537.36','Accept-Language':'pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6'})
for url in ['https://www.themoviedb.org/search/movie?query=Z-O-M-B-I-E-S','https://www.themoviedb.org/movie/550-fight-club?language=pt-BR','https://www.themoviedb.org/movie/550-fight-club/images/backdrops?language=pt-BR','https://image.tmdb.org/t/p/w300/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg']:
 try:
  r=s.get(url,timeout=20); txt=r.text if 'image.tmdb.org' not in url else ''
  soup=BeautifulSoup(txt,'html.parser')
  matches=[(a.get_text(' ',strip=True)[:70],a.get('href','')[:130]) for a in soup.select('a[href*="/movie/"]')[:8]]
  imgurls=re.findall(r'https?://image\.tmdb\.org/t/p/[^"\'\s<>\\]{10,150}',txt)[:6]
  paths=re.findall(r'/[A-Za-z0-9]{24,36}\.(?:jpg|png|webp)',txt)[:6]
  print('URL',url,'STATUS',r.status_code,'LEN',len(r.content),'TITLE',soup.title.get_text(' ',strip=True)[:80] if soup.title else '', 'MATCHES',matches,'IMAGES',imgurls,'PATHS',paths)
 except Exception as exc: print('ERR',url,type(exc).__name__,str(exc)[:150])
print('TMDB_KEY_EXISTS',bool(os.environ.get('TMDB_API_KEY')))
