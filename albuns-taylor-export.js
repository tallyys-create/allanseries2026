/* Exportação visual unificada com as tiers de séries e filmes.
 * Mesma identidade, tipografia, proporções, bordas e rodapé do Tribunal.
 * Diferença intencional: capas quadradas maiores e seis tiers musicais.
 * Preserva exatamente a ordem gravada de cada nível. */
(() => {
"use strict";
const app=window.TAYLOR_APP, $=id=>document.getElementById(id);
if(!app)return;
const isAllan=document.documentElement.dataset.mode==="allan";
const ordered=tierId=>app.getOrdered(tierId);
const viewerName=()=>($("viewerNameInput")?.value||"").trim().slice(0,28)||"Fã da Taylor";
const formatSlug=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,34)||"publico";

function roundedPath(ctx,x,y,width,height,radius=16){
 const r=Math.min(radius,width/2,height/2);
 ctx.beginPath();
 ctx.moveTo(x+r,y);
 ctx.lineTo(x+width-r,y);
 ctx.quadraticCurveTo(x+width,y,x+width,y+r);
 ctx.lineTo(x+width,y+height-r);
 ctx.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
 ctx.lineTo(x+r,y+height);
 ctx.quadraticCurveTo(x,y+height,x,y+height-r);
 ctx.lineTo(x,y+r);
 ctx.quadraticCurveTo(x,y,x+r,y);
 ctx.closePath();
}
function fillRounded(ctx,x,y,w,h,r,color){
 ctx.fillStyle=color;
 roundedPath(ctx,x,y,w,h,r);
 ctx.fill();
}
function readableOn(color){
 const hex=String(color||"#999999").replace("#","");
 if(!/^[\da-f]{6}$/i.test(hex))return "#111c15";
 const n=parseInt(hex,16);
 const lum=.2126*((n>>16)&255)+.7152*((n>>8)&255)+.0722*(n&255);
 return lum>=145?"#152119":"#fff7ef";
}
function wrapText(ctx,raw,maxWidth,maxLines=3){
 const words=String(raw||"").trim().split(/\s+/),out=[];
 let line="";
 for(const word of words){
  const combined=line?line+" "+word:word;
  if(ctx.measureText(combined).width<=maxWidth){line=combined;continue}
  if(line){out.push(line);line=word;}else{line=word;}
  // Se uma palavra isolada for longa, abrevia mantendo o texto na capa.
  while(ctx.measureText(line).width>maxWidth&&line.length>2){
   line=line.slice(0,-2)+"…";
  }
 }
 if(line)out.push(line);
 if(out.length>maxLines){
  out.length=maxLines;
  let last=out[maxLines-1];
  while(last.length>1&&ctx.measureText(last+"…").width>maxWidth)last=last.slice(0,-1);
  out[maxLines-1]=last+"…";
 }
 return out;
}
function fitHeader(ctx,text,maxWidth,fontStart=69,fontMin=48){
 let size=fontStart;
 do{ctx.font="bold "+size+"px Arial";if(ctx.measureText(text).width<=maxWidth)break;size-=2;}while(size>=fontMin);
 return size;
}
const imageFor=src=>new Promise(resolve=>{
 const img=new Image();
 img.onload=()=>resolve(img);
 img.onerror=()=>resolve(null);
 img.src=src;
 if(img.complete&&img.naturalWidth>0)resolve(img);
});
function drawCover(ctx,album,image,x,y,side){
 fillRounded(ctx,x,y,side,side,10,album.color||"#566858");
 ctx.save();
 roundedPath(ctx,x,y,side,side,10);ctx.clip();
 if(image){
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const ratio=Math.max(side/iw,side/ih),w=iw*ratio,h=ih*ratio;
  ctx.drawImage(image,x+(side-w)/2,y+(side-h)/2,w,h);
 }else{
  ctx.fillStyle="#ffffff33";ctx.font="bold 16px Arial";ctx.textAlign="center";
  ctx.fillText("TAYLOR SWIFT",x+side/2,y+side/2);
  ctx.textAlign="left";
 }
 const shade=ctx.createLinearGradient(0,y+side*.35,0,y+side);
 shade.addColorStop(0,"#00000000");
 shade.addColorStop(.55,"#0000009c");
 shade.addColorStop(1,"#000000f5");
 ctx.fillStyle=shade;ctx.fillRect(x,y,side,side);
 ctx.textAlign="center";
 // Letras sobre a capa, como nos rankings de séries e filmes.
 const long=album.title.length>27;
 const size=long?13:14.5;
 ctx.font="bold "+size+"px Arial";
 const lines=wrapText(ctx,album.title,side-15,3);
 ctx.fillStyle="#fff";ctx.shadowColor="#000b";ctx.shadowBlur=4;
 const lineH=long?15:17;
 lines.forEach((line,i)=>ctx.fillText(line,x+side/2,y+side-11-(lines.length-1-i)*lineH));
 ctx.shadowBlur=0;ctx.textAlign="left";
 ctx.restore();
}
const saveBlob=(blob,name)=>{
 const link=document.createElement("a"),url=URL.createObjectURL(blob);
 link.href=url;link.download=name;
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
};
function toBlob(canvas){
 return new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
}
async function exportPng(share=false){
 const placements=app.getState();
 const rated=app.albums.filter(a=>placements[a.id]);
 if(!rated.length){app.notice("Classifique ao menos um álbum antes de salvar.");return;}
 app.notice("Preparando a imagem do seu ranking...");
 // Mesma estrutura de exportação das tiers existentes.
 const W=1600,margin=60,labelW=295,header=212,footer=93,gap=13;
 const cover=170,cardGap=15,rowGap=12,cardStart=48;
 const bodyW=W-2*margin-labelW-18;
 const columns=Math.max(1,Math.floor((bodyW+cardGap)/(cover+cardGap)));
 const sections=app.tiers.map((tier,i)=>{
  const items=ordered(tier.id);
  const lines=Math.max(1,Math.ceil(items.length/columns));
  return {tier,i,items,lines,height:Math.max(234,cardStart+lines*(cover+rowGap)+9)};
 });
 const H=header+sections.reduce((h,s)=>h+s.height+gap,0)-gap+footer;
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext("2d");
 if(!ctx){app.notice("O navegador não conseguiu gerar a imagem.");return;}
 const background=ctx.createLinearGradient(0,0,W,H);
 background.addColorStop(0,"#17281b");
 background.addColorStop(.55,"#101b13");
 background.addColorStop(1,"#312314");
 ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
 // Identidade visual idêntica à do Tribunal.
 ctx.textAlign="left";
 ctx.fillStyle="#9de8a5";ctx.font="bold 22px Arial";
 ctx.fillText("✦ ALLANWOODTV",margin,59);
 const title=isAllan?"O TRIBUNAL DOS ÁLBUNS":"MINHA TIER DE ÁLBUNS";
 const headerFont=fitHeader(ctx,title,W-2*margin);
 ctx.fillStyle="#fff8eb";ctx.font="bold "+headerFont+"px Arial";
 ctx.fillText(title,margin,134);
 ctx.fillStyle="#c9d7c5";ctx.font="23px Arial";
 const subtitle=isAllan?"Taylor Swift · O veredito do Allan":"O veredito de "+viewerName()+" · Taylor Swift";
 ctx.fillText(subtitle,margin,177);
 // As capas são do próprio repositório, evitando troca entre edições.
 const images=new Map(await Promise.all(rated.map(async album=>[
  album.id,await imageFor("./assets/albuns/taylor-swift/"+encodeURIComponent(album.id)+"/poster.webp")
 ])));
 let y=header;
 for(const {tier,i,items,lines,height} of sections){
  fillRounded(ctx,margin,y,W-2*margin,height,17,"#243327");
  fillRounded(ctx,margin,y,labelW,height,17,tier.color);
  const labelColor=readableOn(tier.color);
  ctx.fillStyle=labelColor;ctx.font="bold 16px Arial";
  ctx.fillText("VEREDITO "+String(i+1).padStart(2,"0"),margin+20,y+32);
  ctx.font="bold 25px Arial";
  wrapText(ctx,tier.name,labelW-36,4).forEach((line,k)=>{
   ctx.fillText(line,margin+18,y+73+k*29);
  });
  ctx.font="bold 13px Arial";
  ctx.fillText(items.length+" "+(items.length===1?"álbum":"álbuns"),margin+19,y+height-18);
  // A descrição fica acima das capas, tal qual séries/filmes.
  ctx.fillStyle="#e7f1e3";ctx.font="bold 19px Arial";
  wrapText(ctx,tier.description||"",W-2*margin-labelW-50,2).forEach((line,k)=>{
   ctx.fillText(line,margin+labelW+17,y+25+k*20);
  });
  for(let index=0;index<items.length;index++){
   const album=items[index],col=index%columns,row=Math.floor(index/columns);
   const x=margin+labelW+18+col*(cover+cardGap);
   const yy=y+cardStart+row*(cover+rowGap);
   drawCover(ctx,album,images.get(album.id),x,yy,cover);
  }
  y+=height+gap;
 }
 // Rodapé igual ao modelo de séries e filmes.
 const footY=H-76;
 ctx.strokeStyle="#ffffff33";ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(margin,footY);ctx.lineTo(W-margin,footY);ctx.stroke();
 ctx.font="bold 20px Arial";ctx.fillStyle="#cfdacb";
 const count=String(rated.length);
 ctx.fillText(isAllan?count+" álbuns julgados · AllanWoodTV":count+" álbuns avaliados por "+viewerName()+" · AllanWoodTV",margin,H-33);
 ctx.textAlign="right";ctx.fillStyle="#ffb347";
 ctx.fillText(isAllan?"AO VIVO ✦":"MINHA OPINIÃO ✦",W-margin,H-33);
 ctx.textAlign="left";
 let blob;
 try{blob=await toBlob(canvas)}catch{}
 if(!blob){app.notice("Não foi possível gerar o PNG.");return;}
 const name=isAllan?"AllanWoodTV-tribunal-albuns-taylor-swift.png":"AllanWoodTV-minha-tier-albuns-taylor-swift-"+formatSlug(viewerName())+".png";
 if(share&&navigator.share&&typeof File!=="undefined"){
  try{
   const file=new File([blob],name,{type:"image/png"});
   if(!navigator.canShare||navigator.canShare({files:[file]})){
    await navigator.share({title:"Minha tier de álbuns · Taylor Swift",text:"Meu veredito no AllanWoodTV",files:[file]});
    app.notice("Ranking pronto para compartilhar!");
    return;
   }
  }catch(error){if(error?.name==="AbortError")return;}
 }
 saveBlob(blob,name);
 app.notice(share?"Imagem salva para compartilhar!":"Ranking exportado em PNG!");
}
$("copyBtn").onclick=async()=>{
 const state=app.getState();
 const lines=["🎧 TIER TAYLOR SWIFT · ALLANWOODTV",
  ...app.tiers.map(t=>t.name.toUpperCase()+": "+(ordered(t.id).map(a=>a.title).join(" • ")||"—")),
  "Ainda não classificados: "+(app.albums.filter(a=>!state[a.id]).map(a=>a.title).join(" • ")||"nenhum")];
 try{await navigator.clipboard.writeText(lines.join("\n"));app.notice("Ranking copiado!")}
 catch{app.notice("Não foi possível copiar neste navegador.")}
};
$("exportBtn").onclick=()=>exportPng(false);
window.TAYLOR_EXPORT={image:exportPng};
})();