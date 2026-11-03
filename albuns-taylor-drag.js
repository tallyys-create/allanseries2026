/* Motor de arrasto da tier musical — mesma posição de inserção das tiers de
   séries/filmes, com apenas um handler HTML5 para o desktop e long-press no touch.
   O ranking nunca é alterado durante a prévia, somente após soltar. */
(() => {
"use strict";
const app=window.TAYLOR_APP, core=window.AllanTierDrag;
const board=document.getElementById("board"),pool=document.getElementById("pool");
const workspace=document.getElementById("rankingWorkspace");
if(!app||!board||!pool||!workspace)return;
let draggedId=null,dragOrigin=null,dragPreview=null,dragPreviewType=null;
let dragMode=null,highlighted=null,ghost=null,pending=null,touch=null;
let autoRAF=0,pointer={x:-999,y:-999},blockClickUntil=0;
const cardFrom=target=>target?.closest?.(".album[data-id]")||null;
function zoneFromTarget(target){
 const row=target?.closest?.(".tier");
 if(row&&board.contains(row)){
   const i=Array.from(board.children).indexOf(row);
   if(app.tiers[i])return {el:row,dock:row.querySelector(".tier-dock"),id:app.tiers[i].id,type:"tier"};
 }
 if(pool===target||pool.contains(target))return {el:pool,dock:pool,id:"",type:"pool"};
 return null;
}
function zoneFromPoint(x,y){return zoneFromTarget(document.elementFromPoint(x,y));}
function clearHighlight(){
 highlighted?.el?.classList.remove("drag-over");
 highlighted?.dock?.classList.remove("drag-over");
 highlighted=null;
}
function highlight(zone){
 if(highlighted?.el===zone?.el)return;
 clearHighlight();
 highlighted=zone;
 if(zone){
   zone.el.classList.add("drag-over");
   if(zone.dock!==zone.el)zone.dock?.classList.add("drag-over");
 }
}
function finish(){
 if(autoRAF)cancelAnimationFrame(autoRAF);autoRAF=0;
 dragPreview?.remove();dragPreview=null;dragPreviewType=null;
 dragOrigin?.classList.remove("live-drag-origin","mobile-drag-source");
 document.querySelectorAll("#board .hint").forEach(el=>el.hidden=false);
 ghost?.remove();ghost=null;
 clearHighlight();
 document.body.classList.remove("drag-reordering","mobile-dragging");
 dragOrigin=null;draggedId=null;dragMode=null;touch=null;
}
function insertionAnchor(dock,x,y){
 if(core?.insertionAnchor)return core.insertionAnchor(dock,x,y,".album",[dragPreview,dragOrigin]);
 const cards=[...dock.children].filter(el=>el.matches(".album")&&el!==dragPreview&&el!==dragOrigin);
 return cards.find(el=>{const r=el.getBoundingClientRect();return y<r.bottom+6&&x<r.left+r.width/2})||null;
}
function previewPosition(zone,x,y){
 if(!draggedId||!dragOrigin||!zone?.dock)return;
 const {dock,type}=zone;
 if(!dragPreview||dragPreviewType!==type){
   dragPreview?.remove();
   dragPreview=dragOrigin.cloneNode(true);
   dragPreview.removeAttribute("id");
   dragPreview.removeAttribute("data-id");
   dragPreview.removeAttribute("aria-label");
   dragPreview.classList.remove("live-drag-origin","mobile-drag-source");
   dragPreview.classList.add("live-drag-preview");
   dragPreview.draggable=false;dragPreview.tabIndex=-1;
   dragPreview.setAttribute("aria-hidden","true");
   dragPreview.querySelectorAll("img").forEach(el=>el.draggable=false);
   dragPreviewType=type;
 }
 let anchor=null;
 if(type==="pool"){
   anchor=core?.catalogAnchor?.(dock,draggedId,app.albums,[dragPreview,dragOrigin])||null;
 }else{
   // Igual às séries: não oscila quando o cursor permanece na prévia.
   if(dragPreview.parentElement===dock
      &&(core?.previewHasPointer?.(dragPreview,x,y)
      ||(!core&&(()=>{const r=dragPreview.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom})())))return;
   anchor=insertionAnchor(dock,x,y);
   dock.querySelector(".hint")?.setAttribute("hidden","");
 }
 if(anchor!==dragPreview&&!(dragPreview.parentElement===dock&&dragPreview.nextElementSibling===anchor)){
   dock.insertBefore(dragPreview,anchor);
 }
}
function beforeAt(zone){
 if(zone?.type!=="tier"||dragPreview?.parentElement!==zone.dock)return null;
 let sibling=dragPreview.nextElementSibling;
 while(sibling&&(sibling===dragOrigin||!sibling.matches(".album[data-id]")))sibling=sibling.nextElementSibling;
 return sibling?.dataset.id||null;
}
function completeDrop(zone){
 if(!draggedId||!zone)return false;
 const id=draggedId,before=beforeAt(zone),destination=zone.id;
 finish();
 blockClickUntil=Date.now()+450;
 app.move(id,destination,before);
 app.notice(destination?"Veredito atualizado! ✦":"Álbum devolvido ao catálogo.");
 return true;
}
function velocity(pos,start,end,margin){
 return core?.scrollVelocity?.(pos,start,end,margin,18)||0;
}
function autoScroll(){
 if(!draggedId){autoRAF=0;return;}
 const {x,y}=pointer;
 const side=document.body.classList.contains("layout-sidebar")&&matchMedia("(min-width:1120px)").matches
   ?workspace.querySelector(":scope > .library"):null;
 const rect=side?.getBoundingClientRect();
 let moved=false;
 if(side&&rect&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom&&side.scrollHeight>side.clientHeight+2){
   const delta=velocity(y,rect.top,rect.bottom,65);
   if(delta){side.scrollTop+=delta;moved=true;}
 }else{
   const delta=velocity(y,0,innerHeight,78);
   if(delta){scrollBy(0,delta);moved=true;}
 }
 if(moved&&touch?.moved){
   const zone=zoneFromPoint(x,y);highlight(zone);if(zone)previewPosition(zone,x,y);
 }
 autoRAF=requestAnimationFrame(autoScroll);
}
function trackPointer(x,y){
 pointer={x,y};if(!autoRAF)autoRAF=requestAnimationFrame(autoScroll);
}
function nativeStart(ev){
 if(ev.defaultPrevented||!ev.dataTransfer||ev.target.closest?.("dialog"))return;
 const card=cardFrom(ev.target);
 if(!card||!workspace.contains(card))return;
 finish();
 dragMode="native";draggedId=card.dataset.id;dragOrigin=card;
 ev.dataTransfer.effectAllowed="move";
 ev.dataTransfer.setData("text/plain",draggedId);
 document.body.classList.add("drag-reordering");
 trackPointer(ev.clientX,ev.clientY);
 // Captura do fantasma pelo Chrome antes de esconder o elemento de origem.
 setTimeout(()=>{if(dragMode==="native"&&dragOrigin===card)card.classList.add("live-drag-origin")},0);
}
function nativeOver(ev){
 if(dragMode!=="native"||!draggedId)return;
 const zone=zoneFromTarget(ev.target);
 if(!zone)return;
 ev.preventDefault();
 if(ev.dataTransfer)ev.dataTransfer.dropEffect="move";
 trackPointer(ev.clientX,ev.clientY);
 highlight(zone);
 previewPosition(zone,ev.clientX,ev.clientY);
}
function nativeDrop(ev){
 if(dragMode!=="native"||!draggedId)return;
 const zone=zoneFromTarget(ev.target);
 if(!zone)return;
 ev.preventDefault();ev.stopPropagation();
 trackPointer(ev.clientX,ev.clientY);
 highlight(zone);
 previewPosition(zone,ev.clientX,ev.clientY);
 completeDrop(zone);
}
workspace.addEventListener("dragstart",nativeStart,true);
board.addEventListener("dragover",nativeOver,true);
pool.addEventListener("dragover",nativeOver,true);
board.addEventListener("drop",nativeDrop,true);
pool.addEventListener("drop",nativeDrop,true);
document.addEventListener("dragover",ev=>{
 if(dragMode==="native"&&!zoneFromTarget(ev.target))clearHighlight();
},true);
document.addEventListener("drop",()=>{if(dragMode==="native")finish()});
document.addEventListener("dragend",()=>{if(dragMode==="native")finish()},true);
// Long press no mobile, preservando toque curto para a ficha.
const touchOf=(list,id)=>[...list].find(t=>t.identifier===id)||null;
function cancelPending(){
 if(!pending)return;
 clearTimeout(pending.timer);
 if(pending.card?.isConnected)pending.card.draggable=pending.wasDraggable;
 pending=null;
}
function positionGhost(x,y){
 if(!ghost)return;
 const left=Math.max(6,Math.min(innerWidth-110,x-50));
 const top=Math.max(6,Math.min(innerHeight-162,y-133));
 ghost.style.transform="translate3d("+left+"px,"+top+"px,0)";
}
function beginTouch(){
 const p=pending;
 if(!p||touch||!p.card.isConnected)return;
 pending=null;finish();
 dragMode="touch";draggedId=p.id;dragOrigin=p.card;
 ghost=document.createElement("div");ghost.className="touch-drag-ghost";
 ghost.setAttribute("aria-hidden","true");
 const art=p.card.querySelector(".album-art")?.cloneNode(true);
 if(art)ghost.append(art);
 const title=document.createElement("strong");title.textContent=app.byId[p.id]?.title||"Álbum";
 const help=document.createElement("small");help.textContent="Arraste para um veredito";
 ghost.append(title,help);document.body.append(ghost);
 touch={id:p.id,card:p.card,touchId:p.touchId,x:p.x,y:p.y,startX:p.x,startY:p.y,moved:false,wasDraggable:p.wasDraggable};
 p.card.draggable=false;
 p.card.classList.add("mobile-drag-source");
 document.body.classList.add("drag-reordering","mobile-dragging");
 positionGhost(p.x,p.y);
 blockClickUntil=Date.now()+1000;
}
function endTouch(x,y,cancel=false){
 if(!touch)return;
 const active=touch,zone=!cancel&&active.moved?zoneFromPoint(x,y):null;
 if(zone)previewPosition(zone,x,y);
 const id=draggedId,before=beforeAt(zone),dest=zone?.id;
 if(active.card.isConnected)active.card.draggable=active.wasDraggable;
 finish();blockClickUntil=Date.now()+650;
 if(zone){app.move(id,dest,before);app.notice(dest?"Veredito atualizado! ✦":"Álbum devolvido ao catálogo.")}
}
document.addEventListener("touchstart",ev=>{
 if(!matchMedia("(pointer:coarse)").matches)return;
 if(ev.touches.length!==1){cancelPending();if(touch)endTouch(0,0,true);return;}
 if(touch)return;
 const card=cardFrom(ev.target);
 if(!card||!workspace.contains(card))return;
 cancelPending();
 const p=ev.touches[0];
 pending={card,id:card.dataset.id,touchId:p.identifier,x:p.clientX,y:p.clientY,wasDraggable:card.draggable,timer:null};
 card.draggable=false;
 pending.timer=setTimeout(beginTouch,360);
},{passive:true,capture:true});
document.addEventListener("touchmove",ev=>{
 if(pending){
   const p=touchOf(ev.touches,pending.touchId);
   if(!p||ev.touches.length!==1||Math.hypot(p.clientX-pending.x,p.clientY-pending.y)>11)cancelPending();
 }
 if(!touch)return;
 const p=touchOf(ev.touches,touch.touchId);
 if(!p||ev.touches.length!==1){endTouch(0,0,true);return;}
 if(ev.cancelable)ev.preventDefault();
 touch.x=p.clientX;touch.y=p.clientY;
 if(!touch.moved&&Math.hypot(touch.x-touch.startX,touch.y-touch.startY)>8)touch.moved=true;
 positionGhost(touch.x,touch.y);
 if(touch.moved){
   const zone=zoneFromPoint(touch.x,touch.y);
   highlight(zone);if(zone)previewPosition(zone,touch.x,touch.y);
   trackPointer(touch.x,touch.y);
 }
},{passive:false,capture:true});
document.addEventListener("touchend",ev=>{
 if(pending&&touchOf(ev.changedTouches,pending.touchId))cancelPending();
 if(!touch)return;
 const p=touchOf(ev.changedTouches,touch.touchId);
 if(p){if(ev.cancelable)ev.preventDefault();endTouch(p.clientX,p.clientY);}
},{passive:false,capture:true});
document.addEventListener("touchcancel",()=>{cancelPending();if(touch)endTouch(0,0,true)},{passive:true,capture:true});
document.addEventListener("click",ev=>{
 if(Date.now()<blockClickUntil&&cardFrom(ev.target)){ev.preventDefault();ev.stopImmediatePropagation();}
},true);
document.addEventListener("contextmenu",ev=>{if((pending||touch)&&cardFrom(ev.target))ev.preventDefault()},true);
document.addEventListener("keydown",ev=>{
 if(ev.key==="Escape"){cancelPending();if(touch)endTouch(0,0,true);}
},true);
window.addEventListener("blur",()=>{cancelPending();if(touch)endTouch(0,0,true);});
})();