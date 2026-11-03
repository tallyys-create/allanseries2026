import fs from "node:fs";
import {chromium} from "playwright";

const BASE="http://127.0.0.1:8765/";
const out="assets/albuns/taylor-swift/RELATORIO_TESTES_UI.json";
const report={executedAt:new Date().toISOString(),type:"ui-regression",browser:"chromium",results:[],errors:[]};
const test=(name,pass,detail)=>{report.results.push({name,pass:!!pass,detail});if(!pass)console.error("FALHOU",name,detail);else console.log("OK",name)};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for(const mode of ["publico","allan"]){
  const context=await browser.newContext({viewport:{width:1450,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>sessionStorage.setItem("allanwoodtv-host-session-v1","yes"));
  const page=await context.newPage();
  page.on("pageerror",err=>report.errors.push({mode,error:err.message}));
  const url=BASE+(mode==="publico"?"albuns-taylor-publico.html":"albuns-taylor.html");
  await page.goto(url,{waitUntil:"networkidle",timeout:45000});
  await page.locator("#pool .album").first().waitFor({timeout:12000});
  test(mode+": cards",await page.locator("#pool .album").count()===18,await page.locator("#pool .album").count());
  await page.waitForFunction(()=>[...document.querySelectorAll("#pool .album img")].every(img=>img.complete),null,{timeout:15000});
  const covers=await page.locator("#pool .album img").evaluateAll(imgs=>imgs.filter(img=>img.complete&&img.naturalWidth>0).length);
  test(mode+": 18 capas renderizadas",covers===18,covers);
  const photo=await page.locator(".top .brand img").evaluate(img=>img.complete&&img.naturalWidth>0);
  test(mode+": foto do Allan",photo,true);
  const banner=await page.locator(".court-allan").evaluate(img=>img.complete&&img.naturalWidth>0);
  test(mode+": banner do tribunal",banner,true);
  test(mode+": catálogo lateral",await page.locator("body").evaluate(el=>el.classList.contains("layout-sidebar")),true);
  const item=page.locator("#pool .album").first();
  await item.click();
  await page.locator("#albumDialog[open]").waitFor();
  const scenes=await page.locator("#galleryBody .gallery-item").count();
  test(mode+": galeria abre",scenes>0,scenes);
  if(scenes){
   await page.waitForFunction(()=>{const el=document.querySelector("#galleryBody .gallery-item img");return el?.complete},null,{timeout:12000});
   test(mode+": foto do clipe visível",await page.locator("#galleryBody .gallery-item img").first().evaluate(img=>img.naturalWidth>0),true);
  }
  test(mode+": tracklist",await page.locator("#albumTracks li").count()>0,await page.locator("#albumTracks li").count());
  await page.locator("#closeAlbum").click();
  await page.locator("#randomBtn").click();
  test(mode+": sortear abre ficha",await page.locator("#albumDialog").evaluate(el=>el.open),true);
  await page.locator("#closeAlbum").click();
  await page.locator("#focusToggleBtn").click();
  test(mode+": foco",await page.locator("body").evaluate(el=>el.classList.contains("focus-mode")),true);
  await page.locator("#focusToggleBtn").click();
  await page.locator("#sizeSelect").selectOption("xlarge");
  test(mode+": tamanho extragrande",await page.locator("body").evaluate(el=>el.classList.contains("tier-size-xlarge")),true);
  await page.locator("#sizeSelect").selectOption("medium");
  const dragged=page.locator("#pool .album").first();
  const row=page.locator("#board .tier").first().locator(".tier-dock");
  try{
   await dragged.dragTo(row,{targetPosition:{x:50,y:38},timeout:12000});
   const rankCount=await page.locator("#doneCount").textContent();
   test(mode+": arrastar para tier",rankCount==="1",rankCount);
  }catch(err){test(mode+": arrastar para tier",false,err.message.slice(0,200))}
  await page.screenshot({path:"/tmp/taylor-"+mode+".png",fullPage:true});
  await context.close();
 }
}catch(e){report.errors.push({fatal:String(e)})}
finally{await browser.close()}
report.passed=report.results.filter(r=>r.pass).length;
report.total=report.results.length;
report.success=report.total>0&&report.passed===report.total&&report.errors.length===0;
fs.mkdirSync("assets/albuns/taylor-swift",{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log("RESULTADO",report.passed,"/",report.total,"erros",report.errors.length);
if(!report.success)process.exitCode=1;
