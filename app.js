/* ====================================================
   MEDISHORT360 - REGLA DEL ASPA  v2
   FIX: DOM dividido en zonas — formulario intacto
   mientras el usuario escribe → teclado no se cierra
   ==================================================== */

const LOGO_B64 = "data:image/jpeg;base64,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";

const PRESETS = {
  "Salina":{
    concentrada:{label:"Soletrol Na 20%",value:20,ampolla:{volMl:10,label:"amp 10 mL"}},
    diluida:{label:"Sol. Salina 0.9%",value:0.9},
    opciones_conc:[
      {label:"Soletrol Na 20%",value:20,ampolla:{volMl:10,label:"amp 10 mL"}},
      {label:"NaCl 17.7%",value:17.7,ampolla:{volMl:10,label:"amp 10 mL"}},
    ],
    opciones_dil:[
      {label:"Sol. Salina 0.9%",value:0.9},
      {label:"Agua dest. 0%",value:0},
    ],
    deseada:3, volumenes:[100,250,500,1000],
    acento:"#c8a614", sombra:"#c8a61444", icon:"💧",
  },
  "Dextrosa":{
    concentrada:{label:"Dextrosa 50%",value:50},
    diluida:{label:"Dextrosa 5%",value:5},
    opciones_conc:[{label:"Dextrosa 50%",value:50}],
    opciones_dil:[{label:"Dextrosa 5%",value:5},{label:"Agua dest. 0%",value:0}],
    deseada:20, volumenes:[100,250,500,1000],
    acento:"#c41230", sombra:"#c4123044", icon:"🍬",
  },
  "Generica":{
    concentrada:{label:"Solucion concentrada",value:50},
    diluida:{label:"Solucion diluida",value:0},
    opciones_conc:[], opciones_dil:[],
    deseada:10, volumenes:[100,250,500,1000],
    acento:"#4ea6dc", sombra:"#4ea6dc44", icon:"⚗️",
  },
};

let state = {
  tipo:"Salina",
  cConc:20, cDil:0.9, cDeseada:3, vFinal:500,
  labelConc:"Soletrol Na 20%", labelDil:"Sol. Salina 0.9%",
  selConc:PRESETS["Salina"].concentrada,
  installPrompt:null,
};

function el(id){ return document.getElementById(id); }

function calcular({cConc,cDil,cDeseada,vFinal}){
  const pConc=Math.abs(cDeseada-cDil), pDil=Math.abs(cConc-cDeseada), pTot=pConc+pDil;
  return {pConc,pDil,pTot,
    vConc:pTot===0?0:(pConc/pTot)*vFinal,
    vDil: pTot===0?0:(pDil/pTot)*vFinal};
}

/* =====================================================
   ZONA A: FORMULARIO (tabs + inputs concentraciones + objetivo)
   Solo se re-renderiza cuando cambia el TAB o se toca
   un botón de toggle/volumen.
   Nunca se toca mientras el usuario escribe → teclado abierto.
   ===================================================== */
