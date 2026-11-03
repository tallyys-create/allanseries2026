(() => {
const app=window.TAYLOR_APP;if(!app)return;
const $=id=>document.getElementById(id);
const mode=document.documentElement.dataset.mode;
const prefKey="allanwoodtv-taylor-visual-"+mode;
let pref={};
try{pref=JSON.parse(localStorage.getItem(prefKey)||"{}")||{}}catch{}
const persist=()=>localStorage.setItem(prefKey,JSON.stringify(pref));
const brand=document.querySelector(".top .brand");
brand.innerHTML='<span class="allan-avatar"><img src="assets/interface/allan-avatar.jpg" alt="Foto original do Allan"></span><span class="brand-lettering"><strong>ALLAN<em>WOOD</em>TV</strong><small>TWITCH · REACTS · TIER LISTS</small></span>';
const root=$("board").closest("section"),library=$("pool").closest("section"),shell=document.querySelector(".shell");
root.classList.add("ranking-panel");library.classList.add("library");
const workspace=document.createElement("div");workspace.id="rankingWorkspace";workspace.className="ranking-workspace";
root.parentNode.insertBefore(workspace,root);workspace.append(root,library);
const bar=root.querySelector(".bar .actions"),nav=document.querySelector(".toplinks");
function btn(id,text,className=""){const b=document.createElement("button");b.id=id;b.type="button";b.className="btn "+className;b.textContent=text;return b}
const catalogBtn=btn("jumpCatalogBtn","▦ Catálogo");
const liveBtn=btn("presentBtn","⛶ Modo live","live-switch");
nav.prepend(liveBtn,catalogBtn);
const sideBtn=btn("layoutToggleBtn","▣ Catálogo lateral","layout-switch");
const focusBtn=btn("focusToggleBtn","◎ Modo foco","focus-switch");
const liveExitBtn=btn("liveExitBtn","⛶ Sair modo live","live-switch");liveExitBtn.hidden=true;
const editBtn=btn("editTiersBtn","✎ Categorias");
const coverLabel=document.createElement("label");coverLabel.className="size-picker";coverLabel.textContent="Capas";
const sizeSelect=document.createElement("select");sizeSelect.id="sizeSelect";sizeSelect.setAttribute("aria-label","Tamanho das capas nos tiers");
[["small","Pequenas"],["medium","Médias"],["large","Grandes"],["xlarge","Extragrandes"]].forEach(([value,label])=>{const opt=document.createElement("option");opt.value=value;opt.textContent=label;sizeSelect.append(opt)});
coverLabel.append(sizeSelect);
bar.prepend(sideBtn,focusBtn,liveExitBtn,coverLabel,editBtn);
let side=pref.sidebar!==false;let focus=!!pref.focus;
function refreshModes(){document.body.classList.toggle("layout-sidebar",side);
 document.body.classList.toggle("focus-mode",focus);
 sideBtn.setAttribute("aria-pressed",String(side));
 sideBtn.textContent=side?"▣ Catálogo lateral ✓":"▤ Catálogo abaixo";
 focusBtn.setAttribute("aria-pressed",String(focus));
 focusBtn.textContent=focus?"◎ Sair do foco":"◎ Modo foco";
 liveBtn.setAttribute("aria-pressed",String(document.body.classList.contains("presentation")));
 liveBtn.textContent=document.body.classList.contains("presentation")?"⛶ Sair da live":"⛶ Modo live";
 liveExitBtn.hidden=!document.body.classList.contains("presentation");
}
sideBtn.onclick=()=>{side=!side;pref.sidebar=side;persist();refreshModes()};
focusBtn.onclick=()=>{focus=!focus;pref.focus=focus;persist();refreshModes();if(focus)workspace.scrollIntoView({behavior:"smooth",block:"start"})};
catalogBtn.onclick=()=>library.scrollIntoView({behavior:"smooth",block:"start"});
liveBtn.onclick=async()=>{const active=document.body.classList.toggle("presentation");refreshModes();if(active){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen()}catch{}workspace.scrollIntoView({behavior:"smooth"})}else if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}}};
liveExitBtn.onclick=()=>liveBtn.click();
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement && document.body.classList.contains("presentation")){document.body.classList.remove("presentation");refreshModes()}});
const sizes=["small","medium","large","xlarge"];
function setSize(value){const size=sizes.includes(value)?value:"medium";sizes.forEach(x=>document.body.classList.remove("tier-size-"+x));document.body.classList.add("tier-size-"+size);sizeSelect.value=size;pref.size=size;persist()}
sizeSelect.onchange=()=>setSize(sizeSelect.value);setSize(pref.size||"medium");
const nameDefaults=app.tiers.map(t=>({name:t.name,color:t.color}));
const savedTiers=Array.isArray(pref.tiers)?pref.tiers:[];
savedTiers.forEach((t,i)=>{if(app.tiers[i]&&typeof t.name==="string"){app.tiers[i].name=t.name.slice(0,40);if(/^#[0-9a-f]{6}$/i.test(t.color))app.tiers[i].color=t.color}});
app.render();refreshModes();
const editor=document.createElement("dialog");editor.className="tier-editor";editor.id="tierEditor";
editor.innerHTML='<div class="editor-header"><div><small class="eyebrow">CUSTOMIZAÇÃO</small><h2>Editar categorias</h2></div><button type="button" class="close" id="closeTierEditor" aria-label="Fechar">✕</button></div><p style="color:#c7d8c8;font-size:12px">Altere os nomes e as cores de cada nível sem perder os álbuns já classificados.</p><form method="dialog" id="tierEditForm"><div class="editor-fields" id="tierFields"></div><div class="editor-actions"><button class="btn" type="button" id="restoreTierNames">Restaurar nomes</button><button class="btn primary" type="submit">Salvar categorias</button></div></form>';
document.body.append(editor);const fields=editor.querySelector("#tierFields");
function fillEditor(){fields.replaceChildren();app.tiers.forEach((t,i)=>{const row=document.createElement("label");row.className="editor-field";const input=document.createElement("input");input.type="text";input.maxLength=40;input.required=true;input.value=t.name;input.setAttribute("aria-label","Nome do tier "+(i+1));const color=document.createElement("input");color.type="color";color.value=t.color;color.setAttribute("aria-label","Cor do tier "+(i+1));row.append(input,color);fields.append(row)})}
editBtn.onclick=()=>{fillEditor();editor.showModal()};
editor.querySelector("#closeTierEditor").onclick=()=>editor.close();
editor.querySelector("#restoreTierNames").onclick=()=>{fields.querySelectorAll(".editor-field").forEach((row,i)=>{row.querySelector('input[type="text"]').value=nameDefaults[i].name;row.querySelector('input[type="color"]').value=nameDefaults[i].color})};
editor.querySelector("#tierEditForm").onsubmit=e=>{e.preventDefault();fields.querySelectorAll(".editor-field").forEach((row,i)=>{app.tiers[i].name=row.querySelector('input[type="text"]').value.trim()||nameDefaults[i].name;app.tiers[i].color=row.querySelector('input[type="color"]').value});pref.tiers=app.tiers.map(t=>({name:t.name,color:t.color}));persist();app.render();editor.close();app.notice("Categorias atualizadas!")};
// Arrastar com toque: toque e segure a capa, então arraste até o tier.
let touch=null,hold=null,suppressUntil=0;
function findAlbum(target){const card=target.closest(".album");if(!card)return null;const title=card.title.replace(/^Ver /,"");return app.albums.find(a=>a.title===title)||null}
function clearTouch(){if(hold)clearTimeout(hold);hold=null;document.querySelectorAll(".touch-target").forEach(el=>el.classList.remove("touch-target"));if(touch?.ghost)touch.ghost.remove();if(touch?.card)touch.card.classList.remove("drag-touch");touch=null}
workspace.addEventListener("touchstart",e=>{if(e.touches.length!==1)return;const card=e.target.closest(".album");if(!card)return;const album=findAlbum(card);if(!album)return;const p=e.touches[0];touch={id:album.id,card,x:p.clientX,y:p.clientY,started:false,ghost:null};hold=setTimeout(()=>{if(!touch)return;touch.started=true;card.classList.add("drag-touch");const ghost=document.createElement("div");ghost.className="drag-touch-ghost";const img=card.querySelector("img");if(img){const clone=img.cloneNode();ghost.append(clone)}const title=document.createElement("span");title.textContent=album.title;ghost.append(title);document.body.append(ghost);touch.ghost=ghost;ghost.style.left=touch.x+"px";ghost.style.top=touch.y+"px"},320)},{passive:true});
workspace.addEventListener("touchmove",e=>{if(!touch)return;const p=e.touches[0];if(!p)return;if(!touch.started){if(Math.hypot(p.clientX-touch.x,p.clientY-touch.y)>12){clearTouch()}return}e.preventDefault();touch.x=p.clientX;touch.y=p.clientY;touch.ghost.style.left=touch.x+"px";touch.ghost.style.top=touch.y+"px";const dest=document.elementFromPoint(p.clientX,p.clientY)?.closest(".tier,.pool");document.querySelectorAll(".touch-target").forEach(el=>el.classList.remove("touch-target"));dest?.classList.add("touch-target")},{passive:false});
workspace.addEventListener("touchend",e=>{if(!touch)return;const active=touch.started;const id=touch.id;const p=e.changedTouches[0];const point=p&&document.elementFromPoint(p.clientX,p.clientY);const dest=point?.closest(".tier,.pool");const before=point?.closest(".album")?.dataset.id||null;clearTouch();if(!active)return;e.preventDefault();suppressUntil=Date.now()+500;if(dest){if(dest.id==="pool"){app.move(id,"")}else if(dest.classList.contains("tier")){const index=Array.from($("board").children).indexOf(dest);if(app.tiers[index])app.move(id,app.tiers[index].id,before===id?null:before)}}},{passive:false});
workspace.addEventListener("touchcancel",clearTouch,{passive:true});
workspace.addEventListener("click",e=>{if(Date.now()<suppressUntil && e.target.closest(".album")){e.stopImmediatePropagation();e.preventDefault()}},true);
})();
