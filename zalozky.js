/* Pokladní kniha SDH – záložky Zákony, Daňové přiznání, Majetek */
(function(){
const PK=window.PK; if(!PK)return;
const $=id=>document.getElementById(id);
const esc=PK.esc, czDate=PK.czDate;
const money=v=>PK.money(v);
const CATS=['Tržba','Nákupy občerstvení','Pivo','Vybavení klubovna','Poplatky','Vybavení hasiči','Zálohy','Dary'];
const GROUPS={zd:'Vedlejší (hospodářská) činnost – zdaňuje se',hl:'Hlavní činnost – mimo předmět daně (§ 18a)',os:'Osvobozené / nesouvisející (dary)',pr:'Průběžné položky – nezapočítávají se'};
const DEF={'Tržba':'zd','Pivo':'zd','Nákupy občerstvení':'zd','Vybavení klubovna':'hl','Vybavení hasiči':'hl','Poplatky':'hl','Zálohy':'pr','Dary':'os','':'hl'};
const ASSET_CATS=['Vybavení klubovna','Vybavení hasiči'];
const DHM_LIMIT=80000;
let tab='book', taxYear=null, assetYear=null, showOther=false;

/* ---------- styly ---------- */
const css=document.createElement('style');
css.textContent=`
.xt h2{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:22px;margin:0 0 6px}
.xt h3{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:18px;margin:22px 0 8px}
.xt .lead{color:var(--muted);margin:0 0 16px}
.law{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px}
.law h4{margin:0 0 6px;font-size:16px}
.law h4 a{color:var(--teal)}
.law ul{margin:6px 0 0;padding-left:20px}
.law li{margin:4px 0}
.law b{font-weight:600}
.warnbox{background:var(--exp-soft);color:var(--ink);border-radius:10px;padding:10px 14px;margin:10px 0;font-size:14px}
.okbox{background:var(--inc-soft);color:var(--ink);border-radius:10px;padding:10px 14px;margin:10px 0;font-size:14px}
.infobox{background:var(--teal-soft);color:var(--ink);border-radius:10px;padding:10px 14px;margin:10px 0;font-size:14px}
.form-dp{width:100%;border-collapse:collapse;min-width:0;background:var(--surface)}
.form-dp td,.form-dp th{border:1px solid var(--line);padding:8px 10px;vertical-align:top}
.form-dp th{background:var(--paper);font-size:12.5px;color:var(--muted);text-align:left}
.form-dp td.r{width:70px;text-align:center;font-weight:700;color:var(--teal);white-space:nowrap}
.form-dp td.v{width:170px;text-align:right;font-weight:600;white-space:nowrap}
.form-dp tr.tot td{background:var(--teal-soft)}
.form-dp .sub{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.dp-head{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:10px 0 14px}
.dp-head div{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.dp-head .l{font-size:12px;color:var(--muted)}
.dp-head .v{font-weight:600}
.mapt{width:100%;border-collapse:collapse;min-width:620px}
.mapt td,.mapt th{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left}
.mapt th{font-size:12.5px;color:var(--muted)}
.mapt td.n{text-align:right;white-space:nowrap}
.mapt select{padding:6px 8px}
.xbox{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.astable{width:100%;border-collapse:collapse;min-width:720px}
.astable td,.astable th{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.astable th{font-size:12.5px;color:var(--muted);background:var(--paper)}
.astable td.n{text-align:right;white-space:nowrap}
.astable td.nw{white-space:nowrap}
.astable button{font:inherit;font-size:13px;border:0;background:none;color:var(--teal);cursor:pointer;text-decoration:underline;padding:2px 4px}
.pill{display:inline-block;font-size:12px;border-radius:999px;padding:1px 8px;white-space:nowrap}
.pill.dhm{background:var(--exp-soft);color:var(--exp)}
.pill.drm{background:var(--teal-soft);color:var(--teal)}
.yrsel{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin:6px 0 12px}
.yrsel .f{grid-column:auto;min-width:140px}
`;
document.head.appendChild(css);

/* ---------- kostra záložek ---------- */
const host=$('extraTabs');
host.innerHTML=`
<section class="xt" id="tabLaws" hidden></section>
<section class="xt" id="tabTax" hidden></section>
<section class="xt" id="tabAssets" hidden></section>
<section class="xt" id="tabReg" hidden></section>
<section class="xt" id="tabCheck" hidden></section>
<section class="xt" id="tabDebts" hidden></section>`;
$('tabLaws').innerHTML=lawsHTML();

const tabs=[...document.querySelectorAll('#mainTabs button')];
function setTab(t){
  tab=t; document.body.dataset.tab=t;
  tabs.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  $('tabLaws').hidden=t!=='laws'; $('tabTax').hidden=t!=='tax'; $('tabAssets').hidden=t!=='assets'; $('tabReg').hidden=t!=='reg'; $('tabCheck').hidden=t!=='check'; $('tabDebts').hidden=t!=='debts';
  if(t==='tax')renderTax(); if(t==='assets')renderAssets(); if(t==='reg')renderReg(); if(t==='check')renderCheck(); if(t==='debts')renderDebts();
  try{history.replaceState(null,'',t==='book'?location.pathname:'#'+t)}catch(e){}
}
tabs.forEach(b=>b.onclick=()=>setTab(b.dataset.t));
PK.onRender=()=>{if(tab==='tax')renderTax(); if(tab==='assets')renderAssets(); if(tab==='reg'&&!reg&&!regLoading)renderReg(); if(tab==='check')renderCheck(); if(tab==='debts'&&!debtEdit)renderDebts()};

/* ---------- pomocné ---------- */
const years=()=>{const s=new Set(PK.entries.map(e=>(e.date||'').slice(0,4)).filter(Boolean));s.add(String(new Date().getFullYear()));return [...s].sort().reverse()};
const yearSel=(id,val)=>`<div class="f"><label for="${id}">Rok</label><select id="${id}">${years().map(y=>`<option ${y===val?'selected':''}>${y}</option>`).join('')}</select></div>`;
const isOwner=()=>PK.role==='owner';
const groupOf=cat=>{const m=(PK.settings.taxMap)||{};return m[cat||'']||DEF[cat||'']||'hl'};
function deadline(y){ // 4 měsíce po konci roku – elektronicky; posun na pracovní den
  const d=new Date(Date.UTC(+y+1,4,1)); const hol=['05-01','05-08'];
  while(d.getUTCDay()===0||d.getUTCDay()===6||hol.includes(d.toISOString().slice(5,10)))d.setUTCDate(d.getUTCDate()+1);
  return d.getUTCDate()+'. '+(d.getUTCMonth()+1)+'. '+d.getUTCFullYear();
}

/* ---------- daňové přiznání ---------- */
function renderTax(){
  const el=$('tabTax'); const ys=years(); if(!taxYear||!ys.includes(taxYear))taxYear=ys.includes('2026')?'2026':ys[0];
  const E=PK.entries.filter(e=>(e.date||'').startsWith(taxYear));
  const cats={}; const g={zd:{i:0,o:0},hl:{i:0,o:0},os:{i:0,o:0},pr:{i:0,o:0}};
  let bigCash=[];
  E.forEach(e=>{const c=e.cat||''; cats[c]=cats[c]||{i:0,o:0}; const k=e.type==='in'?'i':'o'; cats[c][k]+=e.amount; g[groupOf(c)][k]+=e.amount; if(e.amount>270000)bigCash.push(e)});
  const inc=g.zd.i+g.hl.i+g.os.i, out=g.zd.o+g.hl.o+g.os.o;
  const r10=inc-out;
  const hlLoss=g.hl.o>=g.hl.i; // § 18a odst. 1 písm. a) – jen pokud jsou výdaje vyšší
  const r40=(hlLoss?g.hl.o:0)+g.os.o;
  const r101=hlLoss?g.hl.i:0;
  const r110=g.os.i;
  const r200=r10+r40-r101-r110;
  const base=Math.max(0,r200);
  const r251=base>0?Math.min(base,Math.max(Math.min(base*0.3,1000000),300000)):0;
  const r270=Math.max(0,Math.floor((base-r251)/1000)*1000);
  const r290=Math.round(r270*0.21);
  const s=PK.settings, thisYear=String(new Date().getFullYear());
  const mustFile=g.zd.i>0||(!hlLoss&&g.hl.i>0);
  const row=(r,t,v,sub,cls)=>`<tr class="${cls||''}"><td class="r">${r}</td><td>${t}${sub?`<span class="sub">${sub}</span>`:''}</td><td class="v">${v}</td></tr>`;
  const catRows=Object.keys(cats).sort((a,b)=>(CATS.indexOf(a)+99*(a===''))-(CATS.indexOf(b)+99*(b===''))).map(c=>{
    const gv=groupOf(c);
    const sel=isOwner()?`<select data-cat="${esc(c)}">${Object.entries(GROUPS).map(([k,v])=>`<option value="${k}" ${k===gv?'selected':''}>${v}</option>`).join('')}</select>`:esc(GROUPS[gv]);
    return `<tr><td>${esc(c||'Bez kategorie')}</td><td class="n">${money(cats[c].i)}</td><td class="n">${money(cats[c].o)}</td><td>${sel}</td></tr>`}).join('');
  el.innerHTML=`
  <h2>Daňové přiznání k dani z příjmů právnických osob</h2>
  <p class="lead">Živý náhled vyplněný podle pokladní knihy. Mění se automaticky s každým zápisem. Slouží jako podklad pro vyplnění oficiálního tiskopisu 25 5404 na portálu <a href="https://www.mojedane.cz" target="_blank" rel="noopener">Moje daně</a>, sám o sobě se nepodává.</p>
  <div class="yrsel">${yearSel('taxYearSel',taxYear)}</div>
  ${taxYear===thisYear?`<div class="infobox">Rok ${taxYear} ještě neskončil, čísla jsou průběžný odhad k ${czDate(PK.today())}.</div>`:''}
  <div class="dp-head">
    <div><div class="l">Poplatník</div><div class="v">${esc(s.firm||'—')}</div></div>
    <div><div class="l">IČO</div><div class="v">${esc(s.ico||'—')}</div></div>
    <div><div class="l">Sídlo</div><div class="v">${esc(s.address||'—')}</div></div>
    <div><div class="l">Zdaňovací období</div><div class="v">1. 1. ${taxYear} – 31. 12. ${taxYear}</div></div>
    <div><div class="l">Typ poplatníka</div><div class="v">Veřejně prospěšný poplatník (§ 17a)</div></div>
    <div><div class="l">Lhůta pro podání (elektronicky)</div><div class="v">do ${deadline(taxYear)}</div></div>
  </div>
  ${mustFile?`<div class="warnbox"><b>Přiznání je potřeba podat.</b> Sbor má zdanitelné příjmy z vedlejší činnosti (tržby, prodej piva), proto se na něj nevztahuje výjimka podle § 38mb ZDP. Podává se elektronicky, právnická osoba má datovou schránku.</div>`
    :`<div class="okbox">Podle současného zařazení nemá sbor v roce ${taxYear} zdanitelné příjmy. Pokud to platí i ke konci roku, přiznání podle § 38mb ZDP podávat nemusí a nemusí to ani oznamovat.</div>`}
  ${!hlLoss&&g.hl.i>0?`<div class="warnbox">Hlavní činnost je v zisku (příjmy ${money(g.hl.i)} &gt; výdaje ${money(g.hl.o)}). Podle § 18a odst. 1 písm. a) ZDP pak její příjmy nejsou vyňaty a zdaňují se.</div>`:''}
  ${bigCash.length?`<div class="warnbox">Pozor: ${bigCash.length} zápis(y) převyšují limit platby v hotovosti 270 000 Kč (zákon č. 254/2004 Sb.).</div>`:''}
  ${inc>3000000?`<div class="warnbox">Příjmy přesáhly 3 000 000 Kč – od dalšího roku nelze vést jednoduché účetnictví (§ 1f zákona o účetnictví).</div>`:''}
  <div class="xbox"><table class="form-dp">
    <thead><tr><th>Řádek</th><th>Položka (II. oddíl – daň z příjmů právnických osob)</th><th style="text-align:right">Částka</th></tr></thead>
    <tbody>
    ${row('10','Rozdíl mezi příjmy a výdaji',money(r10),`Příjmy ${money(inc)} − výdaje ${money(out)} (bez průběžných položek – zálohy)`)}
    ${row('40','Výdaje, které nejsou daňovými výdaji',money(r40),`Výdaje hlavní činnosti${hlLoss?'':' (nevyjímají se – hlavní činnost je v zisku)'} a poskytnuté dary (§ 25 ZDP)`)}
    ${row('101','Příjmy, jež u veřejně prospěšných poplatníků nejsou předmětem daně (§ 18a)',money(r101),'Příjmy hlavní činnosti, pokud jsou její výdaje vyšší')}
    ${row('110','Příjmy osvobozené od daně',money(r110),'Přijaté dary a jiné bezúplatné příjmy (§ 19b ZDP)')}
    ${row('200','Základ daně / ztráta',money(r200),'ř. 10 + ř. 40 − ř. 101 − ř. 110','tot')}
    ${row('251','Snížení základu daně podle § 20 odst. 7 ZDP',money(r251),'Až 30 % základu, nejméně 300 000 Kč (max. do výše základu), nejvýše 1 000 000 Kč. Ušetřenou daň je nutné použít na hlavní činnost.')}
    ${row('270','Základ daně zaokrouhlený na celé tisíce Kč dolů',money(r270),'','tot')}
    ${row('280','Sazba daně','21 %','§ 21 odst. 1 ZDP')}
    ${row('290','Daň',money(r290),'','tot')}
    </tbody></table></div>
  <p class="note">Čísla řádků odpovídají tiskopisu 25 5404 platnému pro roky 2025–2026. Před podáním je porovnejte s aktuálním vzorem na portálu Moje daně. K přiznání se přikládá účetní závěrka (u jednoduchého účetnictví přehled o příjmech a výdajích a přehled o majetku a závazcích). Výpočet nenahrazuje daňového poradce.</p>
  <h3>Zařazení kategorií</h3>
  <p class="lead">Podle zařazení se počítají řádky výše. ${isOwner()?'Zařazení můžete změnit, uloží se pro všechny.':'Zařazení nastavuje správce.'} Zápisy bez kategorie se počítají do hlavní činnosti, kategorii jim doplňte přes Upravit.</p>
  <div class="xbox"><table class="mapt"><thead><tr><th>Kategorie</th><th style="text-align:right">Příjmy ${taxYear}</th><th style="text-align:right">Výdaje ${taxYear}</th><th>Zařazení pro daň</th></tr></thead><tbody>${catRows||'<tr><td colspan="4">Žádné zápisy</td></tr>'}</tbody></table></div>`;
  $('taxYearSel').onchange=e=>{taxYear=e.target.value;renderTax()};
  el.querySelectorAll('select[data-cat]').forEach(sel=>sel.onchange=()=>{
    const m=Object.assign({},PK.settings.taxMap||{}); m[sel.dataset.cat]=sel.value; PK.saveSettings({taxMap:m}).then(()=>renderTax());
  });
}

/* ---------- majetek ---------- */
function renderAssets(){
  const el=$('tabAssets'); const ys=years(); if(!assetYear||!ys.includes(assetYear))assetYear=ys.includes('2026')?'2026':ys[0];
  const out=PK.entries.filter(e=>e.type==='out'&&(e.date||'').startsWith(assetYear)).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.created||0)-(b.created||0));
  const isAsset=e=>e.asset===true||(e.asset!==false&&ASSET_CATS.includes(e.cat)&&e.amount>0);
  const A=out.filter(isAsset), O=out.filter(e=>!isAsset(e)&&e.amount>0);
  const tot=A.reduce((s,e)=>s+e.amount,0), dhm=A.filter(e=>e.amount>DHM_LIMIT);
  const rowsA=A.map((e,i)=>`<tr><td class="nw">M-${String(i+1).padStart(3,'0')}/${assetYear}</td><td class="nw">${czDate(e.date)}</td><td>${esc(e.text)}<span class="sub" style="display:block;font-size:12px;color:var(--muted)">doklad ${esc(e.doc||'')}${e.cat?' · '+esc(e.cat):''}</span></td><td class="n">${money(e.amount)}</td><td>${e.amount>DHM_LIMIT?'<span class="pill dhm">Dlouhodobý hmotný</span>':'<span class="pill drm">Drobný – operativní evidence</span>'}</td>${isOwner()?`<td class="nw"><button data-off="${e.id}">Vyřadit</button></td>`:''}</tr>`).join('');
  const rowsO=O.map(e=>`<tr><td class="nw">${czDate(e.date)}</td><td>${esc(e.text)}${e.cat?'<span class="sub" style="display:block;font-size:12px;color:var(--muted)">'+esc(e.cat)+'</span>':''}</td><td class="n">${money(e.amount)}</td><td class="nw"><button data-on="${e.id}">Zařadit do majetku</button></td></tr>`).join('');
  el.innerHTML=`
  <h2>Majetek sboru</h2>
  <p class="lead">Kniha majetku sestavená z výdajů pokladní knihy za vybraný rok. Do majetku se automaticky zařazují výdaje v kategoriích Vybavení klubovna a Vybavení hasiči${isOwner()?'; jednotlivé položky můžete vyřadit nebo přidat':''}.</p>
  <div class="yrsel">${yearSel('assetYearSel',assetYear)}</div>
  <div class="dp-head">
    <div><div class="l">Položek v evidenci</div><div class="v">${A.length}</div></div>
    <div><div class="l">Pořizovací cena celkem</div><div class="v">${money(tot)}</div></div>
    <div><div class="l">Z toho dlouhodobý hmotný majetek</div><div class="v">${dhm.length} ks · ${money(dhm.reduce((s,e)=>s+e.amount,0))}</div></div>
  </div>
  <div class="xbox"><table class="astable"><thead><tr><th>Inv. číslo</th><th>Pořízeno</th><th>Popis</th><th style="text-align:right">Pořizovací cena</th><th>Druh</th>${isOwner()?'<th></th>':''}</tr></thead>
  <tbody>${rowsA||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">V roce ${assetYear} není v evidenci žádný majetek.</td></tr>`}</tbody></table></div>
  <div class="infobox" style="margin-top:14px">
    <b>Jak se majetek SDH eviduje:</b> Sbor vede jednoduché účetnictví, ve kterém se majetek zapisuje do pomocné knihy o ostatních složkách majetku (§ 13b zákona o účetnictví, vyhláška č. 325/2015 Sb.). Majetek se oceňuje pořizovací cenou a jednou ročně k 31. 12. se provádí inventarizace (fyzická kontrola, zda věci existují a v jakém jsou stavu). Věci nad ${money(DHM_LIMIT)} s použitelností přes 1 rok jsou dlouhodobý hmotný majetek (§ 26 ZDP), levnější vybavení se vede v operativní evidenci. Vyřazení se dokládá protokolem.<br>
    <b>Pozor:</b> technika a výstroj jednotky požární ochrany (JSDH), kterou pořizuje obec, je majetkem obce, ne spolku SDH. Do této knihy patří jen to, co sbor koupil ze svých peněz.
  </div>
  ${isOwner()&&O.length?`<details style="margin-top:14px" ${showOther?'open':''} id="otherDet"><summary>Další výdaje roku ${assetYear} (${O.length}) – přidat do majetku</summary>
  <div class="xbox" style="margin-top:10px"><table class="astable"><thead><tr><th>Datum</th><th>Popis</th><th style="text-align:right">Částka</th><th></th></tr></thead><tbody>${rowsO}</tbody></table></div></details>`:''}`;
  $('assetYearSel').onchange=e=>{assetYear=e.target.value;renderAssets()};
  const det=$('otherDet'); if(det)det.ontoggle=()=>{showOther=det.open};
  const set=(id,v)=>{const e=PK.entries.find(x=>x.id===id);if(e)PK.updateEntry({...e,asset:v})};
  el.querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>set(b.dataset.off,false));
  el.querySelectorAll('[data-on]').forEach(b=>b.onclick=()=>set(b.dataset.on,true));
}

/* ---------- živnostenský list a výpis z rejstříků (živě z ARES) ---------- */
const ARES='https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/';
let reg=null, regLoading=false;
const DRUH={R:'Řemeslná',L:'Volná',K:'Koncesovaná',V:'Vázaná'};
const SOUD={MSPH:'Městského soudu v Praze',KSBR:'Krajského soudu v Brně',KSCB:'Krajského soudu v Českých Budějovicích',KSHK:'Krajského soudu v Hradci Králové',KSPL:'Krajského soudu v Plzni',KSUL:'Krajského soudu v Ústí nad Labem',KSOS:'Krajského soudu v Ostravě'};
const ZDROJ={Ros:'Registr osob',Vr:'Veřejný (spolkový) rejstřík',Res:'Registr ekonomických subjektů',Rzp:'Živnostenský rejstřík',Dph:'Registr plátců DPH',Nrpzs:'Registr zdravotnických zařízení',Rpsh:'Registr politických stran',Rcns:'Registr církví',Szr:'Zemědělský registr',Rs:'Registr škol',Ceu:'Evidence úpadců'};
const PFORMA={'736':'Pobočný spolek','706':'Spolek'};
const curr=a=>(a||[]).filter(x=>!x.datumVymazu&&!x.platnostDo&&!x.datumZaniku);
const dt=s=>s?czDate(String(s).slice(0,10)):'—';
const nm=o=>o?((o.jmeno||'')+' '+(o.prijmeni||'')).trim().toLowerCase().replace(/(^|[\s-])\S/g,m=>m.toUpperCase()):'';
const icoNum=()=>String(PK.settings.ico||'').replace(/\D/g,'');
async function loadReg(){
  const ico=icoNum(); if(!ico){reg={err:'V nastavení chybí IČO sboru.'};return}
  regLoading=true; renderReg();
  const get=p=>fetch(ARES+p+'/'+ico).then(r=>r.ok?r.json():null).catch(()=>null);
  const [es,rzp,vr]=await Promise.all([get('ekonomicke-subjekty'),get('ekonomicke-subjekty-rzp'),get('ekonomicke-subjekty-vr')]);
  regLoading=false;
  reg=es?{es,rzp:rzp&&rzp.zaznamy?rzp.zaznamy[0]:null,vr:vr&&vr.zaznamy?(vr.zaznamy.find(z=>z.primarniZaznam)||vr.zaznamy[0]):null,at:new Date()}:{err:'Údaje se nepodařilo načíst z ARES. Zkuste to za chvíli znovu.'};
  if(tab==='reg')renderReg();
}
function renderReg(){
  const el=$('tabReg'); const ico=icoNum();
  const links=ico?`<div class="actions" style="margin:6px 0 14px">
    <button class="btn" type="button" id="regReload">Načíst znovu</button>
    <a class="btn" href="https://or.justice.cz/ias/ui/rejstrik-$firma?ico=${ico}" target="_blank" rel="noopener">Úplný výpis – spolkový rejstřík (justice.cz)</a>
    <a class="btn" href="https://ares.gov.cz/ekonomicke-subjekty?ico=${ico}" target="_blank" rel="noopener">Výpis v ARES</a></div>`:'';
  const head=`<h2>Živnostenský list a výpis z rejstříků</h2>
  <p class="lead">Údaje se načítají živě z veřejného systému ARES Ministerstva financí (živnostenský rejstřík, spolkový rejstřík a registr ekonomických subjektů), takže jsou vždy aktuální.</p>${links}`;
  if(!ico){el.innerHTML=head+'<p>Čekám na údaje sboru… IČO se bere z Nastavení.</p>';return}
  if(!reg&&!regLoading){el.innerHTML=head+'<p>Načítám…</p>';loadReg();bindReg();return}
  if(regLoading){el.innerHTML=head+'<p>Načítám údaje z ARES…</p>';bindReg();return}
  if(reg.err){el.innerHTML=head+`<div class="warnbox">${esc(reg.err)}</div>`;bindReg();return}
  const es=reg.es, rz=reg.rzp, vr=reg.vr;
  const kv=(l,v)=>`<div><div class="l">${l}</div><div class="v">${v}</div></div>`;
  const regs=Object.entries(es.seznamRegistraci||{}).filter(([k,v])=>v==='AKTIVNI').map(([k])=>ZDROJ[k.replace('stavZdroje','')]||k.replace('stavZdroje','')).join(', ');
  let html=head+`<h3>Základní údaje</h3><div class="dp-head">
    ${kv('Název',esc(es.obchodniJmeno||''))}${kv('IČO',esc(es.ico||''))}
    ${kv('Právní forma',esc(PFORMA[es.pravniForma]||es.pravniForma||''))}${kv('Sídlo',esc((es.sidlo&&es.sidlo.textovaAdresa)||''))}
    ${kv('Datum vzniku',dt(es.datumVzniku))}${kv('Aktivní v registrech',esc(regs||'—'))}</div>`;
  if(rz){
    const zv=(rz.zivnosti||[]);
    const act=zv.filter(z=>!z.datumZaniku);
    const rows=zv.map(z=>{
      const stop=z.datumZaniku?'Zaniklá '+dt(z.datumZaniku):(curr(z.preruseni||[]).length?'Přerušená':'Aktivní');
      const ob=curr(z.oboryCinnosti).map(o=>esc(o.oborNazev)).join('; ');
      const oz=curr(z.odpovedniZastupci).map(nm).join(', ');
      return `<tr><td><b>${esc(z.predmetPodnikani||'')}</b>${ob?`<span style="display:block;font-size:12.5px;color:var(--muted)">Obory: ${ob}</span>`:''}${oz?`<span style="display:block;font-size:12.5px;color:var(--muted)">Odpovědný zástupce: ${esc(oz)}</span>`:''}</td><td class="nw">${esc(DRUH[z.druhZivnosti]||z.druhZivnosti||'')}</td><td class="nw">${dt(z.datumVzniku)}</td><td class="nw"><span class="pill ${stop==='Aktivní'?'drm':'dhm'}">${stop}</span></td></tr>`}).join('');
    const stat=curr(rz.angazovaneOsoby).map(nm).join(', ');
    html+=`<h3>Živnostenská oprávnění</h3>
    ${act.length?`<div class="okbox">Sbor má <b>${act.length}</b> ${act.length===1?'aktivní živnostenské oprávnění':act.length<5?'aktivní živnostenská oprávnění':'aktivních živnostenských oprávnění'}. Opravňují ho k vedlejší hospodářské činnosti (občerstvení, prodej nápojů), jejíž příjmy se zdaňují.</div>`:'<div class="warnbox">Sbor nemá aktivní živnostenské oprávnění.</div>'}
    <div class="xbox"><table class="astable"><thead><tr><th>Předmět podnikání</th><th>Druh živnosti</th><th>Vznik oprávnění</th><th>Stav</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="dp-head" style="margin-top:12px">${kv('Statutární zástupci (RŽP)',esc(stat||'—'))}${kv('Živnostenský úřad (kód)',esc(rz.zivnostenskyUrad||'—'))}${kv('Aktualizace v RŽP',dt(rz.datumAktualizace))}</div>`;
  }
  if(vr){
    const sz=curr(vr.spisovaZnacka)[0]||(vr.spisovaZnacka||[])[0];
    const orgs=curr(vr.statutarniOrgany).map(o=>`<li><b>${esc(o.nazevOrganu||'Statutární orgán')}</b>: ${curr(o.clenoveOrganu).map(c=>esc(nm(c.fyzickaOsoba)||(c.pravnickaOsoba&&c.pravnickaOsoba.obchodniJmeno)||'')+((c.clenstvi&&c.clenstvi.funkce&&c.clenstvi.funkce.nazev)?' – '+esc(c.clenstvi.funkce.nazev):'')+(c.clenstvi&&c.clenstvi.funkce&&c.clenstvi.funkce.vznikFunkce?' (od '+dt(c.clenstvi.funkce.vznikFunkce)+')':'')).join('; ')}</li>`).join('');
    const ucel=curr(vr.cinnosti&&vr.cinnosti.ucel).map(x=>esc(x.hodnota)).join('<br>');
    const nejv=curr(vr.nazevNejvyssihoOrganu).map(x=>esc(x.hodnota)).join(', ');
    html+=`<h3>Spolkový rejstřík</h3><div class="dp-head">
      ${kv('Spisová značka',sz?esc(sz.oddil+' '+sz.vlozka)+' vedená u '+esc(SOUD[sz.soud]||sz.soud):'—')}
      ${kv('Zapsáno',dt(vr.datumZapisu))}${kv('Nejvyšší orgán',nejv||'—')}${kv('Aktualizace v rejstříku',dt(vr.datumAktualizace))}</div>
      ${orgs?`<div class="law"><h4>Statutární orgán</h4><ul>${orgs}</ul></div>`:''}
      ${ucel?`<div class="law"><h4>Účel spolku</h4><div style="white-space:pre-wrap;font-size:14px">${ucel}</div></div>`:''}`;
  }
  html+=`<p class="note">Načteno ${reg.at.toLocaleString('cs-CZ')} ze systému ARES. Pro úřední účely (dotace, banka, úřad) si stáhněte ověřený výpis přes odkaz na justice.cz výše nebo na kontaktním místě Czech POINT.</p>`;
  el.innerHTML=html; bindReg();
}
function bindReg(){const b=$('regReload'); if(b)b.onclick=()=>{reg=null;renderReg()}}

/* ---------- kontrola evidence ---------- */
let chkYear=null;
const CHECKS=[
 ['doklady','Ke každému zápisu existuje fyzický pokladní doklad (příjmový / výdajový) se stejným číslem, datem, částkou, popisem a podpisem (§ 11 zákona o účetnictví).'],
 ['trzby','Ke každé tržbě je doklad o tržbě z akce (souhrn za den/akci, kdo prodával, kdo peníze předal a převzal, podpisy).'],
 ['nakupy','Nákupy zboží k prodeji (pivo, nápoje, občerstvení) mají účtenku nebo fakturu od dodavatele.'],
 ['lih','Lihoviny nakupujeme jen od registrovaného distributora lihu, při nákupu sdělujeme, že jde o konečný prodej, a doklady o nákupu uchováváme (zákon č. 307/2013 Sb.).'],
 ['baleni','V místě prodeje lihovin dodržujeme povolené velikosti otevřeného balení podle pravidel platných od 1. 7. 2025.'],
 ['zastupce','Odpovědný zástupce pro hostinskou činnost je aktuální; změny se hlásí živnostenskému úřadu.'],
 ['zalohy','Každá vydaná záloha je vyúčtovaná: doklady za utracené peníze jsou zapsané jako výdaj a nevyčerpaný zbytek jako vrácení zálohy.'],
 ['pujcky','Půjčky a jejich splátky jsou vedené v knize pohledávek a závazků, ne jako běžný výdaj či příjem.'],
 ['inventura','Revizor kontroluje pokladní hotovost (nejméně 4× ročně) a o kontrole je zápis se stavem hotovosti.'],
 ['revizor','Revizor sboru je zvolen valnou hromadou a není členem výboru (starosta, náměstek, velitel, hospodář ani jiný člen výboru revizorem být nemůže).'],
 ['majetek','K 31. 12. proběhne inventarizace majetku a pokladní hotovosti.'],
 ['archiv','Doklady a knihy se archivují nejméně 5 let po skončení roku.']];
function renderCheck(){
  const el=$('tabCheck'); const ys=years(); if(!chkYear||!ys.includes(chkYear))chkYear=ys.includes('2026')?'2026':ys[0];
  const all=[...PK.entries].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.created||0)-(b.created||0));
  const E=all.filter(e=>(e.date||'').startsWith(chkYear));
  const issues=[]; const add=(lvl,title,why,list)=>{if(list.length)issues.push({lvl,title,why,list})};
  const short=t=>(t||'').replace(/ ?\(Trénink mládež[^)]*\)/,' (…)');
  // 1 duplicitní čísla
  const byDoc={}; E.forEach(e=>{if(e.doc){(byDoc[e.doc]=byDoc[e.doc]||[]).push(e)}});
  add('err','Stejné číslo dokladu u více zápisů','Každý doklad musí mít jedinečné číslo, jinak nejde dohledat, ke kterému papíru zápis patří.',Object.values(byDoc).filter(a=>a.length>1).flat());
  // 2 prefix
  add('err','Číslo dokladu neodpovídá typu','Příjmy mají mít číslo P-…, výdaje V-…. Opravte číslo nebo typ zápisu podle fyzického dokladu.',E.filter(e=>e.doc&&((e.type==='in'&&!/^P/i.test(e.doc))||(e.type==='out'&&!/^V/i.test(e.doc)))));
  // 3 bez čísla
  add('err','Zápis bez čísla dokladu','Bez čísla nelze zápis spárovat s fyzickým dokladem.',E.filter(e=>!e.doc));
  // 4 nulové
  add('warn','Nulová částka','Zápis bez částky nepatří do peněžního deníku. Pokud jde jen o poznámku, smažte ho; pokud se platilo, doplňte částku.',E.filter(e=>!e.amount));
  // 5 bez kategorie
  add('warn','Zápis bez kategorie','Peněžní deník má příjmy a výdaje členit podle druhu (vyhláška č. 325/2015 Sb.). Kategorie se navíc používá pro výpočet daně a majetku.',E.filter(e=>!e.cat));
  // 6 tržba mimo kategorii Tržba
  add('warn','Tržba vedená v jiné kategorii','Text zápisu mluví o tržbě, ale kategorie není Tržba. Tržby z hostinské činnosti a prodeje patří do vedlejší činnosti, kategorie musí sedět.',E.filter(e=>/tržb|trzb/i.test(short(e.text))&&e.type==='in'&&e.cat!=='Tržba'&&e.cat!=='Pivo'));
  // 7 půjčky / vyrovnání
  add('warn','Půjčka, vyrovnání nebo převod peněz','Splátky půjček a přesuny peněz nejsou příjmem ani výdajem spolku. Patří do knihy pohledávek a závazků, případně mezi průběžné položky (kategorie Zálohy), a musí k nim být doklad.',E.filter(e=>/půjč|pujc|vyrovn|stará pokladn|staré pokladn|kasírk|kasirk/i.test(e.text)&&e.cat!=='Zálohy'&&!(e.cat==='Tržba'&&/tržb|trzb/i.test(e.text))));
  // 8 stručný popis
  add('info','Velmi stručný popis','Z popisu musí být jasné, co se platilo nebo za co se přijalo (např. „Pizza – občerstvení na brigádu 10. 7.“).',E.filter(e=>short(e.text).replace(/ \(…\).*/,'').trim().length<9));
  // 9 pořadí čísel
  const ord=[];['in','out'].forEach(t=>{let last=0,lastE=null;E.filter(e=>e.type===t).forEach(e=>{const m=/^[PV]-(\d+)\//i.exec(e.doc||'');if(m){const n=+m[1];if(n<last)ord.push(e);last=Math.max(last,n)}})});
  add('info','Čísla dokladů nejdou podle data','Doklady se číslují vzestupně v pořadí, jak vznikly. Zkontrolujte datum nebo číslo podle papírového dokladu.',ord);
  // 10 záporný zůstatek
  let bal=+PK.settings.opening||0; const neg=[]; all.forEach(e=>{bal+=e.type==='in'?e.amount:-e.amount; if(bal<0&&(e.date||'').startsWith(chkYear))neg.push(e)});
  add('err','Záporný stav pokladny','V pokladně nemůže být méně než nula. Chybí příjem, nebo je výdaj zapsaný dřív, než proběhl.',neg);
  // 11 hotovostní limit
  add('err','Platba nad 270 000 Kč v hotovosti','Zákon č. 254/2004 Sb. nedovoluje takovou platbu v hotovosti.',E.filter(e=>e.amount>270000));
  // souhrny
  const zal=E.filter(e=>e.cat==='Zálohy'); const zOut=zal.filter(e=>e.type==='out').reduce((s,e)=>s+e.amount,0), zIn=zal.filter(e=>e.type==='in').reduce((s,e)=>s+e.amount,0);
  const taxable=E.filter(e=>e.type==='in'&&groupOf(e.cat||'')==='zd').reduce((s,e)=>s+e.amount,0);
  const incAll=E.filter(e=>e.type==='in'&&groupOf(e.cat||'')!=='pr').reduce((s,e)=>s+e.amount,0);
  const nErr=issues.filter(i=>i.lvl==='err').reduce((s,i)=>s+i.list.length,0), nWarn=issues.filter(i=>i.lvl!=='err').reduce((s,i)=>s+i.list.length,0);
  const checks=PK.settings.checks||{};
  const rowsOf=list=>list.map(e=>`<tr><td class="nw">${czDate(e.date)}</td><td class="nw">${esc(e.doc||'—')}</td><td>${esc(short(e.text))}${e.cat?`<span class="catlbl">${esc(e.cat)}</span>`:''}</td><td class="n ${e.type==='in'?'in':'out'}" style="color:var(--${e.type==='in'?'inc':'exp'})">${e.type==='in'?'+':'−'}${money(e.amount)}</td>${isOwner()?`<td class="nw"><button data-fix="${e.id}">Upravit</button></td>`:''}</tr>`).join('');
  el.innerHTML=`<h2>Kontrola evidence</h2>
  <p class="lead">Automatická kontrola zápisů s ohledem na jednoduché účetnictví a aktivní živnosti sboru (hostinská činnost, prodej lihovin, maloobchod). Spouští se znovu při každé změně v knize.</p>
  <div class="yrsel">${yearSel('chkYearSel',chkYear)}</div>
  <div class="dp-head">
    <div><div class="l">Zápisů v roce ${chkYear}</div><div class="v">${E.length}</div></div>
    <div><div class="l">Chyby k opravě</div><div class="v" style="color:var(--${nErr?'exp':'inc'})">${nErr}</div></div>
    <div><div class="l">Upozornění</div><div class="v">${nWarn}</div></div>
    <div><div class="l">Zdaňované příjmy / limit DPH 2 000 000 Kč</div><div class="v">${money(taxable)} ${taxable<2000000?'✓':'⚠'}</div></div>
    <div><div class="l">Příjmy celkem / limit jednoduchého účetnictví 3 000 000 Kč</div><div class="v">${money(incAll)} ${incAll<=3000000?'✓':'⚠'}</div></div>
    <div><div class="l">Zálohy vydané / vrácené</div><div class="v">${money(zOut)} / ${money(zIn)}</div></div>
  </div>
  ${!issues.length?'<div class="okbox"><b>Bez nálezů.</b> Zápisy v tomto roce nemají žádný z kontrolovaných problémů.</div>':''}
  ${issues.map(i=>`<div class="law"><h4 style="color:var(--${i.lvl==='err'?'exp':i.lvl==='warn'?'ink':'muted'})">${i.lvl==='err'?'Chyba':i.lvl==='warn'?'Upozornění':'Doporučení'}: ${esc(i.title)} (${i.list.length})</h4><p style="margin:4px 0 10px;font-size:14px;color:var(--muted)">${i.why}</p><div class="xbox"><table class="astable" style="min-width:600px"><tbody>${rowsOf(i.list)}</tbody></table></div></div>`).join('')}
  <h3>Kontrolní seznam dokladů a povinností</h3>
  <p class="lead">Body, které aplikace z dat ověřit nemůže. ${isOwner()?'Odškrtnuté body se uloží.':'Odškrtává správce.'}</p>
  <div class="law"><ul style="list-style:none;padding-left:0">${CHECKS.map(([k,t])=>`<li style="margin:8px 0;display:flex;gap:10px;align-items:flex-start"><input type="checkbox" data-chk="${k}" ${checks[k]?'checked':''} ${isOwner()?'':'disabled'} style="width:auto;margin-top:3px"><span>${t}</span></li>`).join('')}</ul></div>
  <p class="note">Kontrola je pomůcka, nenahrazuje revizora ani daňového poradce.</p>`;
  $('chkYearSel').onchange=e=>{chkYear=e.target.value;renderCheck()};
  el.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>{
    setTab('book'); const all=document.querySelector('#viewTabs button[data-v="all"]'); if(all)all.click();
    const per=document.getElementById('period'); if(per&&per.value!=='all'){per.value='all';per.dispatchEvent(new Event('change'))}
    setTimeout(()=>{const x=document.querySelector('#rows [data-edit="'+b.dataset.fix+'"]'); if(x)x.click()},60);
  });
  el.querySelectorAll('[data-chk]').forEach(c=>c.onchange=()=>{const m=Object.assign({},PK.settings.checks||{});m[c.dataset.chk]=c.checked;PK.saveSettings({checks:m})});
}

/* ---------- závazky a pohledávky (kniha pohledávek a závazků) ---------- */
let debtEdit=null;
const debtsAll=()=>(PK.settings.debts||[]).slice();
const entryById=id=>PK.entries.find(e=>e.id===id);
function debtCalc(d){
  const links=(d.links||[]).map(l=>({...l,e:entryById(l.id)})).filter(l=>l.e);
  const paid=links.filter(l=>l.role==='uhrada').reduce((s,l)=>s+l.e.amount,0)+(+d.paidOther||0);
  const rest=Math.max(0,(+d.amount||0)-paid);
  const today=PK.today();
  const state=rest<=0?'Uhrazeno':(d.due&&d.due<today?'Po splatnosti':'Otevřeno');
  return {links,paid,rest,state};
}
function saveDebts(list){return PK.saveSettings({debts:list}).then(()=>renderDebts())}
function renderDebts(){
  const el=$('tabDebts'); const D=debtsAll();
  const part=kind=>{
    const L=D.filter(d=>d.kind===kind);
    const rows=L.map(d=>{const c=debtCalc(d);
      const lk=c.links.map(l=>`<span style="display:block;font-size:12.5px;color:var(--muted)">${l.role==='vznik'?'Vznik':'Úhrada'}: ${esc(l.e.doc||'')} ${czDate(l.e.date)} – ${money(l.e.amount)}</span>`).join('');
      return `<tr><td><b>${esc(d.party||'—')}</b><span style="display:block">${esc(d.title||'')}</span>${d.docRef?`<span style="display:block;font-size:12.5px;color:var(--muted)">Doklad: ${esc(d.docRef)}</span>`:''}${d.note?`<span style="display:block;font-size:12.5px;color:var(--muted)">${esc(d.note)}</span>`:''}${lk}</td>
      <td class="nw">${d.date?czDate(d.date):'<span style="color:var(--exp)">doplnit</span>'}</td><td class="nw">${d.due?czDate(d.due):'—'}</td>
      <td class="n">${money(d.amount)}</td><td class="n">${money(c.paid)}</td><td class="n"><b>${money(c.rest)}</b></td>
      <td class="nw"><span class="pill ${c.state==='Uhrazeno'?'drm':'dhm'}">${c.state}</span></td>
      ${isOwner()?`<td class="nw"><button data-dedit="${d.id}">Upravit</button><button data-ddel="${d.id}" style="color:var(--exp)">Smazat</button></td>`:''}</tr>`}).join('');
    const open=L.reduce((s,d)=>s+debtCalc(d).rest,0);
    return `<h3>${kind==='z'?'Závazky – co sbor dluží':'Pohledávky – co dluží sboru'}</h3>
    <div class="xbox"><table class="astable"><thead><tr><th>${kind==='z'?'Věřitel':'Dlužník'} / předmět</th><th>Vznik</th><th>Splatnost</th><th style="text-align:right">Částka</th><th style="text-align:right">Uhrazeno</th><th style="text-align:right">Zbývá</th><th>Stav</th>${isOwner()?'<th></th>':''}</tr></thead>
    <tbody>${rows||`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:16px">Žádné ${kind==='z'?'závazky':'pohledávky'}.</td></tr>`}</tbody></table></div>
    <p class="note">Neuhrazeno celkem: <b>${money(open)}</b></p>`;
  };
  let form='';
  if(isOwner()){
    const d=debtEdit||{kind:'z',links:[]};
    const cand=[...PK.entries].sort((a,b)=>a.date<b.date?1:-1).filter(e=>e.cat==='Zálohy'||/půjč|pujc|vratk|vyrovn/i.test(e.text||'')||(d.links||[]).some(l=>l.id===e.id));
    const linkRows=cand.map(e=>{const l=(d.links||[]).find(x=>x.id===e.id);return `<tr><td class="nw">${czDate(e.date)}</td><td class="nw">${esc(e.doc||'')}</td><td>${esc((e.text||'').slice(0,60))}</td><td class="n">${e.type==='in'?'+':'−'}${money(e.amount)}</td><td><select data-link="${e.id}" style="padding:5px 6px"><option value="">—</option><option value="vznik" ${l&&l.role==='vznik'?'selected':''}>vznik</option><option value="uhrada" ${l&&l.role==='uhrada'?'selected':''}>úhrada</option></select></td></tr>`}).join('');
    form=`<details class="law" id="debtForm" ${debtEdit?'open':''}><summary style="cursor:pointer;font-weight:600">${debtEdit&&debtEdit.id?'Upravit záznam':'Přidat závazek nebo pohledávku'}</summary>
    <div class="grid" style="margin-top:12px">
      <div class="f s3"><label for="dKind">Typ</label><select id="dKind"><option value="z" ${d.kind==='z'?'selected':''}>Závazek (dlužíme my)</option><option value="p" ${d.kind==='p'?'selected':''}>Pohledávka (dluží nám)</option></select></div>
      <div class="f s5"><label for="dParty">Věřitel / dlužník</label><input id="dParty" value="${esc(d.party||'')}"></div>
      <div class="f s4"><label for="dAmt">Částka (Kč)</label><input id="dAmt" inputmode="decimal" value="${d.amount||''}"></div>
      <div class="f s6"><label for="dTitle">Předmět (např. půjčka na nákup piva)</label><input id="dTitle" value="${esc(d.title||'')}"></div>
      <div class="f s3"><label for="dDate">Datum vzniku</label><input type="date" id="dDate" value="${d.date||''}"></div>
      <div class="f s3"><label for="dDue">Splatnost</label><input type="date" id="dDue" value="${d.due||''}"></div>
      <div class="f s6"><label for="dDoc">Doklad (smlouva, potvrzení)</label><input id="dDoc" value="${esc(d.docRef||'')}"></div>
      <div class="f s3"><label for="dOther">Uhrazeno mimo pokladnu (Kč)</label><input id="dOther" inputmode="decimal" value="${d.paidOther||''}"></div>
      <div class="f s12"><label for="dNote">Poznámka</label><input id="dNote" value="${esc(d.note||'')}"></div>
    </div>
    <p class="note">Propojte zápisy z pokladní knihy: kdy peníze přišly nebo odešly (vznik) a kterými zápisy se dluh splácel (úhrada).</p>
    <div class="xbox"><table class="astable" style="min-width:560px"><tbody>${linkRows||'<tr><td>Žádné vhodné zápisy (kategorie Zálohy).</td></tr>'}</tbody></table></div>
    <div class="actions"><button class="btn primary" id="dSave" type="button">Uložit</button>${debtEdit?'<button class="btn ghost" id="dCancel" type="button">Zrušit</button>':''}</div></details>`;
  }
  el.innerHTML=`<h2>Závazky a pohledávky</h2>
  <p class="lead">Kniha pohledávek a závazků podle § 13b zákona o účetnictví. Patří sem půjčky, nezaplacené faktury a peníze, které sbor někomu dluží nebo které dluží někdo sboru. Splátky a přijetí půjček se v pokladní knize vedou v kategorii Zálohy, aby se nezapočítaly do příjmů a výdajů.</p>
  ${part('z')}${part('p')}${form}`;
  el.querySelectorAll('[data-dedit]').forEach(b=>b.onclick=()=>{debtEdit=JSON.parse(JSON.stringify(debtsAll().find(x=>x.id===b.dataset.dedit)));renderDebts();$('debtForm').scrollIntoView({behavior:'smooth'})});
  el.querySelectorAll('[data-ddel]').forEach(b=>b.onclick=()=>{const d=debtsAll().find(x=>x.id===b.dataset.ddel);if(d&&confirm('Smazat záznam „'+(d.party||'')+' – '+(d.title||'')+'“?'))saveDebts(debtsAll().filter(x=>x.id!==d.id))});
  const sv=$('dSave'); if(sv)sv.onclick=()=>{
    const amt=parseFloat(String($('dAmt').value).replace(/\s/g,'').replace(',','.'));
    if(!$('dParty').value.trim()||!(amt>0)){toastX('Vyplňte věřitele/dlužníka a částku.');return}
    const links=[...el.querySelectorAll('[data-link]')].filter(s=>s.value).map(s=>({id:s.dataset.link,role:s.value}));
    const rec={id:(debtEdit&&debtEdit.id)||('d_'+Date.now().toString(36)),kind:$('dKind').value,party:$('dParty').value.trim(),title:$('dTitle').value.trim(),amount:amt,date:$('dDate').value,due:$('dDue').value,docRef:$('dDoc').value.trim(),paidOther:parseFloat(String($('dOther').value).replace(',','.'))||0,note:$('dNote').value.trim(),links};
    const list=debtsAll().filter(x=>x.id!==rec.id); list.push(rec); debtEdit=null; saveDebts(list);
  };
  const cn=$('dCancel'); if(cn)cn.onclick=()=>{debtEdit=null;renderDebts()};
}
function toastX(t){const el=document.getElementById('toast');if(!el)return alert(t);el.textContent=t;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),2000)}

/* ---------- zákony a předpisy ---------- */
function lawsHTML(){
  const L=(title,url,items)=>`<div class="law"><h4><a href="${url}" target="_blank" rel="noopener">${title}</a></h4><ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`;
  return `
  <h2>Zákony a předpisy pro hospodaření SDH</h2>
  <p class="lead">Přehled předpisů, podle kterých je pokladní kniha vedena a podle kterých se počítají záložky Daňové přiznání a Majetek. Stav k 26. 10. 2026. Odkazy vedou na aktuální znění zákonů.</p>
  ${L('Zákon č. 89/2012 Sb., občanský zákoník','https://www.zakonyprolidi.cz/cs/2012-89',[
    '<b>§ 214 a násl.</b> – spolek jako právnická osoba založená ke společnému naplňování zájmů členů.',
    '<b>§ 217</b> – spolek může vedle hlavní činnosti provozovat vedlejší hospodářskou činnost (např. občerstvení na akcích), zisk lze použít jen pro spolkovou činnost.',
    '<b>§ 228–231</b> – pobočný spolek. SDH je pobočným spolkem Sdružení hasičů Čech, Moravy a Slezska, má vlastní právní osobnost a IČO a sám odpovídá za své hospodaření.'])}
  ${L('Zákon č. 563/1991 Sb., o účetnictví','https://www.zakonyprolidi.cz/cs/1991-563',[
    '<b>§ 1f</b> – spolek a pobočný spolek může vést jednoduché účetnictví, pokud není plátcem DPH, jeho celkové příjmy za poslední uzavřené období nepřesáhly 3 000 000 Kč a hodnota majetku nepřesahuje 3 000 000 Kč.',
    '<b>§ 13b</b> – v jednoduchém účetnictví se vedou účetní knihy: peněžní deník, kniha pohledávek a závazků a pomocné knihy o ostatních složkách majetku. Tato pokladní kniha plní roli peněžního deníku pro hotovost.',
    '<b>§ 11</b> – každý zápis musí mít účetní doklad (pokladní doklad): označení, obsah, účastníky, částku, datum vyhotovení a uskutečnění a podpis odpovědné osoby.',
    '<b>§ 6, § 29 a § 30</b> – inventarizace majetku a závazků, nejméně jednou ročně k poslednímu dni účetního období.',
    'Do 6 měsíců po skončení roku se sestavuje přehled o příjmech a výdajích a přehled o majetku a závazcích (účetní závěrka v jednoduchém účetnictví).',
    '<b>§ 31</b> – účetní záznamy (pokladní doklady, kniha) se archivují nejméně 5 let po skončení účetního období.'])}
  ${L('Vyhláška č. 325/2015 Sb., pro účetní jednotky vedoucí jednoduché účetnictví','https://www.zakonyprolidi.cz/cs/2015-325',[
    'Stanoví obsah peněžního deníku: zápisy chronologicky, členění příjmů a výdajů podle druhu (proto kategorie), průběžné položky (např. zálohy) zvlášť.',
    'Peněžní deník obsahuje zůstatky hotovosti na začátku a na konci účetního období (počáteční a konečný stav).',
    'Upravuje knihu pohledávek a závazků, pomocné knihy o majetku a vzory přehledu o příjmech a výdajích a přehledu o majetku a závazcích.'])}
  ${L('Zákon č. 586/1992 Sb., o daních z příjmů','https://www.zakonyprolidi.cz/cs/1992-586',[
    '<b>§ 17a</b> – spolek je veřejně prospěšným poplatníkem.',
    '<b>§ 18a odst. 1 písm. a)</b> – příjmy z hlavní (nepodnikatelské) činnosti nejsou předmětem daně, pokud jsou výdaje na tuto činnost vyšší. Příjmy z vedlejší hospodářské činnosti (tržby z občerstvení, prodej piva) předmětem daně jsou.',
    '<b>§ 19b</b> – osvobození bezúplatných příjmů (např. dary od obce či sponzorů) za zákonných podmínek.',
    '<b>§ 20 odst. 7</b> – veřejně prospěšný poplatník může snížit základ daně až o 30 %, nejvýše o 1 000 000 Kč; je-li 30 % méně než 300 000 Kč, lze odečíst 300 000 Kč, nejvýše do výše základu daně. Ušetřené prostředky se musí použít na hlavní činnost.',
    'Základ daně se zaokrouhluje na celé tisíce Kč dolů (§ 20). <b>§ 21</b> – sazba daně z příjmů právnických osob je 21 %.',
    '<b>§ 26</b> – hmotný majetek se vstupní cenou nad 80 000 Kč a dobou použitelnosti delší než 1 rok je dlouhodobý hmotný majetek.',
    '<b>§ 38mb</b> – veřejně prospěšný poplatník nemusí podat přiznání, jen pokud má výhradně příjmy, které nejsou předmětem daně, jsou osvobozené nebo zdaněné srážkou. Sbor s tržbami přiznání podává.'])}
  ${L('Zákon č. 280/2009 Sb., daňový řád','https://www.zakonyprolidi.cz/cs/2009-280',[
    '<b>§ 136</b> – lhůta pro podání přiznání jsou 3 měsíce po skončení zdaňovacího období, při elektronickém podání 4 měsíce (pokud připadne na víkend či svátek, posouvá se na nejbližší pracovní den).',
    '<b>§ 72</b> – subjekt s datovou schránkou (každá právnická osoba) podává přiznání elektronicky, např. přes portál Moje daně.'])}
  ${L('Zákon č. 304/2013 Sb., o veřejných rejstřících','https://www.zakonyprolidi.cz/cs/2013-304',[
    '<b>§ 66</b> – do sbírky listin spolkového rejstříku se ukládá účetní závěrka; spolek s jednoduchým účetnictvím ukládá přehled o majetku a závazcích. Za nesplnění hrozí pořádková pokuta až 100 000 Kč (po předchozí výzvě soudu).'])}
  ${L('Zákon č. 254/2004 Sb., o omezení plateb v hotovosti','https://www.zakonyprolidi.cz/cs/2004-254',[
    '<b>§ 4</b> – platbu přesahující 270 000 Kč za jeden den nelze provést v hotovosti, musí jít přes účet.'])}
  ${L('Zákon č. 133/1985 Sb., o požární ochraně','https://www.zakonyprolidi.cz/cs/1985-133',[
    'Jednotku sboru dobrovolných hasičů obce (JSDH) zřizuje a vybavuje obec. Technika a výstroj jednotky je majetkem obce a nepatří do majetku spolku SDH.'])}
  ${L('Vnitřní předpisy SH ČMS','https://www.dh.cz',[
    'Stanovy SH ČMS, organizační řád a směrnice o hospodaření závazné pro pobočné spolky.',
    'Metodický pokyn ÚKRR č. 1/2017 – revizor sboru kontroluje hospodaření včetně pokladní hotovosti nejméně 4× ročně.'])}
  <p class="note">Přehled je informativní a nenahrazuje právní ani daňové poradenství. Při nejasnostech se obraťte na okresní sdružení hasičů nebo daňového poradce.</p>`;
}

/* ---------- start ---------- */
const h0=(location.hash||'').slice(1); setTab(['laws','tax','assets','reg','check','debts'].includes(h0)?h0:'book');
})();