function renderForm(){
  const preset = PRESETS[state.tipo];
  const ac = preset.acento;

  const pillRow = (opciones, selVal, onSelect) => opciones.length
    ? `<div class="pill-row">${opciones.map(op=>`
        <button class="pill-btn" onclick="${onSelect}(${JSON.stringify(op).replace(/"/g,"'")})"
          style="border:1px solid ${selVal===op.value?ac:"#1e2d50"};
                 background:${selVal===op.value?ac+"33":"transparent"};
                 color:${selVal===op.value?ac:"#7a8aac"};
                 font-weight:${selVal===op.value?"700":"400"}">${op.label}</button>
      `).join("")}</div>` : "";

  el("z-form").innerHTML = `
    <!-- TABS -->
    <div class="tabs">
      ${Object.entries(PRESETS).map(([k,v])=>`
        <button class="tab-btn ${state.tipo===k?"active":""}"
          onclick="changeTab('${k}')"
          style="${state.tipo===k?`background:${v.acento};box-shadow:0 0 12px ${v.sombra}`:""}">
          ${v.icon} ${k}</button>`).join("")}
    </div>

    <!-- CONCENTRACIONES -->
    <div class="card" style="border-color:${ac}44;box-shadow:0 0 20px ${preset.sombra}">
      <div class="card-label">Presentaciones disponibles</div>
      ${preset.opciones_conc.length?`<div class="pill-sub">Concentrada:</div>${pillRow(preset.opciones_conc,state.cConc,"selConc")}`:``}
      ${preset.opciones_dil.length ?`<div class="pill-sub" style="margin-top:4px">Diluida:</div>${pillRow(preset.opciones_dil,state.cDil,"selDil")}`:``}

      ${state.tipo==="Generica"?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="input-wrap">
            <span class="input-label">Nombre conc.</span>
            <input class="text-input" value="${state.labelConc}"
              oninput="onField('labelConc',this.value)"/>
          </div>
          <div class="input-wrap">
            <span class="input-label">Nombre dil.</span>
            <input class="text-input" value="${state.labelDil}"
              oninput="onField('labelDil',this.value)"/>
          </div>
        </div>`:""}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${numInput("labelConc","cConc",state.labelConc,state.cConc,ac)}
        ${numInput("labelDil" ,"cDil", state.labelDil, state.cDil, ac)}
      </div>
    </div>

    <!-- OBJETIVO -->
    <div class="card" style="border-color:${ac}44;box-shadow:0 0 20px ${preset.sombra}">
      <div class="card-label">Objetivo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${numInput(null,"cDeseada","Concentracion deseada",state.cDeseada,ac)}
        <div class="input-wrap">
          <span class="input-label">Volumen final</span>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">
            ${preset.volumenes.map(v=>`
              <button onclick="changeVol(${v})"
                style="flex:1;min-width:42px;padding:9px 4px;border:none;border-radius:8px;
                  background:${state.vFinal===v?ac:"#101830"};
                  color:${state.vFinal===v?"#fff":"#7a8aac"};
                  font-weight:${state.vFinal===v?"700":"400"};font-size:12px;
                  cursor:pointer;box-shadow:${state.vFinal===v?`0 0 8px ${preset.sombra}`:"none"}">${v}</button>`).join("")}
          </div>
          <div class="input-row" style="border-color:${ac}44">
            <input type="number" inputmode="decimal" value="${state.vFinal}" min="1"
              oninput="onField('vFinal',parseFloat(this.value)||0)"
              style="background:transparent;border:none;color:#f0f4ff;font-size:16px;
                     font-family:'DM Mono',monospace;padding:8px 12px;width:100%;outline:none"/>
            <span class="input-unit" style="color:${ac}">mL</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function numInput(_lk, stateKey, labelDisplay, value, ac){
  return `<div class="input-wrap">
    <span class="input-label">${labelDisplay}</span>
    <div class="input-row" style="border-color:${ac}44">
      <input type="number" inputmode="decimal" value="${value}" min="0" max="100" step="0.1"
        oninput="onField('${stateKey}',parseFloat(this.value)||0)"
        style="background:transparent;border:none;color:#f0f4ff;font-size:18px;
               font-family:'DM Mono',monospace;padding:10px 12px;width:100%;outline:none"/>
      <span class="input-unit" style="color:${ac}">%</span>
    </div>
  </div>`;
}

/* =====================================================
   ZONA B: RESULTADO
   Se actualiza en cada keystroke sin tocar el formulario.
   ===================================================== */
