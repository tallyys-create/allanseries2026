(() => {
const albums=window.TAYLOR_ALBUMS, byId=Object.fromEntries(albums.map(a=>[a.id,a]));
const tiers=[
{id:"repeat",name:"Dono do Repeat",color:"#a7e18d"},
{id:"hinos",name:"Hino atrás de Hino",color:"#f1c46e"},
{id:"fone",name:"No Meu Fone",color:"#e9ae75"},
{id:"momentos",name:"Tem Seus Momentos",color:"#c89dcb"},
{id:"pular",name:"Dá pra Pular",color:"#9badd0"},
{id:"skip",name:"Skip sem Dó",color:"#b1b9b8"}];
const host=document.documentElement.dataset.mode==="allan";
if(host&&sessionStorage.getItem("allanwoodtv-host-session-v1")!=="yes"){location.replace("./index.html?acesso=allan&tier=albuns");return;}
const key="allanwoodtv-taylor-2026-"+(host?"allan":"publico");
let state={};try{state=JSON.parse(localStorage.getItem(key)||"{}");}catch{}
let order={};try{order=JSON.parse(localStorage.getItem(key+"-order")||"{}")||{};}catch{}
const initialized=Object.keys(order).length>0;
if(!initialized)for(const t of tiers)order[t.id]=albums.filter(a=>state[a.id]===t.id).map(a=>a.id);
let history=[],active=null,dragging=null;
const $=id=>document.getElementById(id);
const tierFor=id=>state[id]||"";
function snap(){return {state:{...state},order:JSON.parse(JSON.stringify(order))}}
function save(){localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+"-order",JSON.stringify(order));render();}
function move(id,tier,beforeId){if(!byId[id]||!(tier===""||tiers.some(t=>t.id===tier)))return;
 const old=tierFor(id),current=order[tier]||[];
 if(old===tier&&beforeId===id)return;
 if(old===tier&&beforeId==null&&current.at(-1)===id)return;
 if(old===""&&tier==="")return;
 history.push(snap());
 Object.keys(order).forEach(t=>order[t]=order[t].filter(x=>x!==id));
 if(tier){state[id]=tier;if(!order[tier])order[tier]=[];
  const index=beforeId?order[tier].indexOf(beforeId):-1;
  if(index>=0)order[tier].splice(index,0,id);else order[tier].push(id);
 }else delete state[id];save();
}
function card(a){const el=document.createElement("button");el.className="album";el.type="button";el.draggable=true;el.dataset.id=a.id;el.title="Ver "+a.title;el.style.setProperty("--album",a.color);el.innerHTML='<span class="album-art"><span class="art-fallback"></span><span class="badge-year"></span></span><span class="album-title"></span>';el.querySelector(".art-fallback").textContent=a.title;el.querySelector(".badge-year").textContent=a.year;el.querySelector(".album-title").textContent=a.title;
el.setAttribute("aria-label","Abrir ficha de "+a.title);
el.addEventListener("click",()=>window.TAYLOR_OPEN(a.id));
const img=document.createElement("img");img.alt="Capa de "+a.title;img.loading="lazy";img.decoding="async";img.width=700;img.height=700;
img.onerror=()=>{img.remove();el.classList.add("cover-missing");};
img.src="./assets/albuns/taylor-swift/"+encodeURIComponent(a.id)+"/poster.webp";
el.querySelector(".album-art").prepend(img);return el;}
function droppable(el,tier){el.ondragover=e=>{e.preventDefault();el.classList.add("over")};el.ondragleave=()=>el.classList.remove("over");el.ondrop=e=>{e.preventDefault();el.classList.remove("over");const id=e.dataTransfer.getData("text/plain")||dragging;const target=e.target.closest(".album");const beforeId=target&&target.dataset.id!==id?target.dataset.id:null;move(id,tier,beforeId)};}
function render(){const board=$("board"),pool=$("pool");board.replaceChildren();pool.replaceChildren();for(const [i,t] of tiers.entries()){const row=document.createElement("div");row.className="tier";row.innerHTML='<div class="tier-label"><small></small><b></b></div><div class="tier-dock"></div>';row.querySelector(".tier-label").style.background=t.color;row.querySelector("small").textContent="TIER "+(i+1);row.querySelector("b").textContent=t.name;const dock=row.querySelector(".tier-dock");const items=albums.filter(a=>tierFor(a.id)===t.id).sort((a,b)=>{const pos=order[t.id]||[];const ai=pos.indexOf(a.id),bi=pos.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)});if(!items.length){const hint=document.createElement("span");hint.className="hint";hint.textContent="Arraste álbuns para cá";dock.append(hint);}items.forEach(a=>dock.append(card(a)));droppable(row,t.id);board.append(row);}albums.filter(a=>!tierFor(a.id)).forEach(a=>pool.append(card(a)));droppable(pool,"");const done=albums.filter(a=>tierFor(a.id)).length;$("doneCount").textContent=done;$("leftCount").textContent=albums.length-done;$("poolCount").textContent=(albums.length-done)+" restantes";}
window.TAYLOR_APP={albums,byId,tiers,getState:()=>state,move,render,notice:msg=>{const n=$("notice");n.textContent=msg;n.hidden=false;setTimeout(()=>n.hidden=true,2300)}};
$("undoBtn").onclick=()=>{if(history.length){const last=history.pop();state=last.state;order=last.order;save();}else window.TAYLOR_APP.notice("Nada para desfazer.")};
$("resetBtn").onclick=()=>{if(confirm("Zerar o ranking desta versão?")){history.push(snap());state={};order={};save()}};
render();
})();