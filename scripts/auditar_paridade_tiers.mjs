/* Compara séries, filmes e álbuns no mesmo navegador, sem alterar rankings reais. */
import fs from "node:fs";
import {chromium} from "playwright";
const root="http://127.0.0.1:8765/";
const pages=[
 {key:"series-allan",path:"series-2026.html",kind:"series",role:"allan"},
 {key:"filmes-allan",path:"filmes-2026.html",kind:"filmes",role:"allan"},
 {key:"albuns-allan",path:"albuns-taylor.html",kind:"albuns",role:"allan"},
 {key:"series-publico",path:"series-2026-publico.html",kind:"series",role:"publico"},
 {key:"filmes-publico",path:"filmes-2026-publico.html",kind:"filmes",role:"publico"},
 {key:"albuns-publico",path:"albuns-taylor-publico.html",kind:"albuns",role:"publico"}
];
const report={executedAt:new Date().toISOString(),type:"paridade-tiers",pages:{},checks:[],errors:[]};
const check=(label,ok,detail)=>{report.checks.push({label,pass:!!ok,detail});console.log(ok?"OK":"FALHOU",label,JSON.stringify(detail).slice(0,300))};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const measure=async page=>page.evaluate(()=>{
 const q=css=>document.querySelector(css);
 const box=css=>{const el=q(css);if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
 const rows=[...document.querySelectorAll("#tierboard .tier,#board .tier")];
 const isAlbum=!!q("#albumDialog");
 const ranked=rows.flatMap(r=>[...r.querySelectorAll(".album[data-id],.series-card[data-id]")]).length;
 const cards=[...document.querySelectorAll("#pool .album,#libraryGrid .series-card")];
 const control={};
 for(const [key,sel] of Object.entries({
  random:"#randomBtn",layout:"#layoutToggleBtn",focus:"#focusToggleBtn",live:"#presentBtn",
  sizes:"#tierCardSize,#sizeSelect",export:"#exportPngBtn,#exportBtn",edit:"#editTiersBtn",
  undo:"#undoBtn",reset:"#resetBtn",backup:"#backupBtn",import:"#importBtn",
  share:"#sharePublicBtn,#shareTierBtn",nickname:"#viewerNameInput"
 })){
  const el=q(sel);control[key]={present:!!el,visible:!!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().width>0};
 }
 return {
  viewport:{width:innerWidth,height:innerHeight},
  portal:!!q(".portal-return"),
  heroText:q(".hero h1")?.innerText||"",
  audienceArt:!!q(".audience-art"),
  officialHero:!!q(".court-allan"),
  headerAvatar:!!q(".brandavatar img,.allan-avatar img"),
  nickname:q("#viewerNameInput")?.value||null,
  sections:{workspace:box(".ranking-workspace"),panel:box(".ranking-panel"),library:box(".ranking-workspace>.library"),board:box("#tierboard,#board"),tierLabel:box(".tier-label"),firstTier:box(".tier"),catalogList:box("#libraryGrid,#pool")},
  cards:{rows:rows.length,ranked,catalogCount:cards.length,catalogBroken:cards.filter(card=>{const img=card.querySelector("img");return img?.complete&&img.naturalWidth===0}).length},
  controls:control,
  sidebar:document.body.classList.contains("layout-sidebar"),
  layout:getComputedStyle(q(".ranking-workspace")).display,
  overflowX:document.documentElement.scrollWidth-innerWidth,
  tierLabels:rows.map(r=>r.querySelector(".tier-label .name,.tier-label .tier-name,.tier-label b")?.textContent?.trim()),
  tierDescriptions:rows.map(r=>r.querySelector(".tier-description")?.textContent?.trim()),
  categoryCounts:rows.map(r=>[...r.querySelectorAll(".album[data-id],.series-card[data-id]")].length),
  albumIds:isAlbum?window.TAYLOR_ALBUMS?.map(a=>({id:a.id,title:a.title,year:a.year,tracks:a.tracks.length}))||[]:null,
  imagesComplete:isAlbum?window.TAYLOR_ALBUMS?.length===18:null
 };
});
try{
 for(const item of pages){
  const context=await browser.newContext({viewport:{width:1450,height:900},deviceScaleFactor:1,acceptDownloads:true});
  await context.addInitScript(()=>sessionStorage.setItem("allanwoodtv-host-session-v1","yes"));
  const page=await context.newPage();
  page.on("pageerror",error=>report.errors.push({page:item.key,error:error.message}));
  try{
   await page.goto(root+item.path,{waitUntil:"domcontentloaded",timeout:50000});
   await page.locator("#tierboard .tier,#board .tier").first().waitFor({timeout:20000});
   await page.waitForTimeout(200);
   const desktop=await measure(page);
   report.pages[item.key]={desktop};
   check(item.key+" | seis tiers",desktop.cards.rows===6,desktop.cards.rows);
   check(item.key+" | descrição em todos os tiers",desktop.tierDescriptions.every(Boolean),desktop.tierDescriptions);
   check(item.key+" | recursos essenciais",["random","layout","focus","live","sizes","export","undo","reset","backup","import"].every(k=>desktop.controls[k].present),desktop.controls);
   check(item.key+" | catálogo do lado",desktop.sidebar&&desktop.layout==="grid"&&desktop.sections.library.x>desktop.sections.panel.x+desktop.sections.panel.w-4,{panel:desktop.sections.panel,library:desktop.sections.library,layout:desktop.layout});
   check(item.key+" | imagem do Allan no cabeçalho",desktop.headerAvatar,desktop.headerAvatar);
   if(item.role==="publico"){
    check(item.key+" | identidade de público",desktop.audienceArt&&!desktop.officialHero&&/SEU|VEREDITO/.test(desktop.heroText),{audience:desktop.audienceArt,official:desktop.officialHero,hero:desktop.heroText});
    check(item.key+" | apelido e compartilhar",desktop.controls.nickname.present&&desktop.controls.share.visible,{nickname:desktop.controls.nickname,share:desktop.controls.share});
    check(item.key+" | editor não aparece para o público",!desktop.controls.edit.visible,desktop.controls.edit);
   }else check(item.key+" | identidade do Allan",desktop.officialHero&&!desktop.audienceArt,{official:desktop.officialHero,audience:desktop.audienceArt});
   if(item.kind==="albuns"){
    const ids=desktop.albumIds;
    check(item.key+" | 18 álbuns únicos",ids.length===18&&new Set(ids.map(a=>a.id)).size===18,ids.map(a=>a.id));
    check(item.key+" | todas as tracklists",ids.every(a=>a.tracks>=11),ids.map(a=>[a.title,a.tracks]));
    await page.waitForFunction(()=>[...document.querySelectorAll("#pool .album img")].every(img=>img.complete),null,{timeout:18000});
    const coverCount=await page.locator("#pool .album img").evaluateAll(imgs=>imgs.filter(img=>img.naturalWidth>0).length);
    check(item.key+" | 18 capas",coverCount===18,coverCount);
    const initial=await page.evaluate(()=>window.TAYLOR_APP.albums.slice(0,2).map(a=>a.id));
    await page.evaluate(([a,b])=>{
     const t=window.TAYLOR_APP.tiers[0].id;
     window.TAYLOR_APP.move(a,t);
     window.TAYLOR_APP.move(b,t,a);
    },initial);
    const after=await page.locator("#board .tier").first().locator(".album[data-id]").evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
    check(item.key+" | ordem personalizada por tier",after.length===2&&after[0]===initial[1]&&after[1]===initial[0],after);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#board .tier").first().locator(".album[data-id]").first().waitFor();
    const afterReload=await page.locator("#board .tier").first().locator(".album[data-id]").evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
    check(item.key+" | ordem mantida ao recarregar",JSON.stringify(afterReload)===JSON.stringify(after),{before:after,afterReload});
    check(item.key+" | exportação recebe ordem personalizada",await page.evaluate(()=>{
      const app=window.TAYLOR_APP;return app.getOrdered(app.tiers[0].id)[0].id===app.albums[1].id
    }),true);
    const [download]=await Promise.all([page.waitForEvent("download",{timeout:15000}),page.locator("#exportBtn").click()]);
    check(item.key+" | exportação PNG",download.suggestedFilename().endsWith(".png"),download.suggestedFilename());
    if(item.role==="publico"){
       await page.locator("#viewerNameInput").fill("Participante de teste");
       const [shared]=await Promise.all([page.waitForEvent("download",{timeout:15000}),page.locator("#shareTierBtn").click()]);
       check(item.key+" | compartilhar ranking real",shared.suggestedFilename().endsWith(".png"),shared.suggestedFilename());
    }
   }
   await page.screenshot({path:"/tmp/paridade-"+item.key+"-desktop.png",fullPage:false});
   await page.setViewportSize({width:390,height:844});
   await page.waitForTimeout(100);
   const mobile=await measure(page);
   report.pages[item.key].mobile=mobile;
   check(item.key+" | catálogo abaixo no celular",mobile.sections.library.y>=mobile.sections.panel.y+mobile.sections.panel.h-8,{panel:mobile.sections.panel,library:mobile.sections.library});
   check(item.key+" | largura sem transbordamento",mobile.overflowX<=3,mobile.overflowX);
   await page.screenshot({path:"/tmp/paridade-"+item.key+"-mobile.png",fullPage:false});
  }catch(err){report.errors.push({page:item.key,error:String(err).slice(0,1400)});console.error(item.key,String(err).slice(0,300))}
  finally{await context.close();}
 }
}finally{await browser.close()}
const host=report.pages["series-allan"]?.desktop,film=report.pages["filmes-allan"]?.desktop,album=report.pages["albuns-allan"]?.desktop;
if(host&&film&&album){
 const dims=[host,film,album].map(x=>({panel:x.sections.panel.w,library:x.sections.library.w,label:x.sections.tierLabel.w}));
 report.comparison={desktopDimensions:dims,albumVersusSeries:{panel:Math.round(dims[2].panel-dims[0].panel),catalog:Math.round(dims[2].library-dims[0].library),label:Math.round(dims[2].label-dims[0].label)}};
 check("largura da coluna de catálogo coerente",Math.abs(dims[2].library-dims[0].library)<=35,report.comparison.albumVersusSeries);
 check("largura da coluna de veredito coerente",Math.abs(dims[2].label-dims[0].label)<=35,report.comparison.albumVersusSeries);
}
report.total=report.checks.length;
report.passed=report.checks.filter(c=>c.pass).length;
report.failed=report.checks.filter(c=>!c.pass);
report.success=report.failed.length===0&&report.errors.length===0;
fs.mkdirSync("assets/albuns/taylor-swift",{recursive:true});
fs.writeFileSync("assets/albuns/taylor-swift/RELATORIO_PARIDADE.json",JSON.stringify(report,null,2)+"\n");
console.log("AUDITORIA",report.passed,"/",report.total,"failed",report.failed.length,"errors",report.errors.length);
if(!report.success)process.exitCode=1;