function renderResult(){
  const preset = PRESETS[state.tipo];
  const ac = preset.acento, sh = preset.sombra;
  const {cConc,cDil,cDeseada,vFinal} = state;
  const valido = cConc>cDil && cDeseada>cDil && cDeseada<cConc;
  const res = valido ? calcular({cConc,cDil,cDeseada,vFinal}) : null;

  const amp = state.selConc?.ampolla||null;
  const numAmpollas  = amp&&res ? res.vConc/amp.volMl : null;
  const ampollasCeil = numAmpollas!==null ? Math.ceil(numAmpollas) : null;
  const sobranteMl   = ampollasCeil!==null ? (ampollasCeil*amp.volMl)-res.vConc : 0;

  const pasos = res ? (()=>{
    const s=[];
    if(amp&&ampollasCeil!==null){
      if(sobranteMl>0.05){
        s.push(`Tome ${ampollasCeil} ampolla${ampollasCeil>1?"s":""} de ${state.labelConc}.`);
        s.push(`Descarte ${sobranteMl.toFixed(1)} mL. Lo que queda son los ${res.vConc.toFixed(1)} mL necesarios.`);
      } else {
        s.push(`Tome ${ampollasCeil} ampolla${ampollasCeil>1?"s":""} completa${ampollasCeil>1?"s":""} de ${state.labelConc} (${res.vConc.toFixed(1)} mL).`);
      }
    } else {
      s.push(`Tome ${res.vConc.toFixed(1)} mL de ${state.labelConc}.`);
    }
    s.push(`Tome ${res.vDil.toFixed(1)} mL de ${state.labelDil}.`);
    s.push(`Mezcle ambos. Obtendra ${vFinal} mL de solucion al ${cDeseada}%.`);
    return s;
  })() : null;

  el("z-result").innerHTML = `
    ${!valido?`<div class="error-box">⚠️ La concentracion deseada debe estar entre la diluida (${cDil}%) y la concentrada (${cConc}%).</div>`:""}

    ${res?`
      <div class="result-card" style="border-color:${ac}55;box-shadow:0 0 30px ${sh}">
        <div class="result-header">
          <div class="card-label">Diagrama del Aspa</div>
          <div class="aspa-grid">
            <div class="aspa-cell">
              <div class="aspa-pct" style="color:${ac};text-shadow:0 0 10px ${sh}">${cConc}%</div>
              <div class="aspa-name">${state.labelConc}</div>
            </div>
            <div>
              <svg viewBox="0 0 60 60" width="60" height="60">
                <line x1="5" y1="5" x2="55" y2="55" stroke="#1e2d50" stroke-width="1.5"/>
                <line x1="55" y1="5" x2="5" y2="55" stroke="#1e2d50" stroke-width="1.5"/>
                <circle cx="30" cy="30" r="14" fill="#101830" stroke="${ac}" stroke-width="1.5"/>
                <text x="30" y="34" text-anchor="middle" fill="${ac}" font-size="10"
                  font-weight="700" font-family="monospace">${cDeseada}%</text>
              </svg>
            </div>
            <div class="aspa-cell">
              <div class="aspa-pct" style="color:#7a8aac">${cDil}%</div>
              <div class="aspa-name">${state.labelDil}</div>
            </div>
            <div class="aspa-cell"><div class="aspa-parts">→ partes</div><div class="aspa-pval">${res.pConc.toFixed(2)}</div></div>
            <div></div>
            <div class="aspa-cell"><div class="aspa-parts">→ partes</div><div class="aspa-pval">${res.pDil.toFixed(2)}</div></div>
          </div>
          <div class="aspa-total">Total: <span style="color:#f0f4ff;font-family:'DM Mono';font-weight:600">${res.pTot.toFixed(2)} partes</span></div>
        </div>
        <div class="result-body">
          <div class="card-label">Volumenes para ${vFinal} mL</div>
          <div class="vol-result-grid">
            ${[{label:state.labelConc,v:res.vConc,c:cConc,color:ac},{label:state.labelDil,v:res.vDil,c:cDil,color:"#4ea6dc"}].map(b=>`
              <div class="vol-block" style="border-color:${b.color};box-shadow:0 0 12px ${b.color}22">
                <div class="vol-block-label">${b.label} (${b.c}%)</div>
                <div class="vol-block-val" style="color:${b.color};text-shadow:0 0 8px ${b.color}66">
                  ${b.v.toFixed(1)} <span>mL</span></div>
                <div class="vol-bar-bg"><div class="vol-bar" style="width:${(b.v/vFinal*100).toFixed(1)}%;
                  background:linear-gradient(90deg,${b.color}88,${b.color})"></div></div>
                <div class="vol-pct">${(b.v/vFinal*100).toFixed(1)}% del total</div>
              </div>`).join("")}
          </div>
          ${amp&&ampollasCeil!==null?`
            <div class="amp-block" style="background:${ac}15;border:1px solid ${ac}55">
              <span class="amp-icon">💉</span>
              <div><div class="amp-title" style="color:${ac}">${ampollasCeil} ampolla${ampollasCeil>1?"s":""} de ${state.labelConc}</div>
              <div class="amp-sub">Necesitas ${res.vConc.toFixed(1)} mL exactos.
                ${sobranteMl>0.05?` Usa ${ampollasCeil} amp → descartar ${sobranteMl.toFixed(1)} mL.`:""}</div></div>
            </div>`:""}
          <div class="verif-row">
            <span class="verif-label">Verificacion</span>
            <span class="verif-val">${res.vConc.toFixed(1)} + ${res.vDil.toFixed(1)} =
              <strong style="color:${ac}">${(res.vConc+res.vDil).toFixed(1)} mL</strong></span>
          </div>
        </div>
      </div>

      <div class="steps-card"
        style="border-color:${ac};background:linear-gradient(135deg,#101830,#150020);
               box-shadow:0 0 30px ${sh}">
        <div class="steps-title" style="color:${ac}"><span>🩺</span> Como prepararlo — paso a paso</div>
        <div class="steps-list">
          ${pasos.map((p,i)=>`<div class="step-row">
            <div class="step-num" style="background:linear-gradient(135deg,${ac},#c41230);
              box-shadow:0 0 8px ${sh}">${i+1}</div>
            <p class="step-text">${p}</p></div>`).join("")}
        </div>
      </div>
    `:""}

    <div class="footer">
      <p>Solo para referencia clinica &middot; Verificar con profesional de salud</p>
      <strong>🩺 MEDISHORT360 &middot; Canal Medico Educativo</strong>
    </div>
  `;
}

