/* Verificação visual do PNG da tier da Taylor, não apenas do botão.
 * Exercita host/público, 18 capas, ordem, título, descrições, cores e rodapé. */
import fs from "node:fs";
import {chromium} from "playwright";

const root="http://127.0.0.1:8765/";
const report={executedAt:new Date().toISOString(),type:"exportacao-taylor-premium",checks:[],errors:[]};
const record=(name,pass,detail)=>{
 const check={name,pass:!!pass,detail};report.checks.push(check);
 console.log(check.pass?"OK":"FALHOU",name,JSON.stringify(detail).slice(0,240));
};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const placements=["repeat","repeat","repeat","repeat","hinos","hinos","hinos","fone","fone",
 "momentos","momentos","momentos","momentos","momentos","pular","pular","skip","skip"];
async function checkPage(mode,viewport){
 const context=await browser.newContext({viewport,acceptDownloads:true,deviceScaleFactor:1});
 await context.addInitScript(()=>sessionStorage.setItem("allanwoodtv-host-session-v1","yes"));
 const page=await context.newPage();
 page.on("pageerror",e=>report.errors.push({mode,error:e.message}));
 try{
  const publicRole=mode==="publico";
  await page.goto(root+"albuns-taylor"+(publicRole?"-publico":"")+".html",{waitUntil:"networkidle",timeout:40000});
  await page.locator("#pool .album").first().waitFor({timeout:10000});
  if(publicRole)await page.locator("#viewerNameInput").fill("Tallys");
  await page.evaluate(positions=>{
    const app=window.TAYLOR_APP;
    app.albums.forEach((a,i)=>app.move(a.id,positions[i]));
    // Simula a ordem personalizada do usuário: joga o último na primeira posição.
    const tier=app.tiers[0].id,list=app.getOrdered(tier);
    app.move(list[list.length-1].id,tier,list[0].id);
    window.__premiumExpectedFirst=app.getOrdered(tier)[0].id;
  },placements);
  const all=await page.evaluate(()=>{
    const app=window.TAYLOR_APP;
    return {total:app.albums.length,ranked:app.albums.filter(a=>app.getState()[a.id]).length,
      first:app.getOrdered("repeat")[0]?.id,perTier:app.tiers.map(t=>app.getOrdered(t.id).length)};
  });
  record(mode+" "+viewport.width+"px | 18 classificados",all.total===18&&all.ranked===18&&all.perTier.join(",")==="4,3,2,5,2,2",all);
  await page.reload({waitUntil:"networkidle"});
  if(publicRole)record(mode+" | apelido preservado",await page.locator("#viewerNameInput").inputValue()==="Tallys",await page.locator("#viewerNameInput").inputValue());
  record(mode+" | ordem persistida após reload",await page.evaluate(first=>window.TAYLOR_APP.getOrdered("repeat")[0].id===first,all.first),all.first);
  await page.evaluate(()=>{
    window.__premiumText=[];
    const proto=CanvasRenderingContext2D.prototype;
    const fn=proto.fillText;
    proto.fillText=function(...args){window.__premiumText.push(String(args[0]));return fn.apply(this,args)};
  });
  const [download]=await Promise.all([
    page.waitForEvent("download",{timeout:25000}),
    page.locator(publicRole?"#shareTierBtn":"#exportBtn").click()
  ]);
  const name=download.suggestedFilename();
  const file="/tmp/taylor-export-"+mode+"-"+viewport.width+".png";
  await download.saveAs(file);
  const bytes=fs.readFileSync(file),validPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const W=validPng?bytes.readUInt32BE(16):0,H=validPng?bytes.readUInt32BE(20):0;
  record(mode+" "+viewport.width+"px | PNG 1600 e compactado",validPng&&W===1600&&H>=1600&&H<=2200&&bytes.length>65000,{W,H,bytes:bytes.length,name});
  const content=await page.evaluate(()=>window.__premiumText);
  const title=publicRole?"MINHA TIER DE ÁLBUNS":"O TRIBUNAL DOS ÁLBUNS";
  const footer=publicRole?"MINHA OPINIÃO ✦":"AO VIVO ✦";
  const subtitle=publicRole?"O veredito de Tallys · Taylor Swift":"Taylor Swift · O veredito do Allan";
  record(mode+" | cabeçalho e rodapé coerentes",
    content.includes(title)&&content.includes(subtitle)&&content.includes(footer),
    {title:content.includes(title),subtitle:content.includes(subtitle),footer:content.includes(footer)});
  const descriptions=await page.evaluate(()=>window.TAYLOR_APP.tiers.map(t=>t.description));
  record(mode+" | seis descrições impressas",
    descriptions.every(d=>content.includes(d)),
    descriptions.filter(d=>!content.includes(d)));
  record(mode+" | todas as capas tituladas",
    await page.evaluate(()=>window.TAYLOR_APP.albums.every(a=>window.__premiumText.some(t=>a.title.includes(t)||t.includes(a.title.split(" ")[0])))),
    "Títulos sobrepostos, não embaixo das capas");
  const imageCheck=await page.evaluate(async b64=>{
    const PNG=new Image();PNG.src="data:image/png;base64,"+b64;await PNG.decode();
    const canvas=document.createElement("canvas");canvas.width=PNG.naturalWidth;canvas.height=PNG.naturalHeight;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(PNG,0,0);
    const rgb=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3);
    const labels=[];
    const color=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const app=window.TAYLOR_APP;
    let y=212;
    for(const tier of app.tiers){
      const items=app.getOrdered(tier.id),lines=Math.max(1,Math.ceil(items.length/6));
      const h=Math.max(234,48+lines*(170+12)+9);
      const actual=rgb(86,y+92),expected=color(tier.color);
      const distance=actual.reduce((sum,ch,i)=>sum+Math.abs(ch-expected[i]),0);
      labels.push({tier:tier.id,distance,color:actual});
      y+=h+13;
    }
    const album=app.getOrdered("repeat")[0];
    const picture=new Image();picture.src="./assets/albuns/taylor-swift/"+album.id+"/poster.webp";await picture.decode();
    const source=document.createElement("canvas");source.width=170;source.height=170;
    const sc=source.getContext("2d",{willReadFrequently:true});sc.drawImage(picture,0,0,170,170);
    const sourceRgb=Array.from(sc.getImageData(25,25,1,1).data).slice(0,3);
    const outputRgb=rgb(60+295+18+25,212+48+25);
    const imageDistance=sourceRgb.reduce((sum,ch,i)=>sum+Math.abs(ch-outputRgb[i]),0);
    return {labels,allLabels:labels.every(l=>l.distance<8),album:album.id,
      imageDistance,sourceRgb,outputRgb};
  },bytes.toString("base64"));
  record(mode+" | cores e proporções dos vereditos",imageCheck.allLabels,imageCheck.labels);
  record(mode+" | capa na posição correta",imageCheck.imageDistance<50,imageCheck);
 }catch(e){
  report.errors.push({mode,error:String(e).slice(0,1100)});
  console.error("ERRO",mode,String(e).slice(0,350));
 }finally{await context.close()}
}
try{
 await checkPage("publico",{width:1450,height:900});
 await checkPage("allan",{width:1450,height:900});
 await checkPage("publico",{width:390,height:844});
}finally{await browser.close()}
report.total=report.checks.length;
report.passed=report.checks.filter(t=>t.pass).length;
report.failed=report.checks.filter(t=>!t.pass);
report.success=report.total>0&&report.failed.length===0&&report.errors.length===0;
fs.mkdirSync("assets/albuns/taylor-swift",{recursive:true});
fs.writeFileSync("assets/albuns/taylor-swift/RELATORIO_EXPORTACAO.json",JSON.stringify(report,null,2)+"\n");
console.log("EXPORTAÇÃO",report.passed+"/"+report.total,report.errors.length+" erros");
if(!report.success)process.exitCode=1;
