const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const {gunzipSync}=require('node:zlib');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const baseline='c2255f4a6875670792b18581e4552c28b09a7fa7';
const html=Buffer.concat([1,2,3].map(i=>gunzipSync(readFileSync(path.join(root,`app-part-${i}.gz`))))).toString('utf8');
const original=Buffer.concat([1,2,3].map(i=>gunzipSync(execFileSync('git',['show',`${baseline}:app-part-${i}.gz`],{cwd:root,maxBuffer:40*1024*1024,stdio:['ignore','pipe','pipe']})))).toString('utf8');
const css=readFileSync(path.join(root,'src/ranking-history-v13157.css'),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function block(document,start,end){const a=document.indexOf(start),b=document.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return document.slice(a,b);}

test('the delivered history fix leaves Grand Prix preparation, team visuals and saved history rendering unchanged',()=>{
 assert.equal(block(html,'VIEWS.classement =','/* ---------- Vue Bilan'),block(original,'VIEWS.classement =','/* ---------- Vue Bilan'));
 assert.equal(block(html,'function gpPreparationCardsPanel()','function preparationCoherence()'),block(original,'function gpPreparationCardsPanel()','function preparationCoherence()'));
 assert.equal(block(html,'function cardVisualToken(','const av ='),block(original,'function cardVisualToken(','const av ='));
 assert.ok(html.includes(css.trim()),'The tested styles must reach the compressed application.');
});

test('ranking history keeps every recorded team, rank, date, session total and cancellation identifier',()=>{
 const c={players:[],sessions:[{id:'session-1',title:'Séance <test>',t:10,n:3,total:77,carrT:2}],races:[{id:'race-1',title:'GP <équipes>',t:20,ranking:[{name:'Champignons',emoji:'🍄'},{name:'Carapaces',emoji:'🐢'},{name:'Éclairs',emoji:'⚡'},{name:'Équipe <libre>',emoji:'🏁'}]}]};
 const visualCalls=[];
 const ctx=vm.createContext({VIEWS:{},cls:()=>c,ui:{rank:'xp'},S:{locked:false},METRICS:{xp:{v:p=>p.xp,l:'Expérience',f:String}},esc,byName:()=>0,fmtDate:t=>`date-${t}`,fmtNum:String,teamVisual:(team,kind)=>{visualCalls.push([team.name,kind]);return `<span class="card-art-token team-card-token ${kind}" title="${esc(team.name)}"><img alt="${esc(team.name)}"></span>`;}});
 vm.runInContext(block(html,'VIEWS.classement =','/* ---------- Vue Bilan'),ctx);
 const markup=ctx.VIEWS.classement();
 assert.deepEqual(visualCalls,c.races[0].ranking.map(team=>[team.name,'history-token']));
 for(const expected of ['🥇','🥈','🥉','4e','Champignons','Carapaces','Éclairs','Équipe &lt;libre&gt;','GP &lt;équipes&gt;','Séance &lt;test&gt;','date-20','date-10','3 élèves · +77 🪙 · +2 🛠️','data-id="race-1" data-k="r"','data-id="session-1" data-k="s"'])assert.ok(markup.includes(expected),expected);
 assert.ok(markup.indexOf('GP &lt;équipes&gt;')<markup.indexOf('Séance &lt;test&gt;'),'Most recent event remains first.');
 assert.deepEqual(c.sessions[0],{id:'session-1',title:'Séance <test>',t:10,n:3,total:77,carrT:2});
});

test('history styles constrain both the inline token and its image to the existing preparation format',()=>{
 const reference=original.match(/\.card-art-token\.prep-token\{width:(\d+)px;height:(\d+)px\}/);
 assert.ok(reference,'Published preparation card dimensions exist.');
 const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]+)\}/g)];
 assert.equal(rules.length,2);
 for(const [,selector] of rules)assert.ok(selector.trim().startsWith('.hist .hd .card-art-token.history-token'),'No rule can affect gameplay cards, preparation cards or character pills.');
 const token=rules.find(([,selector])=>!selector.includes('>img'))[2],image=rules.find(([,selector])=>selector.includes('>img'))[2];
 assert.match(token,/display\s*:\s*inline-flex\s*;/,'Width must apply to this inline history token.');
 assert.match(token,new RegExp(`(?:^|;)\\s*width\\s*:\\s*${reference[1]}px\\s*;`));
 assert.match(token,new RegExp(`(?:^|;)\\s*height\\s*:\\s*${reference[2]}px\\s*;`));
 assert.match(token,/overflow\s*:\s*hidden\s*;/);
 assert.match(image,/(?:^|;)\s*width\s*:\s*100%\s*;/);assert.match(image,/(?:^|;)\s*height\s*:\s*100%\s*;/);
 assert.match(image,/object-fit\s*:\s*cover\s*;/);
});