/* ── Manejadores ─────────────────────────────────────
   onField  → solo actualiza resultado (form intacto)
   changeTab / changeVol / selConc / selDil → re-renderiza form + resultado
   ─────────────────────────────────────────────────── */
window.onField = function(key, val){
  state = {...state, [key]:val};
  renderResult();   // ← form nunca se toca → teclado abierto ✓
};

window.changeTab = function(t){
  const p=PRESETS[t];
  state={...state,tipo:t,selConc:p.concentrada,
    cConc:p.concentrada.value,cDil:p.diluida.value,
    cDeseada:p.deseada,vFinal:500,
    labelConc:p.concentrada.label,labelDil:p.diluida.label};
  renderForm(); renderResult();
};

window.changeVol = function(v){
  state={...state,vFinal:v};
  renderForm(); renderResult();  // necesario para remarcar botón activo
};

window.selConc = function(op){
  state={...state,selConc:op,cConc:op.value,labelConc:op.label};
  renderForm(); renderResult();
};

window.selDil = function(op){
  state={...state,cDil:op.value,labelDil:op.label};
  renderForm(); renderResult();
};

/* ── PWA install ─────────────────────────────────── */
window.addEventListener("beforeinstallprompt",(e)=>{
  e.preventDefault(); state.installPrompt=e;
  el("install-btn").classList.add("visible");
});
window.addEventListener("appinstalled",()=>{
  el("install-btn").classList.remove("visible"); state.installPrompt=null;
});
window.handleInstall=function(){
  if(!state.installPrompt) return;
  state.installPrompt.prompt(); state.installPrompt=null;
  el("install-btn").classList.remove("visible");
};

function makeParticles(){
  const c=el("particles"); c.innerHTML="";
  for(let i=0;i<32;i++){
    const d=document.createElement("div"); d.className="particle";
    d.style.cssText=`left:${(i*37+11)%100}%;top:${(i*53+7)%100}%;
      width:${(i%3)*.9+.5}px;height:${(i%3)*.9+.5}px;
      --dur:${((i%4)*1.2+1.8).toFixed(1)}s;--del:${((i%6)*.6).toFixed(1)}s;`;
    c.appendChild(d);
  }
}

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
}

document.addEventListener("DOMContentLoaded",()=>{
  makeParticles();

  el("z-header").innerHTML=`
    <div class="header">
      <div class="badge-row">
        <span class="badge">MEDISHORT360</span>
        <span class="badge">Diluciones IV</span>
        <span class="badge">Metodo de Aligacion</span>
      </div>
      <div class="logo-wrap">
        <div class="logo-ring-spin"></div>
        <div class="logo-ring-pulse"></div>
        <img src="${LOGO_B64}" alt="MEDISHORT360" class="logo-img"/>
      </div>
      <div class="app-title">Regla del Aspa</div>
      <div class="app-sub">Calculadora de Diluciones IV &mdash; Metodo de Aligacion</div>
      <div class="app-brand">📺 Canal MEDISHORT360-ASPA</div>
    </div>`;

  renderForm();
  renderResult();
});
