/* Mesmo modelo de arrastar das tiers de séries/filmes:
 * prévia ao vivo, reordenação entre capas, arrasto prolongado no touch
 * e scroll automático do catálogo lateral ou da página. */
(() => {
const app=window.TAYLOR_APP;
if(!app)return;
const board=document.getElementById("board"),pool=document.getElementById("pool");
let drag=null,preview=null,previewType=null,origin=null,ghost=null;
let pending=null,touch=null,blockClickUntil=0,autoRAF=0;
let cursor={x:-1,y:-1};
const $=sel=>document.querySelector(sel);
const cardFrom=target=>target?.closest?.(".album[data-id]");
const zoneFrom=(x,y)=>{
 const hit=document.elementFromPoint(x,y);
 if(!hit)return null;
 const tier=hit.closest(".tier");
 if(tier&&board.contains(tier))return {el:tier,type:"tier",id:app.tiers[Array.from(board.children).indexOf(tier)]?.id};
 if(hit.closest("#pool,#librarySection"))return {el:pool,type:"pool",id:""};
 return null;
};
function cleanup(){
 preview?.remove();preview=null;previewType=null;
 origin?.classList.remove("live-drag-origin","mobile-drag-source");origin=null;
 ghost?.remove();ghost=null;
 drag=null;touch=null;
 document.querySelectorAll(".drag-over,.touch-target").forEach(el=>el.classList.remove("drag-over","touch-target"));
 document.body.classList.remove("drag-reordering","mobile-dragging");
 if(autoRAF)cancelAnimationFrame(autoRAF);autoRAF=0;
}
function rectRows(dock){
 const cards=[...dock.children].filter(el=>el.classList.contains("album")&&el!==preview&&el!==origin);
 const rows=[];
 for(const el of cards){
   const r=el.getBoundingClientRect();
   let row=rows.find(row=>Math.abs(row.top-r.top)<14);
   if(!row){row={top:r.top,bottom:r.bottom,items:[]};rows.push(row)}
   row.items.push({el,r});row.bottom=Math.max(row.bottom,r.bottom);
 }
 return rows.sort((a,b)=>a.top-b.top);
}
function anchorFor(dock,x,y){
 const rows=rectRows(dock);
 for(let i=0;i<rows.length;i++){
   const row=rows[i];
   if(y<=row.bottom+6){
     const next=row.items.find(item=>x<item.r.left+item.r.width/2);
     return next?.el||rows[i+1]?.items[0]?.el||null;
   }
 }
 return null;
}
function highlight(zone){
 document.querySelectorAll(".drag-over").forEach(x=>x.classList.remove("drag-over"));
 if(zone){zone.el.classList.add("drag-over");if(zone.type==="tier")zone.el.querySelector(".tier-dock")?.classList.add("drag-over")}
}
function ensurePreview(zone,x,y){
 if(!drag||!zone)return;
 const dock=zone.type==="pool"?pool:zone.el.querySelector(".tier-dock");
 if(!dock)return;
 if(!preview||previewType!==zone.type){
   preview?.remove();
   preview=origin.cloneNode(true);
   preview.classList.remove("live-drag-origin","mobile-drag-source");
   preview.classList.add("live-drag-preview");
   preview.removeAttribute("data-id");preview.draggable=false;preview.tabIndex=-1;
   preview.setAttribute("aria-hidden","true");
   previewType=zone.type;
 }
 // Sem movimentar a prévia enquanto o cursor estiver dentro dela:
 // isso evita oscilações em linhas quebradas.
 if(preview.parentElement===dock){
    const p=preview.getBoundingClientRect();
    if(x>=p.left&&x<=p.right&&y>=p.top&&y<=p.bottom)return;
 }
 const anchor=anchorFor(dock,x,y);
 const hint=dock.querySelector(".hint");if(hint)hint.hidden=true;
 if(preview.parentElement!==dock||preview.nextElementSibling!==anchor) dock.insertBefore(preview,anchor);
}
function destinationBefore(zone){
 if(!zone||zone.type==="pool"||!preview)return null;
 let next=preview.nextElementSibling;
 while(next&&(next===origin||!next.classList.contains("album")))next=next.nextElementSibling;
 return next?.dataset.id||null;
}
function changeAt(x,y,final=false){
 const zone=zoneFrom(x,y);
 highlight(zone);
 if(zone)ensurePreview(zone,x,y);
 else if(preview){preview.remove();preview=null;previewType=null}
 if(final&&zone&&drag){
   const id=drag.id, before=destinationBefore(zone);
   cleanup();
   app.move(id,zone.id,before);
   app.notice(zone.type==="pool"?"Álbum devolvido ao catálogo.":"Álbum classificado! ✦");
   return true;
 }
 return false;
}
function speed(pos,start,end,margin=78){
 if(pos<start+margin)return -Math.min(18,(start+margin-pos)/margin*18);
 if(pos>end-margin)return Math.min(18,(pos-end+margin)/margin*18);
 return 0;
}
function scrollLoop(){
 if(!drag){autoRAF=0;return}
 const {x,y}=cursor;
 const side=document.body.classList.contains("layout-sidebar")&&matchMedia("(min-width:1120px)").matches?$("#librarySection"):null;
 const box=side?.getBoundingClientRect();
 if(box&&x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom&&side.scrollHeight>side.clientHeight+2){
   side.scrollTop+=speed(y,box.top,box.bottom,70);
 }else window.scrollBy(0,speed(y,0,innerHeight,86));
 if(touch?.moved)changeAt(x,y);
 autoRAF=requestAnimationFrame(scrollLoop);
}
function beginAuto(x,y){cursor={x,y};if(!autoRAF)autoRAF=requestAnimationFrame(scrollLoop)}
function nativeStart(ev){
 const card=cardFrom(ev.target);
 if(!card||!document.getElementById("rankingWorkspace")?.contains(card))return;
 if(!ev.dataTransfer)return;
 cleanup();
 drag={id:card.dataset.id};origin=card;
 ev.dataTransfer.effectAllowed="move";ev.dataTransfer.setData("text/plain",drag.id);
 document.body.classList.add("drag-reordering");
 beginAuto(ev.clientX,ev.clientY);
 setTimeout(()=>{if(drag?.id===card.dataset.id)card.classList.add("live-drag-origin")},0);
 ev.stopPropagation();
}
function nativeOver(ev){
 if(!drag||touch)return;
 const zone=ev.target.closest?.(".tier,#pool,#librarySection");
 if(!zone)return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
 if(ev.dataTransfer)ev.dataTransfer.dropEffect="move";
 beginAuto(ev.clientX,ev.clientY);
 changeAt(ev.clientX,ev.clientY);
}
function nativeDrop(ev){
 if(!drag||touch)return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
 changeAt(ev.clientX,ev.clientY,true);
 if(drag)cleanup();
}
document.addEventListener("dragstart",nativeStart,true);
document.addEventListener("dragover",nativeOver,true);
document.addEventListener("drop",nativeDrop,true);
document.addEventListener("dragend",()=>{if(drag&&!touch)cleanup()},true);
// Long-press móvel adaptado dos controles de séries e filmes.
const touchOf=(list,id)=>[...list].find(t=>t.identifier===id)||null;
function cancelPending(){
 if(!pending)return;
 clearTimeout(pending.timer);pending.card.draggable=pending.wasDraggable;pending=null;
}
function positionGhost(x,y){
 if(!ghost)return;
 const left=Math.max(6,Math.min(innerWidth-105,x-46));
 const top=Math.max(6,Math.min(innerHeight-160,y-132));
 ghost.style.transform="translate3d("+left+"px,"+top+"px,0)";
}
function beginTouch(){
 const p=pending;
 if(!p||touch||!document.contains(p.card))return;
 clearTimeout(p.timer);pending=null;cleanup();
 drag={id:p.id};origin=p.card;
 ghost=document.createElement("div");ghost.className="touch-drag-ghost";ghost.setAttribute("aria-hidden","true");
 const img=p.card.querySelector(".album-art")?.cloneNode(true);
 if(img)ghost.append(img);
 const name=document.createElement("strong");name.textContent=app.byId[p.id]?.title||"Álbum";
 const help=document.createElement("small");help.textContent="Arraste para julgar";ghost.append(name,help);
 document.body.append(ghost);
 touch={id:p.id,card:p.card,touchId:p.touchId,x:p.x,y:p.y,startX:p.x,startY:p.y,moved:false,wasDraggable:p.wasDraggable};
 p.card.draggable=false;p.card.classList.add("mobile-drag-source");
 document.body.classList.add("drag-reordering","mobile-dragging");
 positionGhost(p.x,p.y);
 blockClickUntil=Date.now()+1200;
}
function endTouch(x,y,cancel=false){
 if(!touch)return;
 const active=touch;
 const valid=!cancel&&active.moved;
 if(valid)changeAt(x,y);
 const zone=valid?zoneFrom(x,y):null;
 const id=active.id,before=valid?destinationBefore(zone):null;
 active.card.draggable=active.wasDraggable;
 cleanup();
 blockClickUntil=Date.now()+700;
 if(zone){app.move(id,zone.id,before);app.notice(zone.type==="pool"?"Álbum devolvido.":"Álbum classificado! ✦")}
}
document.addEventListener("touchstart",ev=>{
 if(!matchMedia("(pointer:coarse)").matches)return;
 if(ev.touches.length!==1){cancelPending();if(touch)endTouch(0,0,true);return}
 if(touch)return;
 const card=cardFrom(ev.target);
 if(!card||!$("#rankingWorkspace")?.contains(card))return;
 cancelPending();
 const p=ev.touches[0];
 pending={card,id:card.dataset.id,touchId:p.identifier,x:p.clientX,y:p.clientY,wasDraggable:card.draggable,timer:null};
 card.draggable=false;
 pending.timer=setTimeout(beginTouch,380);
},{passive:true,capture:true});
document.addEventListener("touchmove",ev=>{
 if(pending){
   const p=touchOf(ev.touches,pending.touchId);
   if(!p||ev.touches.length!==1||Math.hypot(p.clientX-pending.x,p.clientY-pending.y)>12)cancelPending();
 }
 if(!touch)return;
 const p=touchOf(ev.touches,touch.touchId);
 if(!p||ev.touches.length!==1){endTouch(0,0,true);return}
 if(ev.cancelable)ev.preventDefault();
 touch.x=p.clientX;touch.y=p.clientY;
 if(!touch.moved&&Math.hypot(touch.x-touch.startX,touch.y-touch.startY)>8)touch.moved=true;
 positionGhost(touch.x,touch.y);
 if(touch.moved){beginAuto(touch.x,touch.y);changeAt(touch.x,touch.y)}
},{passive:false,capture:true});
document.addEventListener("touchend",ev=>{
 if(pending&&touchOf(ev.changedTouches,pending.touchId))cancelPending();
 if(!touch)return;
 const p=touchOf(ev.changedTouches,touch.touchId);if(!p)return;
 if(ev.cancelable)ev.preventDefault();
 endTouch(p.clientX,p.clientY);
},{passive:false,capture:true});
document.addEventListener("touchcancel",()=>{cancelPending();if(touch)endTouch(0,0,true)},{passive:true,capture:true});
document.addEventListener("click",ev=>{
 if(Date.now()<blockClickUntil&&cardFrom(ev.target)){ev.preventDefault();ev.stopImmediatePropagation()}
},true);
document.addEventListener("contextmenu",ev=>{if((pending||touch)&&cardFrom(ev.target))ev.preventDefault()},true);
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"){cancelPending();if(touch)endTouch(0,0,true)}},true);
window.addEventListener("blur",()=>{cancelPending();if(touch)endTouch(0,0,true)});
})();
