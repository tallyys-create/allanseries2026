/* Regressão real de arrastar no Chrome — álbum + séries/filmes como referência. */
import fs from "node:fs";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const report={executedAt:new Date().toISOString(),type:"native-drag-parity",checks:[],errors:[]};
const check=(label,pass,detail)=>{report.checks.push({label,pass:!!pass,detail});console.log(pass?"OK":"FALHOU",label,JSON.stringify(detail).slice(0,210));};
const host="http://127.0.0.1:8765/";
const modes=[{name:"albuns-allan",path:"albuns-taylor.html",album:true},
 {name:"albuns-publico",path:"albuns-taylor-publico.html",album:true},
 {name:"series-allan",path:"series-2026.html",album:false},
 {name:"filmes-allan",path:"filmes-2026.html",album:false},
 {name:"series-publico",path:"series-2026-publico.html",album:false},
 {name:"filmes-publico",path:"filmes-2026-publico.html",album:false}];
async function audition(mode){
 const ctx=await browser.newContext({viewport:{width:1480,height:900},deviceScaleFactor:1,acceptDownloads:true});
 await ctx.addInitScript(()=>sessionStorage.setItem("allanwoodtv-host-session-v1","yes"));
 const page=await ctx.newPage();
 page.on("pageerror",e=>report.errors.push({mode:mode.name,error:e.message}));
 try{
   await page.goto(host+mode.path,{waitUntil:"domcontentloaded",timeout:35000});
   await page.locator(mode.album?"#pool .album":"#libraryGrid .series-card").first().waitFor({timeout:16000});
   const board=mode.album?"#board":"#tierboard";
   const pool=mode.album?"#pool":"#libraryGrid";
   const card=mode.album?".album[data-id]":".series-card[data-id]";
   // Instrumentação verifica prévia *antes* de soltar, não só o resultado.
   await page.evaluate(()=>{
     window.__dragEvents={previewSeen:false,previewMoves:0,dragStarted:0};
     const root=document.getElementById("rankingWorkspace");
     const observer=new MutationObserver(()=>{
       const p=root?.querySelector(".live-drag-preview");
       if(p){window.__dragEvents.previewSeen=true;window.__dragEvents.previewMoves++;}
     });
     if(root)observer.observe(root,{subtree:true,childList:true});
     root?.addEventListener("dragstart",()=>window.__dragEvents.dragStarted++,true);
   });
   let src=page.locator(pool+" "+card).first();
   const id=await src.getAttribute("data-id");
   const first=page.locator(board+" .tier").first().locator(".tier-dock");
   try{
     await src.dragTo(first,{timeout:12000,steps:12});
     const count=await page.locator(board+" .tier").first().locator(card).count();
     check(mode.name+" | catálogo → tier",count>=1,{id,count});
   }catch(e){check(mode.name+" | catálogo → tier",false,e.message.slice(0,200));return}
   const metrics=await page.evaluate(()=>window.__dragEvents);
   check(mode.name+" | prévia durante arrasto",metrics.previewSeen&&metrics.previewMoves>0,metrics);
   if(!mode.album)return;
   // Segundo álbum no mesmo nível.
   src=page.locator("#pool .album[data-id]").first();
   const secondId=await src.getAttribute("data-id");
   await src.dragTo(first,{timeout:12000,steps:13});
   let order=await page.locator("#board .tier").first().locator(".album[data-id]").evaluateAll(els=>els.map(el=>el.dataset.id));
   check(mode.name+" | duas capas no mesmo tier",order.length===2,{order});
   // Arrastar o segundo item para a esquerda do primeiro.
   const second=page.locator('#board .tier:first-child .album[data-id="'+secondId+'"]');
   const firstCard=page.locator('#board .tier:first-child .album[data-id="'+id+'"]');
   try{
     await second.dragTo(firstCard,{sourcePosition:{x:30,y:30},targetPosition:{x:8,y:22},timeout:12000,steps:16});
     order=await page.locator("#board .tier").first().locator(".album[data-id]").evaluateAll(els=>els.map(el=>el.dataset.id));
     check(mode.name+" | reorganizar dentro do tier",order[0]===secondId&&order[1]===id,{order,expected:[secondId,id]});
   }catch(e){check(mode.name+" | reorganizar dentro do tier",false,e.message.slice(0,210));}
   // Mover da primeira categoria para a segunda.
   try{
     await page.evaluate(()=>{
       window.__dropTrace=[];
       const log=ev=>{
         const row=ev.target?.closest?.(".tier");
         window.__dropTrace.push({type:ev.type,zone:row?Array.from(document.querySelectorAll("#board .tier")).indexOf(row):-1,point:[ev.clientX,ev.clientY],target:ev.target?.className?.toString()?.slice(0,60)});
         if(window.__dropTrace.length>70)window.__dropTrace.shift();
       };
       ["dragstart","dragover","drop","dragend"].forEach(type=>document.addEventListener(type,log,true));
     });
     await page.locator('#board .tier:first-child .album[data-id="'+id+'"]').dragTo(
       page.locator('#board .tier:nth-child(2) .tier-dock'),{timeout:12000,steps:14});
     const state=await page.evaluate(id=>window.TAYLOR_APP.getState()[id],id);
     const trace=await page.evaluate(()=>window.__dropTrace?.slice(-28));
     check(mode.name+" | tier → outro tier",state==="hinos",{state,trace});
   }catch(e){check(mode.name+" | tier → outro tier",false,e.message.slice(0,210));}
   // Devolver ao catálogo (fluxo inverso).
   try{
     await page.locator('#board .tier:nth-child(2) .album[data-id="'+id+'"]').dragTo(
       page.locator("#pool"),{timeout:12000,steps:15});
     const status=await page.evaluate(id=>window.TAYLOR_APP.getState()[id],id);
     check(mode.name+" | tier → catálogo",!status,status??null);
   }catch(e){check(mode.name+" | tier → catálogo",false,e.message.slice(0,210));}
   // Arrastar sobre área não classificável não pode mudar posição.
   try{
     const old=JSON.stringify(await page.evaluate(()=>window.TAYLOR_APP.getState()));
     await page.locator('#board .tier:first-child .album[data-id="'+secondId+'"]').dragTo(
       page.locator(".top .brand"),{timeout:12000,steps:15});
     const state=JSON.stringify(await page.evaluate(()=>window.TAYLOR_APP.getState()));
     const previews=await page.locator(".live-drag-preview").count();
     check(mode.name+" | soltar fora cancela",old===state&&previews===0,{unchanged:old===state,previews});
   }catch(e){check(mode.name+" | soltar fora cancela",false,e.message.slice(0,210));}
   // Botão de desfazer não perde posição.
   await page.locator("#undoBtn").click();
   check(mode.name+" | desfazer operacional",await page.locator("#pool .album").count()===16||await page.locator("#pool .album").count()===17,await page.locator("#pool .album").count());
   await page.screenshot({path:"/tmp/album-drag-"+mode.name+".png",fullPage:false});
 }catch(e){report.errors.push({mode:mode.name,error:String(e).slice(0,1400)});console.error("ERROR",mode.name,String(e).slice(0,230))}
 finally{await ctx.close();}
}
try{for(const mode of modes)await audition(mode)}
finally{await browser.close()}
report.total=report.checks.length;
report.passed=report.checks.filter(x=>x.pass).length;
report.failed=report.checks.filter(x=>!x.pass);
report.success=!report.errors.length&&!report.failed.length;
fs.mkdirSync("assets/albuns/taylor-swift",{recursive:true});
fs.writeFileSync("assets/albuns/taylor-swift/RELATORIO_DRAG.json",JSON.stringify(report,null,2)+"\n");
console.log("ARRASTAR",report.passed,"/",report.total,"ERROS",report.errors.length);
if(!report.success)process.exitCode=1;
