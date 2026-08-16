const $=id=>document.getElementById(id);
const $$=s=>[...document.querySelectorAll(s)];
const n=id=>{const v=parseFloat($(id)?.value);return Number.isFinite(v)?v:null};
const vnum=v=>{const x=parseFloat(v);return Number.isFinite(x)?x:null};
const fmt=x=>Number.isFinite(x)?Math.round(x).toLocaleString('ja-JP'):'--';
const pct=x=>Number.isFinite(x)?`${x.toFixed(1)}%`:'--';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const sum=a=>a.reduce((s,x)=>s+(Number.isFinite(x)?x:0),0);
const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2};
const mean=a=>a.length?sum(a)/a.length:null;
const stdev=a=>{if(a.length<2)return null;const m=mean(a);return Math.sqrt(sum(a.map(x=>(x-m)**2))/a.length)};
const monthLabels=['9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月','8月'];
const stateVersion=4;
let dirty=false;
let lastDecision={};
const defaultProperties=()=>[
{name:'八千代一棟',owner:'本人',active:true,rentNow:217,rentExit:217,debtNow:114,debtExit:114,management:0,taxInsurance:0,repairReserve:0,vacancyReserve:0,other:33,overrideNow:70,overrideExit:70,confidence:60,note:'既知概算70万円/年をOverride採用。詳細内訳は要精査。'},
{name:'荻窪',owner:'妻',active:true,rentNow:null,rentExit:null,debtNow:null,debtExit:0,management:null,taxInsurance:null,repairReserve:null,vacancyReserve:null,other:null,overrideNow:null,overrideExit:84,confidence:50,note:'2027年5月頃完済後 +84万円/年想定。'},
{name:'品川',owner:'要確認',active:true,rentNow:null,rentExit:null,debtNow:null,debtExit:null,management:null,taxInsurance:null,repairReserve:null,vacancyReserve:null,other:null,overrideNow:null,overrideExit:null,confidence:0,note:''},
{name:'新宿①',owner:'要確認',active:true,rentNow:null,rentExit:null,debtNow:null,debtExit:null,management:null,taxInsurance:null,repairReserve:null,vacancyReserve:null,other:null,overrideNow:null,overrideExit:null,confidence:0,note:''},
{name:'新宿②',owner:'要確認',active:true,rentNow:null,rentExit:null,debtNow:null,debtExit:null,management:null,taxInsurance:null,repairReserve:null,vacancyReserve:null,other:null,overrideNow:null,overrideExit:null,confidence:0,note:''},
{name:'銀座',owner:'妻',active:true,rentNow:null,rentExit:null,debtNow:null,debtExit:null,management:null,taxInsurance:null,repairReserve:null,vacancyReserve:null,other:null,overrideNow:null,overrideExit:null,confidence:0,note:'賃料増額 +5,000円/月反映後のCFを要更新。'},
{name:'妻その他',owner:'妻',active:true,rentNow:null,rentExit:null,debtNow:null,debtExit:null,management:null,taxInsurance:null,repairReserve:null,vacancyReserve:null,other:null,overrideNow:null,overrideExit:null,confidence:0,note:''}
];
let properties=defaultProperties();
const roadmap=[
['2026','Q3–Q4','Measurement','12M支出・連結BS・全物件CFを同一as-ofで確定。安全資産の使途指定を行う。'],
['2027','Q1–Q2','Property CF','荻窪完済後の実CFを検証。全物件で税引前キャッシュCFと修繕引当を更新。'],
['2027','Q3–Q4','Pseudo 3M','本人給与を隔離し、妻収入＋RE CFだけで3か月生活。差異を記録。'],
['2028','Q1–Q2','Safe Bucket','2年生活費＋修繕＋移行費を防衛資産として分離。'],
['2028','Q3–Q4','Pseudo 6M','市場Stressを前提に6か月擬似退職。強制売却が不要か検証。'],
['2029','Q1–Q2','System DD','退職金・DC・有給・健康保険・年金・税を最新制度で精査。'],
['2029','Q3–Q4','Formal GO/NO-GO','Sequence riskを反映した退職ポートフォリオへ移行し正式判定。'],
['2030','Q1–Q2','Exit Optimization','賞与・有給・退職金・税/社保の観点で退職日を最適化。'],
['2030','Q3–Q4','Execute','条件を維持できれば退職。退職直後の大型買収・新規高負荷事業は避ける。']
];
function yearsToExit(){const e=new Date($('exitDate').value+'T00:00:00'),a=new Date($('asOfDate').value+'T00:00:00');if(!Number.isFinite(e.getTime())||!Number.isFinite(a.getTime()))return 0;return Math.max(0,(e-a)/(365.2425*86400000));}
function monthsToExit(){return Math.round(yearsToExit()*12);}
function assetValues(){return $$('.asset').map(x=>vnum(x.value)||0);}
function haircuts(){return $$('.hair').map(x=>vnum(x.value)||0);}
function financialAssets(){return sum(assetValues());}
function safeAssets(){return n('safe');}
function propCalc(p,exit=false){const rent=vnum(exit?p.rentExit:p.rentNow),debt=vnum(exit?p.debtExit:p.debtNow);const costs=['management','taxInsurance','repairReserve','vacancyReserve','other'].map(k=>vnum(p[k]));if(rent===null||debt===null||costs.some(x=>x===null))return null;return rent-debt-sum(costs);}
function propCF(p,exit=false){const o=vnum(exit?p.overrideExit:p.overrideNow);return o!==null?o:propCalc(p,exit);}
function reTotals(){const active=properties.filter(p=>p.active!==false),now=active.map(p=>propCF(p,false)),exit=active.map(p=>propCF(p,true));return{now:sum(now.filter(Number.isFinite)),exit:sum(exit.filter(Number.isFinite)),nowKnown:now.filter(Number.isFinite).length,exitKnown:exit.filter(Number.isFinite).length,total:active.length};}
function reQuality(){const active=properties.filter(p=>p.active!==false);if(!active.length)return 0;return mean(active.map(p=>{const has=Number.isFinite(propCF(p,true));return has?clamp(vnum(p.confidence)||0,0,100):0;}))||0;}
function projectionScenario(riskReturn){let vals=assetValues();const start=sum(vals),m=monthsToExit(),contrib=(n('contrib')||0)/12,gold=(n('goldReturn')||1)/100,cash=.002;let weights=start>0?vals.map(x=>x/start):[.7,.1,.15,.05];const rr=(riskReturn||0)/100;const series=[{m:0,v:start}];for(let i=1;i<=m;i++){vals[0]=vals[0]*Math.pow(1+rr,1/12)+contrib*weights[0];vals[1]=vals[1]*Math.pow(1+rr,1/12)+contrib*weights[1];vals[2]=vals[2]*Math.pow(1+cash,1/12)+contrib*weights[2];vals[3]=vals[3]*Math.pow(1+gold,1/12)+contrib*weights[3];series.push({m:i,v:sum(vals)});}return{end:sum(vals),series};}
function projections(){return{cons:projectionScenario(n('riskCons')||0),base:projectionScenario(n('riskBase')||0),up:projectionScenario(n('riskUp')||0)};}
function spendingStats(){const vals=$$('.expense-month').map(x=>vnum(x.value)).filter(Number.isFinite),m=mean(vals),med=median(vals),sd=stdev(vals);return{vals,count:vals.length,mean:m,median:med,annual:m===null?null:m*12,cv:m&&sd!==null?sd/m*100:null};}
function adoptSpendingAverage(){const s=spendingStats();if(s.count<12){alert('12か月分が揃ってから採用してください。');return}$('living').value=Math.round(s.annual);$('expenseOk').checked=true;markDirty();update();}
function exitEconomics(){const living=n('living'),infl=(n('inflation')||0)/100,y=yearsToExit(),wife=n('wife')||0,wg=(n('wifeGrowth')||0)/100,re=reTotals().exit,swr=(n('swr')||3)/100,tr=n('transition'),floor=n('policyFloor')||0;const livingExit=living===null?null:living*Math.pow(1+infl,y),wifeExit=wife*Math.pow(1+wg,y);const personalGap=livingExit===null?null:Math.max(livingExit-wifeExit-re,0),fullGap=livingExit===null?null:Math.max(livingExit-re,0);const personalTarget=personalGap===null||tr===null?null:Math.max(floor,personalGap/swr+tr),fullTarget=fullGap===null||tr===null?null:fullGap/swr+tr;return{livingExit,wifeExit,re,personalGap,fullGap,personalTarget,fullTarget};}
function stressEconomics(){const e=exitEconomics(),safe=n('safe'),tr=n('transition'),reHair=(n('reHaircut')||50)/100,repair=n('repairShock')||0,targetYears=n('safeYearsTarget')||2;if(e.livingExit===null||tr===null)return{need:null,margin:null,runway:null,safeTarget:null};const stressedRe=e.re*(1-reHair),annualNeed=Math.max(e.livingExit-stressedRe,0),need=annualNeed+repair+tr,margin=safe===null?null:safe-need,runway=safe===null||annualNeed<=0?null:safe/annualNeed,safeTarget=e.livingExit*targetYears+repair+tr;return{stressedRe,annualNeed,need,margin,runway,safeTarget};}
function stressAssets(){const a=assetValues(),h=haircuts(),s=a.map((x,i)=>x*(1-(h[i]||0)/100));return{s,total:sum(s)};}
function simResult(){const months=n('simMonths')||6,wifePct=(n('simWifePct')||0)/100,rePct=(n('simRePct')||0)/100,market=(n('simMarketShock')||0)/100,repair=n('simRepair')||0,safe=n('safe')||0,living=n('living'),wife=n('wife')||0,reT=reTotals(),re=($('simUseExitRe').checked?reT.exit:reT.now)*rePct,transition=$('simTransition').checked?(n('transition')||0):0;if(living===null)return{pass:false,missing:true};const annualIncome=wife*wifePct+re,monthly=(annualIncome-living)/12,endSafe=safe+monthly*months-repair-transition,forced=Math.max(-endSafe,0),a=assetValues(),postShock=a[0]*(1-market)+a[1]*(1-market)+a[2]+a[3],pass=forced<=0;return{months,annualIncome,monthly,endSafe,forced,postShock,pass};}
function applySimPreset(name){if(name==='base'){$('simMonths').value=6;$('simWifePct').value=100;$('simRePct').value=100;$('simMarketShock').value=0;$('simRepair').value=0;$('simUseExitRe').checked=false;$('simTransition').checked=false;}if(name==='wifezero'){$('simMonths').value=12;$('simWifePct').value=0;$('simRePct').value=100;$('simMarketShock').value=0;$('simRepair').value=0;$('simUseExitRe').checked=false;$('simTransition').checked=false;}if(name==='stress'){$('simMonths').value=12;$('simWifePct').value=0;$('simRePct').value=Math.max(0,100-(n('reHaircut')||50));$('simMarketShock').value=35;$('simRepair').value=n('repairShock')||200;$('simUseExitRe').checked=true;$('simTransition').checked=true;}markDirty();update();}
