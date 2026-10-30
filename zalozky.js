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
<section class="xt" id="tabDebts" hidden></section>
<section class="xt" id="tabForms" hidden></section>`;
$('tabLaws').innerHTML=lawsHTML();

const tabs=[...document.querySelectorAll('#mainTabs button')];
function setTab(t){
  tab=t; document.body.dataset.tab=t;
  tabs.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  $('tabLaws').hidden=t!=='laws'; $('tabTax').hidden=t!=='tax'; $('tabAssets').hidden=t!=='assets'; $('tabReg').hidden=t!=='reg'; $('tabCheck').hidden=t!=='check'; $('tabDebts').hidden=t!=='debts'; $('tabForms').hidden=t!=='forms';
  if(t==='tax')renderTax(); if(t==='assets')renderAssets(); if(t==='reg')renderReg(); if(t==='check')renderCheck(); if(t==='debts')renderDebts(); if(t==='forms')renderForms();
  try{history.replaceState(null,'',t==='book'?location.pathname:'#'+t)}catch(e){}
}
tabs.forEach(b=>b.onclick=()=>setTab(b.dataset.t));
PK.onRender=()=>{if(tab==='tax')renderTax(); if(tab==='assets')renderAssets(); if(tab==='reg'&&!reg&&!regLoading)renderReg(); if(tab==='check')renderCheck(); if(tab==='debts'&&!debtEdit)renderDebts(); if(tab==='forms')renderForms()};

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
function dppo(y){
  const E=PK.entries.filter(e=>(e.date||'').startsWith(y));
  const cats={}; const g={zd:{i:0,o:0},hl:{i:0,o:0},os:{i:0,o:0},pr:{i:0,o:0}}; const big=[];
  E.forEach(e=>{const c=e.cat||''; cats[c]=cats[c]||{i:0,o:0}; const k=e.type==='in'?'i':'o'; cats[c][k]+=e.amount; g[groupOf(c)][k]+=e.amount; if(e.amount>270000)big.push(e)});
  const inc=g.zd.i+g.hl.i+g.os.i, out=g.zd.o+g.hl.o+g.os.o, hlLoss=g.hl.o>=g.hl.i;
  const R={}; R[10]=Math.round(inc-out); R[40]=Math.round((hlLoss?g.hl.o:0)+g.os.o); R[70]=R[40];
  R[101]=Math.round(hlLoss?g.hl.i:0); R[110]=Math.round(g.os.i); R[170]=R[101]+R[110];
  R[200]=R[10]+R[70]-R[170]; R[220]=R[200]; const loss=R[220]<=0;
  R[230]=0; R[250]=loss?0:R[220];
  R[251]=loss?0:Math.round(Math.min(R[250],Math.max(Math.min(R[250]*0.3,1000000),300000)));
  R[260]=0; R[270]=loss?0:Math.max(0,Math.floor((R[250]-R[251]-R[260])/1000)*1000);
  R[280]=21; R[290]=Math.ceil(R[270]*0.21); R[300]=0; R[310]=R[290]; R[320]=0; R[330]=R[310]; R[340]=R[330]; R[360]=R[340];
  const mustFile=g.zd.i>0||(!hlLoss&&g.hl.i>0);
  return {E,cats,g,inc,out,hlLoss,R,loss,mustFile,big};
}
const DP_ROWS=[[10,'Výsledek hospodaření nebo rozdíl mezi příjmy a výdaji (+/−)','u jednoduchého účetnictví rozdíl příjmů a výdajů – položka 99 přehledu o příjmech a výdajích'],[20,'Částky neoprávněně zkracující příjmy a hodnota nepeněžních příjmů'],[30,'Částky upravující výsledek hospodaření podle § 23 odst. 3 písm. a) zákona'],[40,'Výdaje (náklady), které nelze zahrnout do výdajů vynaložených na dosažení, zajištění a udržení příjmů','výdaje hlavní činnosti, jejíž příjmy nejsou předmětem daně, a poskytnuté dary'],[50,'Rozdíl, o který účetní odpisy převyšují odpisy daňové'],[70,'Úhrn řádků 20 až 65'],[101,'Příjmy veřejně prospěšného poplatníka, které nejsou předmětem daně (§ 18a)','příjmy z hlavní činnosti, jsou-li výdaje na ni vyšší'],[110,'Příjmy osvobozené od daně, pokud jsou zahrnuty v ř. 10','přijaté dary a jiné bezúplatné příjmy (§ 19b)'],[170,'Úhrn řádků 100 až 165'],[200,'Základ daně před úpravou o část základu daně připadající na komplementáře (ř. 10 + ř. 70 − ř. 170)'],[220,'Základ daně nebo daňová ztráta (ř. 200 − ř. 201 − ř. 210)'],[230,'Odečet daňové ztráty'],[250,'Základ daně snížený o položky ř. 230 až 243'],[251,'Snížení základu daně podle § 20 odst. 7 zákona','veřejně prospěšný poplatník: 30 %, nejméně 300 000 Kč (max. do výše základu), nejvýše 1 000 000 Kč'],[260,'Odečet bezúplatných plnění (§ 20 odst. 8)'],[270,'Základ daně snížený o ř. 251 a 260 a zaokrouhlený na celé tisíce Kč dolů'],[280,'Sazba daně (%)'],[290,'Daň (ř. 270 × ř. 280 / 100)'],[300,'Slevy na dani'],[310,'Daň po uplatnění slev (ř. 290 − ř. 300)'],[320,'Zápočet daně zaplacené v zahraničí'],[330,'Daň upravená o zápočet (ř. 310 − ř. 320)'],[340,'Daň celkem (ř. 330 + ř. 335)'],[360,'Poslední známá daňová povinnost']];
const fmtKc=v=>Number(v||0).toLocaleString('cs-CZ');
function dpSettings(){const s=PK.settings.dppo||{}; const st=(regMini&&regMini.stat&&regMini.stat[0])||''; const m=/^(\S+)\s+(.+?)(?:\s*\((.+)\))?$/.exec(st)||[];
  return {ufo:s.ufo||'460',pracufo:s.pracufo||'',jmeno:s.jmeno||m[1]||'',prijmeni:s.prijmeni||m[2]||'',postaveni:s.postaveni||(m[3]?m[3].replace(/ SDH$/,''):'starosta'),tel:s.tel||'',nace:s.nace||''}}
function splitAddr(a){a=String(a||''); const psc=(a.match(/\b(\d{3})\s?(\d{2})\b/)||[]); const cp=(a.match(/č\.\s?p\.\s?(\d+)/i)||a.match(/\b(\d{1,4})\b(?=,)/)||[]); const obec=(a.split(',').pop()||'').replace(/\d{3}\s?\d{2}/,'').trim()||(a.split(/\s|,/)[0]||'');
  return {psc:psc[1]?psc[1]+psc[2]:'',cp:cp[1]||'',obec}}
function dpXml(y){const D=dppo(y),R=D.R,s=PK.settings,ds=dpSettings(),ad=splitAddr(s.address),ico=String(s.ico||'').replace(/\D/g,'');
  const at=o=>Object.entries(o).filter(([k,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>` ${k}="${String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"`).join('');
  const D_={dokument:'DP9',k_uladis:'DPP',dapdpp_forma:'B',typ_dapdpp:'A',typ_zo:'A',typ_popldpp:'3',zdobd_od:'01.01.'+y,zdobd_do:'31.12.'+y,c_ufo_cil:ds.ufo,c_nace:ds.nace};
  const P_={dic:ico,rod_c:ico,zkrobchjm:s.firm||'',naz_obce:ad.obec,c_pop:ad.cp,psc:ad.psc,k_stat:'CZ',c_pracufo:ds.pracufo,c_telef:ds.tel,opr_jmeno:ds.jmeno,opr_prijmeni:ds.prijmeni,opr_postaveni:ds.postaveni};
  const O_={kc_ii10_10:R[10],kc_ii50_40:R[40],kc_ii80_70:R[70],kc_ii111_101:R[101],kc_ii120_110:R[110],kc_ii190_170:R[170],kc_ii200_200:R[200],kc_ii_220:R[220]};
  if(!D.loss)Object.assign(O_,{kc_ii230_250:R[250],kc_ii231_251:R[251],kc_ii260_270:R[270],kc_ii270_280:R[280],kc_ii280_290:R[290],kc_ii300_310:R[310],kc_ii320_330:R[330]});
  Object.assign(O_,{kc_ii_340:Math.max(0,R[340]),kc_ii_360:Math.max(0,R[360])});
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Pisemnost nazevSW="Pokladni kniha SDH" verzeSW="1.0">\n<DPPDP9>\n<VetaD${at(D_)}/>\n<VetaP${at(P_)}/>\n<VetaO${at(O_)}/>\n</DPPDP9>\n</Pisemnost>\n`;}
function downloadText(text,name,type){const f=new File([text],name,{type});const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function renderTax(){
  const el=$('tabTax'); const ys=years(); if(!taxYear||!ys.includes(taxYear))taxYear=ys.includes('2026')?'2026':ys[0];
  const D=dppo(taxYear), R=D.R, s=PK.settings, ds=dpSettings(), thisYear=String(new Date().getFullYear()), ico=String(s.ico||'').replace(/\D/g,'');
  const cell=(v)=>`<div class="dpv">${fmtKc(v)}</div>`;
  const rowsHtml=DP_ROWS.map(([r,t,sub])=>{const v=R[r]===undefined?0:R[r]; const hl=[200,220,270,290,340].includes(r); const off=D.loss&&r>=230&&r<=330;
    return `<tr class="${hl?'dphl':''}${off?' dpoff':''}"><td class="dpr">${r}</td><td>${t}${sub?`<span class="dps">${sub}</span>`:''}</td><td class="dpc">${off?'':(r===280?'<div class="dpv">21</div>':cell(v))}</td></tr>`}).join('');
  const catRows=Object.keys(D.cats).sort((a,b)=>(CATS.indexOf(a)+99*(a===''))-(CATS.indexOf(b)+99*(b===''))).map(c=>{const gv=groupOf(c);
    const sel=isOwner()?`<select data-cat="${esc(c)}">${Object.entries(GROUPS).map(([k,v])=>`<option value="${k}" ${k===gv?'selected':''}>${v}</option>`).join('')}</select>`:esc(GROUPS[gv]);
    return `<tr><td>${esc(c||'Bez kategorie')}</td><td class="n">${money(D.cats[c].i)}</td><td class="n">${money(D.cats[c].o)}</td><td>${sel}</td></tr>`}).join('');
  if(!document.getElementById('dpCss')){const st=document.createElement('style');st.id='dpCss';st.textContent=`
.dpform{background:#fff;color:#111;border:2px solid #222;max-width:900px;margin:8px 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px}
.dpform .dph{display:grid;grid-template-columns:1fr auto;border-bottom:2px solid #222}
.dpform .dph>div{padding:8px 10px}
.dpform .dph .t{font-size:20px;font-weight:700;letter-spacing:.3px}
.dpform .dph .k{border-left:2px solid #222;font-size:11px;text-align:right;white-space:nowrap}
.dpform .box{border:1px solid #222;display:inline-block;padding:2px 8px;margin:2px 2px 0 0;font-family:'Courier New',monospace;font-weight:700;background:#fff}
.dpform .sec{background:#dde3e6;font-weight:700;padding:5px 10px;border-top:1px solid #222;border-bottom:1px solid #222;text-transform:uppercase;font-size:12px}
.dpform .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.dpform .fld{padding:6px 10px;border-right:1px solid #999;border-bottom:1px solid #999}
.dpform .fld .l{font-size:10.5px;color:#444}
.dpform .fld .v{font-weight:700;font-family:'Courier New',monospace}
.dpform table{width:100%;border-collapse:collapse;min-width:0}
.dpform td{border-bottom:1px solid #999;padding:5px 8px;vertical-align:top}
.dpform td.dpr{width:46px;text-align:center;font-weight:700;border-right:1px solid #999;background:#f2f4f5}
.dpform td.dpc{width:170px;border-left:1px solid #999}
.dpform .dpv{border:1px solid #222;padding:2px 6px;text-align:right;font-family:'Courier New',monospace;font-weight:700;background:#fff}
.dpform .dps{display:block;font-size:11px;color:#555;margin-top:1px}
.dpform tr.dphl td{background:#eef3ff}
.dpform tr.dpoff td{color:#999}
.dpform .foot{padding:8px 10px;font-size:11px;color:#333;border-top:2px solid #222}
@media (prefers-color-scheme:dark){.dpform{box-shadow:0 0 0 1px #555}}`;document.head.appendChild(st)}
  el.innerHTML=`<h2>Daňové přiznání k dani z příjmů právnických osob</h2>
  <p class="lead">Živě vyplněný formulář podle pokladní knihy, rozložením odpovídající tiskopisu 25 5404 (II. oddíl). Stáhnete ho jako PDF k tisku nebo jako XML soubor pro elektronické podání přes EPO.</p>
  <div class="yrsel">${yearSel('taxYearSel',taxYear)}
   <div class="actions" style="margin:0"><button class="btn primary" type="button" id="dpPdf">Tisk / PDF</button><button class="btn primary" type="button" id="dpXml">Export XML pro EPO</button><a class="btn" href="https://www.mojedane.cz" target="_blank" rel="noopener">Otevřít Moje daně</a></div></div>
  ${taxYear===thisYear?`<div class="infobox">Rok ${taxYear} ještě neskončil – formulář je průběžný stav k ${czDate(PK.today())}. Podává se až po skončení roku, do ${deadline(taxYear)}.</div>`:''}
  ${D.mustFile?`<div class="warnbox"><b>Přiznání je potřeba podat.</b> Sbor má zdanitelné příjmy z vedlejší činnosti (tržby, prodej nápojů); výjimka podle § 38mb se nepoužije.</div>`:`<div class="okbox">Podle současného zařazení nemá sbor v roce ${taxYear} zdanitelné příjmy; přiznání podle § 38mb podávat nemusí.</div>`}
  ${!D.hlLoss&&D.g.hl.i>0?`<div class="warnbox">Hlavní činnost je v zisku – její příjmy se podle § 18a zdaňují.</div>`:''}
  <div class="dpform" id="dpForm">
    <div class="dph"><div><div style="font-size:11px">Finančnímu úřadu pro <b>${ds.ufo==='460'?'Kraj Vysočina':'(kód '+esc(ds.ufo)+')'}</b></div><div class="t">PŘIZNÁNÍ</div><div style="font-weight:700">k dani z příjmů právnických osob</div>
      <div style="margin-top:4px">za zdaňovací období od <span class="box">01.01.${taxYear}</span> do <span class="box">31.12.${taxYear}</span></div></div>
      <div class="k">25 5404<br>MFin 5404<br><br>Daňové identifikační číslo<br><span class="box">CZ ${esc(ico)}</span><br>Typ přiznání: <span class="box">řádné</span> <span class="box">A</span><br>Typ poplatníka: <span class="box">3</span></div></div>
    <div class="sec">I. oddíl – Údaje o poplatníkovi</div>
    <div class="grid2">
      <div class="fld"><div class="l">01 Název poplatníka</div><div class="v">${esc(s.firm||'')}</div></div>
      <div class="fld"><div class="l">02 Identifikační číslo</div><div class="v">${esc(ico)}</div></div>
      <div class="fld"><div class="l">Sídlo</div><div class="v">${esc(s.address||'')}</div></div>
      <div class="fld"><div class="l">Typ poplatníka</div><div class="v">3 – veřejně prospěšný poplatník (§ 17a)</div></div>
      <div class="fld"><div class="l">Účetnictví</div><div class="v">jednoduché (vyhl. č. 325/2015 Sb.)</div></div>
      <div class="fld"><div class="l">Osoba oprávněná k podpisu</div><div class="v">${esc((ds.jmeno+' '+ds.prijmeni).trim()||'—')}${ds.postaveni?', '+esc(ds.postaveni):''}</div></div>
    </div>
    <div class="sec">II. oddíl – Daň z příjmů právnických osob</div>
    <table><tbody>${rowsHtml}</tbody></table>
    <div class="foot">Přílohy: Přehled o příjmech a výdajích a Přehled o majetku a závazcích (příloha č. 1 a 2 vyhlášky č. 325/2015 Sb.) – v EPO se vyplní jako elektronické přílohy, podklady jsou v záložce Formuláře. Daň je zaokrouhlena na celé koruny nahoru.</div>
  </div>
  ${isOwner()?`<details class="law"><summary style="cursor:pointer;font-weight:600">Údaje pro elektronické podání (finanční úřad, podepisující osoba)</summary>
   <div class="grid" style="margin-top:10px">
    <div class="f s3"><label for="dpUfo">Kód finančního úřadu</label><input id="dpUfo" value="${esc(ds.ufo)}"></div>
    <div class="f s3"><label for="dpPrac">Kód územního pracoviště (nepovinné)</label><input id="dpPrac" value="${esc(ds.pracufo)}"></div>
    <div class="f s3"><label for="dpNace">CZ-NACE hlavní činnosti (nepovinné)</label><input id="dpNace" value="${esc(ds.nace)}"></div>
    <div class="f s3"><label for="dpTel">Telefon (nepovinné)</label><input id="dpTel" value="${esc(ds.tel)}"></div>
    <div class="f s4"><label for="dpJm">Jméno podepisující osoby</label><input id="dpJm" value="${esc(ds.jmeno)}"></div>
    <div class="f s4"><label for="dpPr">Příjmení</label><input id="dpPr" value="${esc(ds.prijmeni)}"></div>
    <div class="f s4"><label for="dpPost">Postavení (např. starosta)</label><input id="dpPost" value="${esc(ds.postaveni)}"></div>
   </div><div class="actions"><button class="btn" type="button" id="dpSave">Uložit</button></div>
   <p class="note">460 = Finanční úřad pro Kraj Vysočina. Územní pracoviště doplníte, pokud ho znáte; jinak ho vyberete v EPO.</p></details>`:''}
  <div class="infobox"><b>Jak podat elektronicky:</b> 1) klikněte na <b>Export XML pro EPO</b>; 2) otevřete portál Moje daně → Elektronická podání (EPO) → <b>Načíst soubor</b> a vyberte stažený XML; 3) EPO formulář zkontroluje – doplňte případné chybějící údaje a v části přílohy vyplňte Přehled o příjmech a výdajích a Přehled o majetku a závazcích (čísla najdete v PDF v záložce Formuláře); 4) podejte přes datovou schránku sboru. XML odpovídá struktuře DPPDP9 zveřejněné Finanční správou; strukturu pro rok ${taxYear} Finanční správa každoročně aktualizuje, proto výsledek vždy zkontrolujte v EPO před odesláním.</div>
  <h3>Zařazení kategorií</h3>
  <p class="lead">Podle zařazení se počítají řádky formuláře. ${isOwner()?'Zařazení můžete změnit, uloží se pro všechny.':'Zařazení nastavuje správce.'}</p>
  <div class="xbox"><table class="mapt"><thead><tr><th>Kategorie</th><th style="text-align:right">Příjmy ${taxYear}</th><th style="text-align:right">Výdaje ${taxYear}</th><th>Zařazení pro daň</th></tr></thead><tbody>${catRows||'<tr><td colspan="4">Žádné zápisy</td></tr>'}</tbody></table></div>
  <p class="note">Výpočet nenahrazuje daňového poradce. Čísla řádků a XML odpovídají struktuře DPPDP9 zveřejněné Finanční správou.</p>`;
  $('taxYearSel').onchange=e=>{taxYear=e.target.value;renderTax()};
  el.querySelectorAll('select[data-cat]').forEach(sel=>sel.onchange=()=>{const m=Object.assign({},PK.settings.taxMap||{}); m[sel.dataset.cat]=sel.value; PK.saveSettings({taxMap:m}).then(()=>renderTax())});
  $('dpPdf').onclick=e=>runPdf(()=>docTax(taxYear),'priznani-DPPO-'+taxYear+'.pdf','download',e.currentTarget,'Přiznání k dani z příjmů PO');
  $('dpXml').onclick=()=>{orgInfo().then(()=>{downloadText(dpXml(taxYear),'DPPO_'+taxYear+'_'+ico+'.xml','application/xml');toastX('XML staženo – načtěte ho v EPO')})};
  const sv=$('dpSave'); if(sv)sv.onclick=()=>PK.saveSettings({dppo:{ufo:$('dpUfo').value.trim(),pracufo:$('dpPrac').value.trim(),nace:$('dpNace').value.trim(),tel:$('dpTel').value.trim(),jmeno:$('dpJm').value.trim(),prijmeni:$('dpPr').value.trim(),postaveni:$('dpPost').value.trim()}}).then(()=>{toastX('Uloženo');renderTax()});
  if(!regMini&&ico&&!window.__dpOrg){window.__dpOrg=1;orgInfo().then(()=>{if(tab==='tax'&&!(PK.settings.dppo&&PK.settings.dppo.jmeno))renderTax()})}
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
 ['inventura','Revizor kontroluje pokladní hotovost (podle stanov minimálně 2× ročně) a o kontrole je zápis se stavem hotovosti.'],
 ['revizor','Revizor sboru je zvolen valnou hromadou, není členem výboru (starosta, náměstek, velitel, hospodář ani jiný člen výboru revizorem být nemůže) a nevede účetnictví sboru.'],
 ['majetek','K 31. 12. proběhne inventarizace majetku a pokladní hotovosti.'],
 ['archiv','Doklady a knihy se archivují nejméně 5 let po skončení roku.'],
 ['provozovna','Klubovna (a stánek na akcích) je oznámena jako provozovna a označena názvem, IČO, odpovědnou osobou a prodejní dobou.'],
 ['hygiena','Obsluha občerstvení má zdravotní průkazy u sebe; stravovací služba je oznámena KHS/SZPI a dodržujeme hygienu (HACCP).'],
 ['alergeny','U jídla na akcích je písemně a viditelně uveden seznam alergenů a ceník.'],
 ['alkohol18','Na místě prodeje visí nápis o zákazu prodeje alkoholu osobám mladším 18 let (písmo min. 2 cm) a mladistvým se nenalévá.'],
 ['esm','Údaje v evidenci skutečných majitelů (esm.justice.cz) odpovídají aktuálnímu výboru.'],
 ['osa','Akce s hudbou jsou nahlášené OSA.']];
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
      <td class="nw"><button data-dpdf="${d.id}">Smlouva PDF</button>${isOwner()?`<button data-dedit="${d.id}">Upravit</button><button data-ddel="${d.id}" style="color:var(--exp)">Smazat</button>`:''}</td></tr>`}).join('');
    const open=L.reduce((s,d)=>s+debtCalc(d).rest,0);
    return `<h3>${kind==='z'?'Závazky – co sbor dluží':'Pohledávky – co dluží sboru'}</h3>
    <div class="xbox"><table class="astable"><thead><tr><th>${kind==='z'?'Věřitel':'Dlužník'} / předmět</th><th>Vznik</th><th>Splatnost</th><th style="text-align:right">Částka</th><th style="text-align:right">Uhrazeno</th><th style="text-align:right">Zbývá</th><th>Stav</th><th></th></tr></thead>
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
  <div class="actions" style="margin:0 0 6px"><button class="btn primary" type="button" id="zpPdf">Vytisknout knihu (PDF)</button><button class="btn" type="button" id="zpShare">Odeslat</button><button class="btn" type="button" id="loanBlank">Prázdná smlouva o zápůjčce</button></div>
  ${part('z')}${part('p')}${form}`;
  $('zpPdf').onclick=e=>runPdf(docZP,'kniha-pohledavek-a-zavazku.pdf','download',e.currentTarget,'Kniha pohledávek a závazků');
  $('zpShare').onclick=e=>runPdf(docZP,'kniha-pohledavek-a-zavazku.pdf','share',e.currentTarget,'Kniha pohledávek a závazků');
  $('loanBlank').onclick=e=>runPdf(()=>docLoan(''),'smlouva-o-zapujcce.pdf','download',e.currentTarget,'Smlouva o zápůjčce');
  el.querySelectorAll('[data-dpdf]').forEach(b=>b.onclick=()=>runPdf(()=>docLoan(b.dataset.dpdf),'smlouva-o-zapujcce-'+b.dataset.dpdf+'.pdf','download',b,'Smlouva o zápůjčce'));
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

/* ---------- formuláře ke stažení (PDF) ---------- */
let formYear=null, pdfP=null;
function loadPdfX(){if(window.pdfMake&&window.pdfMake.vfs)return Promise.resolve();if(pdfP)return pdfP;
  const ls=src=>new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s)});
  pdfP=ls('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js').then(()=>ls('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js')).catch(e=>{pdfP=null;throw e});return pdfP}
const kc=v=>money(v).replace(/\u202F/g,'\u00A0');
const tis=v=>String(Math.round((v||0)/1000));
function balanceAt(d){let b=+PK.settings.opening||0;PK.entries.forEach(e=>{if(e.date<=d)b+=e.type==='in'?e.amount:-e.amount});return b}
function balanceBefore(d){let b=+PK.settings.opening||0;PK.entries.forEach(e=>{if(e.date<d)b+=e.type==='in'?e.amount:-e.amount});return b}
function assetsAt(d){return PK.entries.filter(e=>e.type==='out'&&e.date<=d&&(e.asset===true||(e.asset!==false&&ASSET_CATS.includes(e.cat)&&e.amount>0)))}
function debtOpenAt(x,d){const born=!x.date||x.date<=d; if(!born)return 0; const paid=(x.links||[]).filter(l=>l.role==='uhrada').map(l=>entryById(l.id)).filter(e=>e&&e.date<=d).reduce((s,e)=>s+e.amount,0); return Math.max(0,(+x.amount||0)-paid-(+x.paidOther||0))}
let regMini=null;
async function orgInfo(){
  const s=PK.settings, ico=String(s.ico||'').replace(/\D/g,'');
  if(!regMini&&ico){try{const v=await (await fetch(ARES+'ekonomicke-subjekty-vr/'+ico)).json();const z=(v.zaznamy||[])[0]||{};const sz=(z.spisovaZnacka||[]).filter(x=>!x.datumVymazu)[0]||(z.spisovaZnacka||[])[0];
    regMini={spis:sz?(sz.oddil+' '+sz.vlozka+' vedená u '+(SOUD[sz.soud]||sz.soud)):'',ucel:((z.cinnosti&&z.cinnosti.ucel)||[]).filter(x=>!x.datumVymazu).map(x=>x.hodnota.split('\n')[0]).join(' ').slice(0,160),stat:(z.statutarniOrgany||[]).filter(x=>!x.datumVymazu).flatMap(g=>(g.clenoveOrganu||[]).filter(c=>!c.datumVymazu).map(c=>nm(c.fyzickaOsoba)+((c.clenstvi&&c.clenstvi.funkce&&c.clenstvi.funkce.nazev)?' ('+c.clenstvi.funkce.nazev+')':'')))}}catch(e){regMini={}}}
  return {name:s.firm||'',ico:s.ico||'',addr:s.address||'',keeper:s.keeper||'',spis:(regMini&&regMini.spis)||'',ucel:(regMini&&regMini.ucel)||'',stat:(regMini&&regMini.stat)||[]};
}
const ROWI=[['01','Prodej zboží'],['02','Prodej výrobků a služeb'],['03','Příjmy z veřejných sbírek'],['04','Přijaté peněžní dary mimo veřejné sbírky'],['05','Přijaté členské příspěvky'],['06','Dotace a příspěvky přijaté z veřejných rozpočtů'],['07','Ostatní'],['08','Průběžné položky'],['09','Kursové rozdíly']];
const ROWO=[['01','Dlouhodobý nehmotný a hmotný majetek'],['02','Materiál'],['03','Zboží'],['04','Služby'],['05','Mzdy'],['06','Pojistné za zaměstnance a zaměstnavatele'],['07','Ostatní osobní výdaje'],['08','Ostatní'],['09','Průběžné položky'],['10','Kursové rozdíly']];
function rowOf(e){const c=e.cat||'',g=groupOf(c);
  if(g==='pr')return e.type==='in'?'08':'09';
  if(e.type==='in'){if(c==='Tržba'||c==='Pivo'||c==='Nákupy občerstvení')return '01'; if(c==='Dary')return '04'; return '07'}
  if((c==='Vybavení klubovna'||c==='Vybavení hasiči')||e.asset===true)return e.amount>40000?'01':'02';
  if(c==='Pivo'||c==='Nákupy občerstvení')return '03'; if(c==='Tržba')return '03'; return '08';
}
function pvData(y){
  const E=PK.entries.filter(e=>e.date.startsWith(y)); const I={},O={};
  E.forEach(e=>{const r=rowOf(e),col=groupOf(e.cat||'')==='zd'?'h':'m',T=e.type==='in'?I:O;T[r]=T[r]||{m:0,h:0};T[r][col]+=e.amount});
  return {I,O};
}
const hdr=(o,title,sub)=>[{columns:[{stack:[{text:title,fontSize:16,bold:true},{text:sub,fontSize:9,color:'#444',margin:[0,2,0,0]}]},{width:'auto',alignment:'right',fontSize:8.5,stack:['Účetní jednotka:',{text:o.name,bold:true},'IČO: '+o.ico,o.addr,o.spis?'Spolkový rejstřík: '+o.spis:'']}]},{canvas:[{type:'line',x1:0,y1:6,x2:531,y2:6,lineWidth:1.2}],margin:[0,0,0,10]}];
const sign=(labels)=>({columns:labels.map(t=>({stack:[{text:' ',margin:[0,28,0,0]},{canvas:[{type:'line',x1:0,y1:0,x2:150,y2:0,lineWidth:0.6}]},{text:t,fontSize:8,margin:[0,3,0,0]}]})),columnGap:18,margin:[0,26,0,0],unbreakable:true});
const tbl=(widths,body,hr)=>({table:{headerRows:hr||1,widths,body},layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>'#888',vLineColor:()=>'#888',paddingTop:()=>3,paddingBottom:()=>3}});
const H=t=>({text:t,bold:true,fillColor:'#E9EEEC',fontSize:8.5});
const R=t=>({text:t,alignment:'right'});
async function docPV(y){const o=await orgInfo(),d=pvData(y);
  const sumI=c=>ROWI.reduce((s,[k])=>s+((d.I[k]||{})[c]||0),0), sumO=c=>ROWO.reduce((s,[k])=>s+((d.O[k]||{})[c]||0),0);
  const line=(k,t,T)=>{const v=T[k]||{m:0,h:0};return [k,t,R(tis(v.m)),R(tis(v.h)),R(tis(v.m+v.h))]};
  const body=[[H(''),H('Položka'),H('Hlavní činnost'),H('Hospodářská činnost'),H('Celkem')],[{text:'A.',bold:true},{text:'Příjmy',bold:true},'','','']];
  ROWI.forEach(([k,t])=>body.push(line(k,t,d.I)));
  body.push([{text:'10',bold:true},{text:'Příjmy celkem',bold:true},R(tis(sumI('m'))),R(tis(sumI('h'))),R(tis(sumI('m')+sumI('h')))]);
  body.push([{text:'B.',bold:true},{text:'Výdaje',bold:true},'','','']);
  ROWO.forEach(([k,t])=>body.push(line(k,t,d.O)));
  body.push([{text:'11',bold:true},{text:'Výdaje celkem',bold:true},R(tis(sumO('m'))),R(tis(sumO('h'))),R(tis(sumO('m')+sumO('h')))]);
  body.push([{text:'99',bold:true},{text:'Rozdíl příjmů a výdajů',bold:true},R(tis(sumI('m')-sumO('m'))),R(tis(sumI('h')-sumO('h'))),R(tis(sumI('m')+sumI('h')-sumO('m')-sumO('h')))]);
  return {pageSize:'A4',pageMargins:[32,32,32,36],defaultStyle:{fontSize:9},content:[...hdr(o,'Přehled o příjmech a výdajích','podle přílohy č. 1 vyhlášky č. 325/2015 Sb. · za účetní období 1. 1. – 31. 12. '+y+' · v tisících Kč'),
    o.ucel?{text:'Účel: '+o.ucel,fontSize:8,margin:[0,0,0,8]}:'',tbl([22,'*',80,80,70],body),
    {text:'Sestaveno dne: '+czDate(PK.today())+(y===String(new Date().getFullYear())?' (průběžný stav – účetní období ještě neskončilo)':''),fontSize:8.5,margin:[0,8,0,0]},
    sign(['Podpisový záznam statutárního orgánu','Sestavil (hospodář)'])]};}
async function docMZ(y){const o=await orgInfo(); const d0=y+'-01-01', d1=y+'-12-31'; const end=d1<PK.today()?d1:PK.today();
  const bank=(PK.settings.bank||{})[y]||{};
  const cash0=balanceBefore(d0), cash1=balanceAt(end);
  const as0=assetsAt(String(+y-1)+'-12-31'), as1=assetsAt(end);
  const dhm=a=>a.filter(e=>e.amount>40000).reduce((s,e)=>s+e.amount,0), ost=a=>a.filter(e=>e.amount<=40000).reduce((s,e)=>s+e.amount,0);
  const D=PK.settings.debts||[]; const loan=x=>/půjč|pujc|úvěr|uver|zápůjč/i.test((x.title||'')+(x.note||''));
  const dsum=(kind,isLoan,dt)=>D.filter(x=>x.kind===kind&&loan(x)===isLoan).reduce((s,x)=>s+debtOpenAt(x,dt),0);
  const dPrev=String(+y-1)+'-12-31';
  const A=[['01','Dlouhodobý nehmotný majetek',0,0],['02','Dlouhodobý hmotný majetek',dhm(as0),dhm(as1)],['03','Finanční majetek',0,0],['04','Peněžní prostředky v hotovosti a ceniny',cash0,cash1],['05','Peněžní prostředky na bankovních účtech',+bank.start||0,+bank.end||0],['06','Zásoby',0,0],['07','Pohledávky',dsum('p',false,dPrev),dsum('p',false,end)],['08','Úvěry a zápůjčky poskytnuté',dsum('p',true,dPrev),dsum('p',true,end)],['09','Ostatní majetek',ost(as0),ost(as1)]];
  const B=[['01','Závazky',dsum('z',false,dPrev),dsum('z',false,end)],['02','Úvěry a zápůjčky přijaté',dsum('z',true,dPrev),dsum('z',true,end)]];
  const sa0=A.reduce((s,r)=>s+r[2],0), sa1=A.reduce((s,r)=>s+r[3],0), sb0=B.reduce((s,r)=>s+r[2],0), sb1=B.reduce((s,r)=>s+r[3],0);
  const body=[[H(''),H('Položka'),H('K prvnímu dni účetního období'),H('K poslednímu dni účetního období')],[{text:'A.',bold:true},{text:'Majetek',bold:true},'','']];
  A.forEach(r=>body.push([r[0],r[1],R(tis(r[2])),R(tis(r[3]))]));
  body.push([{text:'10',bold:true},{text:'Majetek celkem',bold:true},R(tis(sa0)),R(tis(sa1))],[{text:'B.',bold:true},{text:'Závazky',bold:true},'','']);
  B.forEach(r=>body.push([r[0],r[1],R(tis(r[2])),R(tis(r[3]))]));
  body.push([{text:'03',bold:true},{text:'Závazky celkem',bold:true},R(tis(sb0)),R(tis(sb1))],[{text:'99',bold:true},{text:'Rozdíl majetku a závazků',bold:true},R(tis(sa0-sb0)),R(tis(sa1-sb1))]);
  return {pageSize:'A4',pageMargins:[32,32,32,36],defaultStyle:{fontSize:9},content:[...hdr(o,'Přehled o majetku a závazcích','podle přílohy č. 2 vyhlášky č. 325/2015 Sb. · k '+czDate(end)+' · v tisících Kč'),
    o.ucel?{text:'Účel: '+o.ucel,fontSize:8,margin:[0,0,0,8]}:'',tbl([22,'*',110,110],body),
    {text:'Hotovost k prvnímu dni: '+kc(cash0)+' · k poslednímu dni: '+kc(cash1)+'. Majetek v pořizovacích cenách podle knihy majetku (nad 40 000 Kč ř. 02, ostatní ř. 09). Bankovní účty podle zadání v aplikaci.',fontSize:8,margin:[0,8,0,0],color:'#444'},
    {text:'Sestaveno dne: '+czDate(PK.today()),fontSize:8.5,margin:[0,6,0,0]},sign(['Podpisový záznam statutárního orgánu','Sestavil (hospodář)'])]};}
async function docKM(y){const o=await orgInfo(); const end=(y+'-12-31')<PK.today()?y+'-12-31':PK.today(); const A=assetsAt(end).sort((a,b)=>a.date<b.date?-1:1);
  const body=[[H('Inv. č.'),H('Datum pořízení'),H('Popis'),H('Doklad'),H('Cena'),H('Druh'),H('Skutečnost')]];
  A.forEach((e,i)=>body.push(['M-'+String(i+1).padStart(3,'0'),czDate(e.date),(e.text||'').slice(0,70),e.doc||'',R(kc(e.amount)),e.amount>40000?'DHM':'drobný',' ']));
  if(!A.length)body.push([{text:'Žádný majetek v evidenci',colSpan:7,alignment:'center'},'','','','','','']);
  body.push([{text:'Celkem',colSpan:4,bold:true},'','','',R(kc(A.reduce((s,e)=>s+e.amount,0))),'','']);
  return {pageSize:'A4',pageOrientation:'landscape',pageMargins:[30,30,30,34],defaultStyle:{fontSize:8.5},content:[...hdr(o,'Inventurní soupis majetku','pomocná kniha o ostatních složkách majetku (§ 13b zákona o účetnictví) · stav k '+czDate(end)),
    tbl([44,58,'*',62,70,44,70],body),{text:'Sloupec „Skutečnost“ vyplní inventarizační komise při fyzické kontrole (ano / chybí / poškozeno).',fontSize:8,margin:[0,6,0,0],color:'#444'},
    sign(['Předseda inventarizační komise','Člen komise','Hospodář'])]};}
async function docRev(){const o=await orgInfo(); const t=PK.today(); const book=balanceAt(t);
  const E=PK.entries.filter(e=>e.date<=t); const lastOf=ty=>{const L=E.filter(e=>e.type===ty).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.created||0)-(a.created||0));return L[0]?L[0].doc+' ze dne '+czDate(L[0].date):'—'};
  const den=[5000,2000,1000,500,200,100,50,20,10,5,2,1];
  const body=[[H('Nominál'),H('Počet kusů'),H('Částka')]].concat(den.map(n=>[n.toLocaleString('cs-CZ')+' Kč',' ',' ']));
  body.push([{text:'Skutečný stav celkem',bold:true,colSpan:2},'',' ']);
  return {pageSize:'A4',pageMargins:[36,32,36,36],defaultStyle:{fontSize:9.5},content:[...hdr(o,'Zápis o kontrole pokladní hotovosti','revize pokladny sboru dobrovolných hasičů'),
    {columns:[{stack:['Datum a čas kontroly: ____________________','Místo: ____________________']},{stack:[{text:['Stav podle pokladní knihy k '+czDate(t)+': ',{text:kc(book),bold:true}]},'Poslední příjmový doklad: '+lastOf('in'),'Poslední výdajový doklad: '+lastOf('out')]}],columnGap:20,margin:[0,0,0,12]},
    {columns:[{width:260,...tbl([90,80,80],body)},{stack:[{text:'Výsledek',bold:true,margin:[0,0,0,6]},'Stav podle knihy: '+kc(book),'Skutečný stav: ____________________','Rozdíl (+ přebytek / − schodek): ____________',{text:'Kontrolované doklady (od – do): __________________________',margin:[0,10,0,0]},'Zápisy v knize odpovídají dokladům:  ano  /  ne',{text:'Zjištění a opatření:',margin:[0,10,0,2]},'_____________________________________________','_____________________________________________','_____________________________________________',{text:'Vyjádření pokladníka:',margin:[0,10,0,2]},'_____________________________________________','_____________________________________________']}],columnGap:22},
    sign(['Revizor sboru','Pokladník / hospodář'+(o.keeper?' ('+o.keeper+')':''),'Starosta sboru (seznámen)']),
    {text:'Revizor nesmí být členem výboru sboru ani vést jeho účetnictví. Kontrola se provádí minimálně 2× ročně (čl. 16 stanov SH ČMS); zápis se ukládá k pokladní knize.',fontSize:8,color:'#555',margin:[0,14,0,0]}]};}
async function docTax(y){const o=await orgInfo(); const D=dppo(y),R=D.R,ds=dpSettings(),ico=String(o.ico||'').replace(/\D/g,'');
  const box=t=>({text:' '+t+' ',bold:true,font:'Roboto',background:'#ffffff'});
  const body=[[{text:'Ř.',bold:true,fillColor:'#dde3e6',alignment:'center'},{text:'II. ODDÍL – DAŇ Z PŘÍJMŮ PRÁVNICKÝCH OSOB',bold:true,fillColor:'#dde3e6'},{text:'Kč',bold:true,fillColor:'#dde3e6',alignment:'right'}]].concat(DP_ROWS.map(([r,t,sub])=>{const off=D.loss&&r>=230&&r<=330; const hl=[200,220,270,290,340].includes(r);
    return [{text:String(r),bold:true,alignment:'center',fillColor:'#f2f4f5'},{stack:[{text:t,fontSize:8.5},sub?{text:sub,fontSize:7,color:'#555'}:'']},{text:off?'':(r===280?'21':fmtKc(R[r]||0)),alignment:'right',bold:true,fillColor:hl?'#eef3ff':null}]}));
  return {pageSize:'A4',pageMargins:[30,28,30,34],defaultStyle:{fontSize:9},content:[
    {table:{widths:['*',150],body:[[{stack:[{text:'Finančnímu úřadu pro '+(ds.ufo==='460'?'Kraj Vysočina':'(kód '+ds.ufo+')'),fontSize:8},{text:'PŘIZNÁNÍ',fontSize:20,bold:true,margin:[0,2,0,0]},{text:'k dani z příjmů právnických osob',bold:true},{text:'za zdaňovací období od 01.01.'+y+' do 31.12.'+y,margin:[0,4,0,0]}]},{stack:[{text:'25 5404 · MFin 5404',fontSize:7.5},{text:'Daňové identifikační číslo',fontSize:7.5,margin:[0,6,0,0]},{text:'CZ '+ico,bold:true,fontSize:12},{text:'Řádné přiznání · typ A · poplatník typu 3',fontSize:7.5,margin:[0,4,0,0]}],alignment:'right'}]]},layout:{hLineWidth:()=>1.5,vLineWidth:()=>1.5}},
    {text:'I. ODDÍL – ÚDAJE O POPLATNÍKOVI',bold:true,fillColor:'#dde3e6',margin:[0,8,0,3]},
    {table:{widths:['*','*'],body:[[{stack:[{text:'01 Název poplatníka',fontSize:7,color:'#444'},{text:o.name,bold:true}]},{stack:[{text:'02 Identifikační číslo',fontSize:7,color:'#444'},{text:ico,bold:true}]}],[{stack:[{text:'Sídlo',fontSize:7,color:'#444'},{text:o.addr,bold:true}]},{stack:[{text:'Typ poplatníka',fontSize:7,color:'#444'},{text:'3 – veřejně prospěšný poplatník (§ 17a)',bold:true}]}],[{stack:[{text:'Účetnictví',fontSize:7,color:'#444'},{text:'jednoduché (vyhláška č. 325/2015 Sb.)',bold:true}]},{stack:[{text:'Osoba oprávněná k podpisu',fontSize:7,color:'#444'},{text:((ds.jmeno+' '+ds.prijmeni).trim()||'—')+(ds.postaveni?', '+ds.postaveni:''),bold:true}]}]]},layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>'#888',vLineColor:()=>'#888'}},
    {text:' ',margin:[0,4,0,0]},
    {table:{headerRows:1,widths:[30,'*',100],body},layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>'#888',vLineColor:()=>'#888',paddingTop:()=>2.5,paddingBottom:()=>2.5}},
    {text:'Přílohy: Přehled o příjmech a výdajích a Přehled o majetku a závazcích (příl. č. 1 a 2 vyhl. č. 325/2015 Sb.). Přiznání se podává elektronicky do '+deadline(y)+' (Moje daně / EPO, datová schránka). Tento výtisk je podklad vyplněný z pokladní knihy, nikoli úřední tiskopis.',fontSize:7.5,color:'#444',margin:[0,6,0,0]},
    sign(['Datum','Podpis osoby oprávněné k podpisu'])]};}
function taxCalc(y){
  const E=PK.entries.filter(e=>e.date.startsWith(y)); const g={zd:{i:0,o:0},hl:{i:0,o:0},os:{i:0,o:0},pr:{i:0,o:0}};
  E.forEach(e=>{g[groupOf(e.cat||'')][e.type==='in'?'i':'o']+=e.amount});
  const inc=g.zd.i+g.hl.i+g.os.i,out=g.zd.o+g.hl.o+g.os.o,r10=inc-out,hlLoss=g.hl.o>=g.hl.i,r40=(hlLoss?g.hl.o:0)+g.os.o,r101=hlLoss?g.hl.i:0,r110=g.os.i,r200=r10+r40-r101-r110,base=Math.max(0,r200);
  const r251=base>0?Math.min(base,Math.max(Math.min(base*0.3,1000000),300000)):0,r270=Math.max(0,Math.floor((base-r251)/1000)*1000),r290=Math.round(r270*0.21);
  return {rows:[['10','Rozdíl mezi příjmy a výdaji',kc(r10)],['40','Výdaje, které nejsou daňovými výdaji',kc(r40)],['101','Příjmy, které nejsou předmětem daně (§ 18a)',kc(r101)],['110','Příjmy osvobozené od daně',kc(r110)],['200','Základ daně / ztráta',kc(r200)],['251','Snížení základu daně podle § 20 odst. 7',kc(r251)],['270','Základ daně zaokrouhlený na tisíce dolů',kc(r270)],['280','Sazba daně','21 %'],['290','Daň',kc(r290)]],
    note:'Zdaňovaná (hospodářská) činnost: příjmy '+kc(g.zd.i)+', výdaje '+kc(g.zd.o)+'. Hlavní činnost: příjmy '+kc(g.hl.i)+', výdaje '+kc(g.hl.o)+'. Průběžné položky se nezapočítávají. Čísla řádků ověřte s aktuálním vzorem tiskopisu.'};
}
const FORMS=[['pv','Přehled o příjmech a výdajích','Výkaz pro finanční úřad (příloha k přiznání) a do sbírky listin. Vyplní se sám z pokladní knihy.',docPV,true],
 ['mz','Přehled o majetku a závazcích','Povinný výkaz pro finanční úřad a sbírku listin. Hotovost, majetek a závazky k začátku a konci roku.',docMZ,true],
 ['km','Inventurní soupis majetku','Kniha majetku k inventuře k 31. 12. se sloupcem pro fyzickou kontrolu a podpisy komise.',docKM,true],
 ['rev','Zápis o kontrole pokladní hotovosti','Revize pokladny k podpisu revizorem. Stav podle knihy se doplní sám, skutečný stav se spočítá na místě.',docRev,false],
 ['tax','Podklad pro daňové přiznání (DPPO)','Vyplněné řádky přiznání k dani z příjmů pro přepis na portálu Moje daně.',docTax,true],
 ['zp','Kniha pohledávek a závazků','Přehled půjček a dluhů sboru s úhradami, stav k dnešnímu dni (§ 13b zákona o účetnictví).',()=>docZP(),false]];
async function makeForm(key,mode,btn){
  const f=FORMS.find(x=>x[0]===key); const lbl=btn.textContent; btn.disabled=true; btn.textContent='Připravuji…';
  try{await loadPdfX(); const dd=await f[3](formYear); const name=key+'-'+(f[4]?formYear:PK.today())+'-SDH.pdf';
    const blob=await new Promise(ok=>pdfMake.createPdf(dd).getBlob(ok)); const file=new File([blob],name,{type:'application/pdf'});
    if(mode==='share'&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:f[1],text:f[1]+' – '+(PK.settings.firm||'')});return}catch(e){if(e&&e.name==='AbortError')return}}
    if(mode==='view'){window.open(URL.createObjectURL(file),'_blank');return}
    const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();a.remove();
    if(mode==='share')toastX('Sdílení tu není dostupné, PDF se stáhlo – přiložte ho k e-mailu.');
  }catch(e){console.error(e);toastX('PDF se nepodařilo vytvořit.')}finally{btn.disabled=false;btn.textContent=lbl}
}
function renderForms(){
  const el=$('tabForms'); const ys=years(); if(!formYear||!ys.includes(formYear))formYear=ys.includes('2026')?'2026':ys[0];
  const bank=((PK.settings.bank||{})[formYear])||{};
  const zd=PK.entries.filter(e=>e.date.startsWith(formYear)&&e.type==='in'&&groupOf(e.cat||'')==='zd').reduce((s,e)=>s+e.amount,0);
  el.innerHTML=`<h2>Formuláře ke stažení</h2>
  <p class="lead">Všechny formuláře se vyplní samy z aktuálních dat v aplikaci. Stáhnete je jako PDF, na mobilu je můžete rovnou poslat (e-mail, WhatsApp, datová schránka přes aplikaci) tlačítkem Odeslat.</p>
  <div class="yrsel">${yearSel('formYearSel',formYear)}
  ${isOwner()?`<div class="f"><label for="bank0">Bankovní účet k 1. 1. ${formYear} (Kč)</label><input id="bank0" inputmode="decimal" value="${bank.start||''}" placeholder="0"></div><div class="f"><label for="bank1">Bankovní účet k 31. 12. ${formYear} (Kč)</label><input id="bank1" inputmode="decimal" value="${bank.end||''}" placeholder="0"></div><button class="btn" id="bankSave" type="button">Uložit</button>`:''}</div>
  ${FORMS.map(([k,t,d])=>`<div class="law" style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div style="flex:1;min-width:240px"><h4 style="margin-bottom:2px">${t}</h4><div style="font-size:14px;color:var(--muted)">${d}</div></div>
   <div class="actions" style="margin:0"><button class="btn" type="button" data-form="${k}" data-mode="view">Zobrazit</button><button class="btn primary" type="button" data-form="${k}" data-mode="download">Stáhnout PDF</button><button class="btn" type="button" data-form="${k}" data-mode="share">Odeslat</button></div></div>`).join('')}
  <div class="law" style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div style="flex:1;min-width:240px"><h4 style="margin-bottom:2px">Smlouva o zápůjčce (půjčka)</h4><div style="font-size:14px;color:var(--muted)">Vyplní se podle záznamu v záložce Závazky a pohledávky, nebo prázdná k ručnímu vyplnění. Obsahuje i potvrzení o vrácení.</div>
   <select id="loanSel" style="margin-top:8px;max-width:420px"><option value="">Prázdná smlouva</option>${debtsAll().map(d=>`<option value="${d.id}">${esc((d.kind==='z'?'Sbor si půjčil od: ':'Sbor půjčil: ')+(d.party||'')+' – '+PK.money(d.amount))}</option>`).join('')}</select></div>
   <div class="actions" style="margin:0"><button class="btn" type="button" data-loan="view">Zobrazit</button><button class="btn primary" type="button" data-loan="download">Stáhnout PDF</button><button class="btn" type="button" data-loan="share">Odeslat</button></div></div>
  <div class="infobox"><b>DPH:</b> sbor není plátcem DPH, formulář k DPH se nepodává. Plátcem by se stal až při obratu nad 2 000 000 Kč za kalendářní rok (zdaňované příjmy ${formYear}: ${money(zd)}).</div>
  <div class="infobox"><b>Jak odeslat na finanční úřad:</b> přiznání k dani z příjmů se podává elektronicky přes portál <a href="https://www.mojedane.cz" target="_blank" rel="noopener">Moje daně</a> (přihlášení datovou schránkou sboru). Údaje z „Podkladu pro daňové přiznání“ přepíšete do formuláře a oba přehledy (o příjmech a výdajích, o majetku a závazcích) nahrajete jako přílohy v PDF. Přehledy se také ukládají do sbírky listin spolkového rejstříku. Zápis o revizi pokladny a inventurní soupis se nikam neposílají – podepsané se ukládají k účetnictví.</div>
  <p class="note">Výkazy jsou v tisících Kč podle vyhlášky č. 325/2015 Sb. Před podpisem je zkontrolujte; aplikace nenahrazuje účetní ani daňového poradce.</p>`;
  $('formYearSel').onchange=e=>{formYear=e.target.value;renderForms()};
  el.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>makeForm(b.dataset.form,b.dataset.mode,b));
  el.querySelectorAll('[data-loan]').forEach(b=>b.onclick=()=>{const id=$('loanSel').value;runPdf(()=>docLoan(id),'smlouva-o-zapujcce'+(id?'-'+id:'')+'.pdf',b.dataset.loan,b,'Smlouva o zápůjčce')});
  const bs=$('bankSave'); if(bs)bs.onclick=()=>{const m=Object.assign({},PK.settings.bank||{});m[formYear]={start:parseFloat(String($('bank0').value).replace(',','.'))||0,end:parseFloat(String($('bank1').value).replace(',','.'))||0};PK.saveSettings({bank:m}).then(()=>toastX('Uloženo'))};
}

/* ---------- kniha závazků a pohledávek + smlouva o zápůjčce (PDF) ---------- */
async function runPdf(build,name,mode,btn,title){
  const lbl=btn.textContent; btn.disabled=true; btn.textContent='Připravuji…';
  try{await loadPdfX(); const dd=await build(); const blob=await new Promise(ok=>pdfMake.createPdf(dd).getBlob(ok)); const file=new File([blob],name,{type:'application/pdf'});
    if(mode==='share'&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title});return}catch(e){if(e&&e.name==='AbortError')return}}
    if(mode==='view'){window.open(URL.createObjectURL(file),'_blank');return}
    const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();a.remove();
    if(mode==='share')toastX('Sdílení tu není dostupné, PDF se stáhlo.');
  }catch(e){console.error(e);toastX('PDF se nepodařilo vytvořit.')}finally{btn.disabled=false;btn.textContent=lbl}
}
async function docZP(){const o=await orgInfo(); const t=PK.today(); const D=debtsAll();
  const sec=kind=>{const L=D.filter(d=>d.kind===kind);
    const body=[[H(kind==='z'?'Věřitel':'Dlužník'),H('Předmět / doklad'),H('Vznik'),H('Splatnost'),H('Částka'),H('Uhrazeno'),H('Zbývá'),H('Stav')]];
    L.forEach(d=>{const c=debtCalc(d); const pays=c.links.map(l=>(l.role==='vznik'?'vznik ':'úhrada ')+(l.e.doc||'')+' '+czDate(l.e.date)+' '+kc(l.e.amount)).join('\n');
      body.push([d.party||'',{text:[(d.title||''),d.docRef?'\nDoklad: '+d.docRef:'',pays?'\n'+pays:''].join(''),fontSize:8},d.date?czDate(d.date):'—',d.due?czDate(d.due):'—',R(kc(d.amount)),R(kc(c.paid)),R(kc(c.rest)),c.state])});
    if(!L.length)body.push([{text:'Žádné záznamy',colSpan:8,alignment:'center',color:'#666'},'','','','','','','']);
    const open=L.reduce((s,d)=>s+debtCalc(d).rest,0);
    return [{text:kind==='z'?'Závazky – co sbor dluží':'Pohledávky – co dluží sboru',bold:true,fontSize:11,margin:[0,8,0,4]},tbl([90,'*',52,52,62,62,62,58],body),{text:'Neuhrazeno celkem: '+kc(open),alignment:'right',bold:true,margin:[0,4,0,0]}]};
  return {pageSize:'A4',pageOrientation:'landscape',pageMargins:[30,30,30,34],defaultStyle:{fontSize:8.5},content:[...hdr(o,'Kniha pohledávek a závazků','§ 13b zákona č. 563/1991 Sb. · stav k '+czDate(t)),...sec('z'),...sec('p'),sign(['Sestavil (hospodář)','Kontroloval (revizor)','Starosta'])]};}
function slovy(n){n=Math.round(n);if(!n)return 'nula';const j=['','jedna','dva','tři','čtyři','pět','šest','sedm','osm','devět','deset','jedenáct','dvanáct','třináct','čtrnáct','patnáct','šestnáct','sedmnáct','osmnáct','devatenáct'],d=['','','dvacet','třicet','čtyřicet','padesát','šedesát','sedmdesát','osmdesát','devadesát'],s=['','sto','dvě stě','tři sta','čtyři sta','pět set','šest set','sedm set','osm set','devět set'];
  const do999=x=>{const h=Math.floor(x/100),r=x%100;return [s[h],r<20?j[r]:(d[Math.floor(r/10)]+(r%10?' '+j[r%10]:''))].filter(Boolean).join(' ')};
  const mil=Math.floor(n/1e6),tis=Math.floor(n/1000)%1000,zb=n%1000; const p=[];
  if(mil)p.push(mil===1?'jeden milion':(mil<5?do999(mil).replace(/^dva$/,'dva')+' miliony':do999(mil)+' milionů'));
  if(tis)p.push(tis===1?'tisíc':(tis<5?do999(tis).replace(/dva$/,'dva')+' tisíce':do999(tis)+' tisíc'));
  if(zb)p.push(do999(zb)); return p.join(' ').replace(/\s+/g,' ').trim()}
async function docLoan(id){const o=await orgInfo(); const d=id?debtsAll().find(x=>x.id===id):null; const blank='______________________________';
  const sbor=[{text:o.name||'SDH',bold:true},'IČO: '+(o.ico||''),'se sídlem: '+(o.addr||''),o.spis?'zapsaný ve spolkovém rejstříku pod sp. zn. '+o.spis:'',{text:'zastoupený: '+((o.stat&&o.stat.length)?o.stat.join(', '):blank),margin:[0,0,0,0]}];
  const druha=[{text:(d&&d.party)||blank,bold:true},'datum narození / IČO: '+blank,'bydliště / sídlo: '+blank];
  const sborZap=d&&d.kind==='p'; // pohledávka = sbor půjčuje
  const zap=sborZap?sbor:druha, vyd=sborZap?druha:sbor;
  const amt=d?kc(d.amount):blank, amtW=d?slovy(d.amount)+' korun českých':blank;
  const pays=d?debtCalc(d).links:[];
  const art=(n,t,paras)=>[{text:n+'\n'+t,bold:true,alignment:'center',margin:[0,10,0,4]},...paras.map(p=>({text:p,margin:[0,0,0,4],alignment:'justify'}))];
  return {pageSize:'A4',pageMargins:[50,40,50,44],defaultStyle:{fontSize:10,lineHeight:1.15},content:[
    {text:'SMLOUVA O ZÁPŮJČCE',fontSize:18,bold:true,alignment:'center'},
    {text:'uzavřená podle § 2390 a násl. zákona č. 89/2012 Sb., občanský zákoník',alignment:'center',fontSize:9,margin:[0,2,0,14]},
    {text:'Smluvní strany',bold:true,margin:[0,0,0,4]},
    {columns:[{stack:[{text:'Zapůjčitel:',italics:true},...zap]},{stack:[{text:'Vydlužitel:',italics:true},...vyd]}],columnGap:24,fontSize:9.5},
    ...art('I.','Předmět smlouvy',['1. Zapůjčitel přenechává vydlužiteli peněžní prostředky ve výši '+amt+' (slovy: '+amtW+') a vydlužitel se zavazuje vrátit zapůjčiteli peněžní prostředky téhož druhu a ve stejné výši za podmínek této smlouvy.','2. Účel zápůjčky: '+((d&&d.title)||blank)+'.']),
    ...art('II.','Předání peněžních prostředků',['1. Peněžní prostředky byly / budou předány dne '+((d&&d.date)?czDate(d.date):'__________')+'  [  ] v hotovosti při podpisu této smlouvy   [  ] převodem na účet č. ____________________.','2. Při předání v hotovosti vydlužitel podpisem této smlouvy potvrzuje jejich převzetí. Na straně sboru se přijetí i vrácení zápůjčky zapisuje do pokladní knihy jako průběžná položka a do knihy pohledávek a závazků.']),
    ...art('III.','Úrok',['1. Zápůjčka je bezúročná, pokud se strany písemně nedohodnou jinak.']),
    ...art('IV.','Vrácení zápůjčky',['1. Vydlužitel vrátí zápůjčku nejpozději do '+((d&&d.due)?czDate(d.due):'__________')+'  [  ] jednorázově   [  ] ve splátkách: ________________________________.','2. Vrácení proběhne v hotovosti proti písemnému potvrzení nebo převodem na účet zapůjčitele. Vydlužitel je oprávněn zápůjčku vrátit i předčasně.']),
    ...art('V.','Závěrečná ustanovení',['1. Práva a povinnosti neupravené touto smlouvou se řídí občanským zákoníkem.','2. Smlouva je vyhotovena ve dvou stejnopisech, každá strana obdrží jeden. Smlouva nabývá platnosti a účinnosti dnem podpisu oběma stranami.','3. Uzavření smlouvy na straně sboru schválil výbor SDH dne __________ (usnesení č. ______).','4. Strany prohlašují, že smlouvu uzavírají svobodně a vážně, přečetly ji a souhlasí s jejím obsahem.']),
    {text:'V ________________ dne ______________',margin:[0,16,0,0]},
    {columns:[{stack:[{text:' ',margin:[0,30,0,0]},{canvas:[{type:'line',x1:0,y1:0,x2:200,y2:0,lineWidth:0.6}]},{text:'Zapůjčitel',fontSize:9,margin:[0,3,0,0]}]},{stack:[{text:' ',margin:[0,30,0,0]},{canvas:[{type:'line',x1:0,y1:0,x2:200,y2:0,lineWidth:0.6}]},{text:'Vydlužitel',fontSize:9,margin:[0,3,0,0]}]}],columnGap:40,unbreakable:true},
    {text:'Potvrzení o vrácení zápůjčky',bold:true,margin:[0,26,0,4],pageBreak:'before'},
    tbl([90,'*',110,130],[[H('Datum'),H('Doklad v pokladní knize'),H('Vrácená částka'),H('Podpis zapůjčitele')]].concat(pays.filter(l=>l.role==='uhrada').map(l=>[czDate(l.e.date),l.e.doc||'',R(kc(l.e.amount)),' '])).concat([[' ',' ',' ',' '],[' ',' ',' ',' '],[' ',' ',' ',' ']])),
    {text:'Zapůjčitel podpisem potvrzuje převzetí vrácené částky. Po úplném vrácení zápůjčky potvrzuje, že vůči vydlužiteli již nemá z této smlouvy žádné nároky.',fontSize:9,margin:[0,8,0,0]},
    {text:'Pozn.: vzor smlouvy je pomůcka; u vyšších částek nebo zvláštních podmínek doporučujeme konzultaci s právníkem.',fontSize:8,color:'#666',margin:[0,14,0,0]}]};}

/* ---------- zákony a předpisy ---------- */
function lawsHTML(){
  const L=(title,url,items,note)=>`<div class="law"><h4><a href="${url}" target="_blank" rel="noopener">${title}</a></h4><ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>${note?`<p style="margin:8px 0 0;font-size:13.5px;color:var(--muted)">${note}</p>`:''}</div>`;
  const S=t=>`<h3>${t}</h3>`;
  return `
  <h2>Zákony a předpisy pro SDH Vlkov</h2>
  <p class="lead">Přehled platných předpisů, podle kterých sbor hospodaří a provozuje své živnosti. Obsah byl ověřen k 27. 10. 2026. Odkazy vedou na aktuální znění. Jde o informativní přehled sestavený z veřejných zdrojů; nenahrazuje právníka ani daňového poradce.</p>
  <div class="infobox"><b>Sbor v kostce:</b> pobočný spolek SH ČMS (IČO 65758048), spolkový rejstřík L 31552 u Městského soudu v Praze. Aktivní živnosti: <b>hostinská činnost</b> (řemeslná, odpovědný zástupce Zdeněk Musil), <b>výroba, obchod a služby – velkoobchod a maloobchod</b> (volná) a <b>prodej kvasného lihu, konzumního lihu a lihovin</b> (koncesovaná). Z toho plynou povinnosti nejen účetní a daňové, ale i hygienické, k prodeji alkoholu a k provozovnám.</div>

  ${S('1. Spolek a jeho fungování')}
  ${L('Zákon č. 89/2012 Sb., občanský zákoník','https://www.zakonyprolidi.cz/cs/2012-89',[
    '<b>§ 214 a násl.</b> – spolek je právnická osoba založená ke společnému naplňování zájmů členů; řídí se stanovami.',
    '<b>§ 217</b> – vedle hlavní činnosti smí spolek provozovat vedlejší hospodářskou činnost (u sboru občerstvení a prodej na akcích); zisk lze použít jen na spolkovou činnost.',
    '<b>§ 228 a násl.</b> – pobočný spolek. SDH je pobočným spolkem SH ČMS s vlastní právní osobností a sám odpovídá za své hospodaření.'])}
  ${L('Stanovy a vnitřní předpisy SH ČMS','https://www.dh.cz',[
    'Stanovy SH ČMS, organizační, jednací a volební řád a směrnice o hospodaření jsou pro sbor závazné.',
    'Revizora volí a odvolává valná hromada sboru; na jednání výboru má jen hlas poradní.',
    'Revizor nesmí být členem výkonného ani statutárního orgánu na žádném stupni a nesmí zpracovávat účetnictví sboru – revizorem tedy nemůže být starosta, jiný člen výboru ani ten, kdo vede účetnictví sboru (čl. 14 stanov).',
    'Revizor kontroluje hospodaření včetně pokladní hotovosti podle plánu kontrolní činnosti, minimálně 2× ročně, a o kontrole sepíše zápis (čl. 16 stanov; formulář je v záložce Formuláře).'])}
  ${L('Zákon č. 37/2021 Sb., o evidenci skutečných majitelů','https://www.zakonyprolidi.cz/cs/2021-37',[
    'Spolek je evidující osobou – musí mít v evidenci skutečných majitelů zapsané správné údaje (u spolků zpravidla členové statutárního orgánu).',
    'Při žádosti o dotaci ze státního rozpočtu musí spolek předložit jako povinnou přílohu úplný výpis z evidence skutečných majitelů.',
    'Kontrola zápisu: <a href="https://esm.justice.cz" target="_blank" rel="noopener">esm.justice.cz</a>. Po změně ve výboru ověřte, že se údaje propsaly.'])}
  ${L('Zákon č. 304/2013 Sb., o veřejných rejstřících','https://www.zakonyprolidi.cz/cs/2013-304',[
    'Změny ve výboru (starosta, náměstek) a stanovách se zapisují do spolkového rejstříku.',
    '<b>§ 66</b> – do sbírky listin se ukládá účetní závěrka; spolek s jednoduchým účetnictvím ukládá přehled o majetku a závazcích. Za nesplnění hrozí po výzvě soudu pořádková pokuta.'])}
  ${L('Ochrana osobních údajů – nařízení (EU) 2016/679 (GDPR) a zákon č. 110/2019 Sb.','https://www.zakonyprolidi.cz/cs/2019-110',[
    'Evidence členů, kontakty a fotografie z akcí jsou osobní údaje. Sbírejte jen potřebné údaje, chraňte je a nesdílejte je bez důvodu.',
    'Přístupové údaje do této aplikace nepředávejte mimo sbor.'])}

  ${S('2. Účetnictví a pokladna')}
  ${L('Zákon č. 563/1991 Sb., o účetnictví','https://www.zakonyprolidi.cz/cs/1991-563',[
    '<b>§ 1f</b> – spolek smí vést jednoduché účetnictví, pokud není plátcem DPH, jeho celkové příjmy za poslední uzavřené období nepřesáhly 3 000 000 Kč a hodnota majetku nepřesahuje 3 000 000 Kč.',
    '<b>§ 13b</b> – účetní knihy v jednoduchém účetnictví: peněžní deník (tato pokladní kniha), kniha pohledávek a závazků a pomocné knihy o ostatních složkách majetku (záložky Závazky a pohledávky a Majetek).',
    '<b>§ 11</b> – každý zápis musí mít účetní doklad: označení, obsah, účastníky, částku, datum vyhotovení a uskutečnění a podpis odpovědné osoby.',
    '<b>§ 29 a § 30</b> – inventarizace majetku, závazků a pokladní hotovosti nejméně jednou ročně k 31. 12.',
    '<b>§ 31</b> – účetní záznamy a doklady se archivují nejméně 5 let po skončení účetního období.'])}
  ${L('Vyhláška č. 325/2015 Sb., pro jednotky vedoucí jednoduché účetnictví','https://www.zakonyprolidi.cz/cs/2015-325',[
    'Peněžní deník: chronologické zápisy, členění příjmů a výdajů podle druhu (kategorie), průběžné položky (zálohy, převody, půjčky) zvlášť, zůstatky na začátku a konci období.',
    '<b>Příloha č. 1</b> – přehled o příjmech a výdajích v členění na hlavní a hospodářskou činnost (v tisících Kč).',
    '<b>Příloha č. 2</b> – přehled o majetku a závazcích k prvnímu a poslednímu dni účetního období (v tisících Kč).',
    'Oba přehledy se sestavují do 6 měsíců po skončení roku; aplikace je vytvoří v záložce Formuláře.'])}
  ${L('Zákon č. 254/2004 Sb., o omezení plateb v hotovosti','https://www.zakonyprolidi.cz/cs/2004-254',[
    '<b>§ 4</b> – platbu přesahující 270 000 Kč za jeden den nelze provést v hotovosti.'])}

  ${S('3. Daně')}
  ${L('Zákon č. 586/1992 Sb., o daních z příjmů','https://www.zakonyprolidi.cz/cs/1992-586',[
    '<b>§ 17a</b> – spolek je veřejně prospěšný poplatník.',
    '<b>§ 18a</b> – příjmy z hlavní činnosti nejsou předmětem daně, jen pokud jsou výdaje na ni vyšší. Tržby z hostinské činnosti a prodeje nápojů (živnosti sboru) předmětem daně jsou.',
    '<b>§ 19b</b> – osvobození přijatých darů a jiných bezúplatných příjmů za zákonných podmínek.',
    '<b>§ 20 odst. 7</b> – snížení základu daně až o 30 %, max. 1 000 000 Kč; je-li 30 % méně než 300 000 Kč, lze odečíst 300 000 Kč, nejvýše do výše základu. Ušetřené prostředky se musí použít na hlavní činnost.',
    '<b>§ 21</b> – sazba daně z příjmů právnických osob 21 %. Základ se zaokrouhluje na celé tisíce Kč dolů.',
    '<b>§ 26</b> – hmotný majetek nad 80 000 Kč s použitelností přes 1 rok je pro daně dlouhodobý hmotný majetek.',
    '<b>§ 38mb</b> – přiznání nemusí podat jen ten, kdo má výhradně příjmy, které nejsou předmětem daně, jsou osvobozené nebo zdaněné srážkou. Sbor s tržbami přiznání podává.'])}
  ${L('Zákon č. 280/2009 Sb., daňový řád','https://www.zakonyprolidi.cz/cs/2009-280',[
    '<b>§ 136</b> – lhůta pro přiznání jsou 3 měsíce po skončení roku, při elektronickém podání 4 měsíce (při víkendu či svátku posun na pracovní den).',
    '<b>§ 72</b> – kdo má datovou schránku (každá právnická osoba), podává přiznání elektronicky – portál <a href="https://www.mojedane.cz" target="_blank" rel="noopener">Moje daně</a>.'])}
  ${L('Zákon č. 235/2004 Sb., o dani z přidané hodnoty','https://www.zakonyprolidi.cz/cs/2004-235',[
    'Sbor není plátcem DPH. Plátcem by se stal, kdyby jeho obrat přesáhl 2 000 000 Kč za kalendářní rok (stav od 1. 1. 2025). Kontrolu obratu ukazuje záložka Kontrola evidence.'])}
  ${L('Evidence tržeb','https://www.financnisprava.cz',[
    'Elektronická evidence tržeb (EET) byla zrušena k 1. 1. 2023 – tržby se neevidují online, ale každá tržba musí mít doklad a zápis v pokladní knize.'])}

  ${S('4. Živnostenská oprávnění sboru')}
  ${L('Zákon č. 455/1991 Sb., živnostenský zákon','https://www.zakonyprolidi.cz/cs/1991-455',[
    '<b>Hostinská činnost</b> je živnost řemeslná, <b>prodej kvasného lihu, konzumního lihu a lihovin</b> živnost koncesovaná a <b>výroba, obchod a služby</b> živnost volná.',
    '<b>§ 11</b> – právnická osoba provozuje řemeslnou a koncesovanou živnost prostřednictvím odpovědného zástupce. Odpovědný zástupce pro koncesi musí být schválen živnostenským úřadem.',
    '<b>§ 49</b> – změny údajů a dokladů (např. odpovědný zástupce, sídlo, statutární orgán) se živnostenskému úřadu oznamují do 15 dnů, pokud se nepropíší ze základních registrů nebo veřejného rejstříku.',
    '<b>§ 17</b> – provozovna je prostor, kde se živnost provozuje, včetně stánku a mobilní provozovny. Zahájení a ukončení provozování v provozovně se oznamuje předem živnostenskému úřadu. Pro každou provozovnu musí být určena osoba odpovědná za její činnost.',
    '<b>§ 17</b> – provozovna musí být trvale a zvenčí viditelně označena názvem a IČO sboru; u prodeje spotřebitelům i jménem osoby odpovědné za provozovnu a prodejní dobou. Stánek se označuje i sídlem sboru.'],
    'Doporučení: ověřte, že klubovna (a případně stánek na akcích) je jako provozovna oznámena a označena. Aktuální stav živností ukazuje záložka Živnostenský list a výpis.')}

  ${S('5. Hostinská činnost a potraviny')}
  ${L('Nařízení (ES) č. 852/2004 o hygieně potravin','https://eur-lex.europa.eu/legal-content/CS/ALL/?uri=CELEX:32004R0852',[
    'Každý provozovatel stravovací služby (i při akcích) musí zavést postupy založené na zásadách HACCP, případně správné hygienické praxe.',
    'Jde o hygienu přípravy a výdeje, skladování, teploty, úklid a sanitaci.'])}
  ${L('Zákon č. 258/2000 Sb., o ochraně veřejného zdraví, a vyhláška č. 137/2004 Sb.','https://www.zakonyprolidi.cz/cs/2000-258',[
    'Kdo připravuje nebo vydává jídlo a nápoje, musí mít zdravotní průkaz a znalosti hygieny; zdravotní průkazy mají mít obsluhující při sobě po celou dobu akce.',
    'Vyhláška č. 137/2004 Sb. upravuje hygienické požadavky na stravovací služby včetně krátkodobého občerstvení při jednorázových akcích ve stáncích a stanech.',
    '<b>§ 23 odst. 5</b> – zahájení, změnu a ukončení stravovací služby se oznamuje orgánu ochrany veřejného zdraví (krajská hygienická stanice).'])}
  ${L('Zákon č. 110/1997 Sb., o potravinách – registrace u SZPI','https://www.szpi.gov.cz',[
    'Od 1. 1. 2025 se zahájení, změna a ukončení stravovací služby oznamuje Státní zemědělské a potravinářské inspekci; oznamovací povinnost vůči KHS přitom trvá.',
    'Kdo činnost oznámil KHS před 1. 1. 2025, registrační povinnost splnil a SZPI už znovu oznamovat nemusí.'])}
  ${L('Nařízení (EU) č. 1169/2011 o informacích o potravinách – alergeny','https://eur-lex.europa.eu/legal-content/CS/ALL/?uri=CELEX:32011R1169',[
    'Povinnost informovat o alergenech platí i pro nebalené potraviny a pokrmy, tedy i pro občerstvení na akcích.',
    'Seznam alergenů musí být písemně a viditelně uveden u pokrmů (jídelní lístek, tabule, vývěska u výdeje) – pouhá ústní informace nestačí.'])}
  ${L('Zákon č. 634/1992 Sb., o ochraně spotřebitele','https://www.zakonyprolidi.cz/cs/1992-634',[
    'Zákazník musí znát cenu před nákupem – u stánku i výčepu mějte viditelný ceník.'])}

  ${S('6. Prodej alkoholu')}
  ${L('Zákon č. 65/2017 Sb., o ochraně zdraví před škodlivými účinky návykových látek','https://www.zakonyprolidi.cz/cs/2017-65',[
    'Alkohol se nesmí prodat ani podat osobám mladším 18 let; při pochybnostech o věku se prodej odmítne.',
    'Na místě prodeje musí být viditelný text o zákazu prodeje alkoholických nápojů osobám mladším 18 let; minimální velikost písma je 2 cm.',
    'Prodáváte-li i tabákové výrobky nebo e-cigarety, musí text výslovně jmenovat všechny tyto druhy zboží.'])}
  ${L('Zákon č. 307/2013 Sb., o povinném značení lihu','https://www.zakonyprolidi.cz/cs/2013-307',[
    'Lihoviny smí sbor jako konečný prodejce nakupovat jen od registrovaného distributora lihu a musí mu sdělit, že je kupuje jako konečný prodejce, ne pro vlastní spotřebu.',
    'Spotřebitelská balení lihovin musí být označena kontrolní páskou; nákupní doklady uchovávejte.',
    'Od 1. 7. 2025 platí pravidla pro velikosti balení lihu v restauračním zařízení na jednom prodejním místě.'])}

  ${S('7. Akce, sbírky a dotace')}
  ${L('Zákon č. 121/2000 Sb., autorský zákon','https://www.zakonyprolidi.cz/cs/2000-121',[
    'Hraje-li na akci (zábava, pouť, ples) hudba, pořadatel ji hlásí kolektivnímu správci (OSA) a platí autorské odměny.'])}
  ${L('Zákon č. 117/2001 Sb., o veřejných sbírkách','https://www.zakonyprolidi.cz/cs/2001-117',[
    'Pokud sbor pořádá veřejnou sbírku (např. pro postižené povodní), musí ji předem oznámit krajskému úřadu a vyúčtovat.'])}
  ${L('Zákon č. 250/2000 Sb., o rozpočtových pravidlech územních rozpočtů','https://www.zakonyprolidi.cz/cs/2000-250',[
    '<b>§ 10a</b> – dotace od obce se poskytuje na základě veřejnoprávní smlouvy; peníze se smí použít jen na sjednaný účel a dotace se v termínu vyúčtuje.',
    'Dotaci veďte v pokladní knize zvlášť (kategorie, popis s číslem smlouvy) a doklady k jejímu čerpání uchovejte.'])}

  ${S('8. Požární ochrana')}
  ${L('Zákon č. 133/1985 Sb., o požární ochraně','https://www.zakonyprolidi.cz/cs/1985-133',[
    'Jednotku sboru dobrovolných hasičů obce (JSDH) zřizuje a vybavuje obec; technika a výstroj jednotky je majetkem obce, ne spolku SDH.',
    'Do knihy majetku sboru patří jen to, co sbor pořídil ze svých peněz.'])}

  ${S('9. Předpisy SH ČMS (dh.cz)')}
  ${L('Stanovy SH ČMS ve znění ze 12. 4. 2025','https://www.dh.cz/images/Dokumenty/novelizace-stanov/Stanovy_SH_CMS_schvalena_verze_12.4.2025.pdf',[
    'Platí od 12. 4. 2025, ustanovení o SDH jsou účinná od 1. 12. 2025. Nahrazují stanovy z 9. 7. 2021.',
    '<b>Statutární orgán SDH</b> – starosta a jeho 1. náměstek; za sbor jedná každý z nich samostatně, nebo oba společně (čl. 5).',
    '<b>Valná hromada SDH</b> (členové starší 18 let) se koná nejméně jednou ročně. Rozhoduje o ročním rozpočtu, plánu činnosti a výši členských příspěvků, bere na vědomí zprávu revizora a zprávy o hospodaření (čl. 49).',
    '<b>Revizor SDH</b> je jedna osoba volená valnou hromadou. Nesmí být ve statutárním ani výkonném orgánu (výboru) na žádném stupni a nesmí zpracovávat účetnictví sboru (čl. 14).',
    'Kontroly se provádějí podle plánu kontrolní činnosti, minimálně dvakrát ročně; z každé kontroly se sepisuje zápis se zjištěními a návrhy opatření (čl. 16).',
    'Veškerý majetek se eviduje a inventarizuje; z dokladů musí být zřejmé, jak, z jakých zdrojů a k jakému účelu byl pořízen. Účetní, smluvní a pracovněprávní agenda se vede odděleně od ostatních písemností (čl. 13, 58).',
    'Hospodaří se podle ročního rozpočtu, který sestavuje výbor a schvaluje valná hromada (čl. 57).',
    'Vedlejší výdělečná činnost (mj. hostinská činnost, prodej lihovin) je vyjmenována v příloze č. 1; výnosy patří sboru, ztráty musí sbor vyrovnat sám (čl. 60).',
    'Sbor vybírá členské příspěvky i za vyšší stupně: podíl okrsku s p. o. odešle okrsku, podíl OSH, KSH a SH ČMS odešle na OSH (čl. 59).'],
    'Přehled všech vnitřních dokumentů SH ČMS: <a href="https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty" target="_blank" rel="noopener">dh.cz – Vnitroorganizační – Dokumenty</a>.')}
  ${L('Organizační řád SH ČMS 2025','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/2956-organizacni-rad-2025',[
    'Prováděcí předpis ke stanovám s přílohami: členská přihláška, vzory razítek, registrační list SDH a vzory pro zápis změn do spolkového rejstříku (např. výpis z usnesení valné hromady SDH).'])}
  ${L('Zabezpečení valných hromad SDH 2026','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/3257-zabezpeceni-valnych-hromad-sdh-a-valnych-hromad-okrsku-s-p-o-2026',[
    'Pokyny SH ČMS a vzory k valné hromadě sboru; vydávají se každý rok.',
    'Podle stanov valná hromada rozhoduje o ročním rozpočtu a plánu činnosti a zprávu revizora a zprávy o činnosti a hospodaření bere na vědomí (čl. 49).'])}
  ${L('Metodický pokyn pro provádění kontrolní činnosti','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/787-metodicky-pokyn-kontrolni-cinnost',[
    'Metodika kontrolních orgánů SH ČMS pro revizory – podle ní se plánují a provádějí kontroly hospodaření a pokladny.'],
    'Pokyn je z roku 2017, tedy starší než stanovy z roku 2025; při rozporu platí stanovy.')}
  ${L('Příručka funkcionáře sboru 2019','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/917-prirucka-funckionare-sboru',[
    '<b>Hospodář (pokladník)</b> odpovídá výboru za dodržování předpisů o hospodaření, vede evidenci majetku sboru a doklady předkládá na požádání revizorovi.',
    '<b>Revizor</b> dohlíží na hospodaření a nakládání s majetkem a provádí inventarizaci pokladní hotovosti.',
    'Obsahuje vzor zprávy o hospodaření sboru a zprávy revizora.'],
    'Příručka je z roku 2019 a vychází ze starších stanov; při rozporu platí stanovy z roku 2025.')}
  ${L('Metodický pokyn č. 1/2022 – ekonomické, účetní a daňové zásady','https://www.dh.cz/index.php/ekonomika/ucetnictvi/54-metodicky-pokyn-c-2-2021-ekonomicke-ucetni-a-danove-zasady-pro-zajisteni-ekonomickych-cinnosti-organizacnich-jednotek-sdruzeni-hasicu-cech-moravy-a-slezska',[
    'Hlavní metodika SH ČMS k účetnictví a daním pobočných spolků (tedy i SDH).'])}
  ${L('Inventarizace a účetní uzávěrka k 31. 12. 2025','https://www.dh.cz/index.php/ekonomika/inventarizace/2948-inventarizace-a-ucetni-uzaverka-sh-cms-k-31-12-2025',[
    'Příkaz k inventarizaci a směrnice k provedení inventarizace majetku. SH ČMS je vydává každý rok – k uzávěrce roku 2026 hledejte novou verzi v sekci Ekonomika – Inventarizace.'])}
  ${L('Směrnice I/18-2021 – cestovní náhrady pro rok 2026','https://www.dh.cz/index.php/ekonomika/ucetnictvi/1635-smernice-sh-cms-i-18-2021-cestovni-nahrady-vcetne-priloh-pro-rok-2026',[
    'Podle ní se proplácejí cestovní náhrady (cesty členů na akce, školení apod.).'])}
  ${L('Elektronický peněžní deník','https://www.dh.cz/index.php/ekonomika/ucetnictvi/1978-elektronicky-financni-denik',[
    'Pomůcka SH ČMS pro vedení peněžního deníku v jednoduchém účetnictví.'])}
  ${L('Spisový, archivní a skartační řád','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/24-spisovy-archivni-a-skartacni-rad',[
    'Jak zacházet s písemnostmi a doklady a jak je archivovat a vyřazovat.'],
    'Řád je starší než stanovy z roku 2025 (používá ještě dřívější označení orgánů); při rozporu platí stanovy.')}
  ${L('Jednací a volební řád 2018 a hlasování per rollam','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/526-jednaci-a-volebni-rad-2018',[
    'Pravidla jednání a voleb orgánů SH ČMS. Řád je z roku 2018, tedy starší než stanovy z roku 2025; při rozporu platí stanovy.',
    'Hlasování na dálku upravuje <a href="https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/1247-jednaci-rad-pro-hlasovani-per-rollam" target="_blank" rel="noopener">Jednací řád pro hlasování per rollam</a>.'])}
  ${L('Datové schránky SDH','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/1905-datove-schranky-aktivace-a-zakladni-nastaveni-datove-schranky-sdh',[
    'Návod k aktivaci a nastavení datové schránky sboru – přes ni se podává daňové přiznání.',
    'Základní obsluha: <a href="https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/1930-datove-schranky-zakladni-obsluha-datove-schranky" target="_blank" rel="noopener">Datové schránky – základní obsluha</a>.'])}
  ${L('Evidence skutečných majitelů','https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/750-informace-k-zapisu-do-rejstriku-skutecnych-majitelu',[
    'Informace SH ČMS k zápisu sboru do evidence skutečných majitelů.',
    'Úplný výpis: <a href="https://www.dh.cz/index.php/usek-vnitroorganizacni/dokumenty/1535-ziskani-uplneho-vypisu-z-evidence-skutecnych-majitelu" target="_blank" rel="noopener">Získání úplného výpisu z evidence</a>.'])}

  <p class="note">Ověřeno z veřejných zdrojů (zákony v platném znění, Finanční správa, SZPI, KHS, ČOI, metodika SH ČMS) k 27. 10. 2026. Legislativa se mění – před důležitým rozhodnutím ověřte aktuální znění nebo se obraťte na okresní sdružení hasičů, daňového poradce či příslušný úřad.</p>`;
}

/* ---------- start ---------- */
const h0=(location.hash||'').slice(1); setTab(['laws','tax','assets','reg','check','debts','forms'].includes(h0)?h0:'book');
})();
