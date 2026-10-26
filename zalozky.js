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
<section class="xt" id="tabAssets" hidden></section>`;
$('tabLaws').innerHTML=lawsHTML();

const tabs=[...document.querySelectorAll('#mainTabs button')];
function setTab(t){
  tab=t; document.body.dataset.tab=t;
  tabs.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  $('tabLaws').hidden=t!=='laws'; $('tabTax').hidden=t!=='tax'; $('tabAssets').hidden=t!=='assets';
  if(t==='tax')renderTax(); if(t==='assets')renderAssets();
  try{history.replaceState(null,'',t==='book'?location.pathname:'#'+t)}catch(e){}
}
tabs.forEach(b=>b.onclick=()=>setTab(b.dataset.t));
PK.onRender=()=>{if(tab==='tax')renderTax(); if(tab==='assets')renderAssets()};
const h=(location.hash||'').slice(1); setTab(['laws','tax','assets'].includes(h)?h:'book');

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
})();
