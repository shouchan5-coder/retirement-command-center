function dataQuality(){
 const s=spendingStats(),rt=reTotals(),asof=new Date($('asOfDate').value+'T00:00:00'),today=new Date(),days=Number.isFinite(asof.getTime())?(today-asof)/86400000:9999;
 const props=properties.filter(p=>p.active!==false),propComplete=props.length?props.filter(p=>Number.isFinite(propCF(p,true))&&(vnum(p.confidence)||0)>=60).length/props.length:0;
 const items=[
  {name:'資産as-of鮮度',score:days<=180?1:days<=365?.5:0,detail:days<=180?'180日以内':`${Math.round(days)}日前`},
  {name:'金融資産内訳',score:assetValues().every(Number.isFinite)&&financialAssets()>0?1:0,detail:`${fmt(financialAssets())}万円`},
  {name:'12か月生活費証拠',score:s.count/12,detail:`${s.count}/12か月`},
  {name:'正常化生活費採用',score:n('living')!==null&&$('expenseOk').checked?1:0,detail:n('living')!==null?`${fmt(n('living'))}万円/年`:'未入力'},
  {name:'指定安全資産',score:n('safe')!==null?1:0,detail:n('safe')!==null?`${fmt(n('safe'))}万円`:'未指定'},
  {name:'退職翌年バッファ',score:n('transition')!==null?1:0,detail:n('transition')!==null?`${fmt(n('transition'))}万円`:'未入力'},
  {name:'積立額実績',score:$('contribOk').checked?1:0,detail:$('contribOk').checked?'確認済':'暫定'},
  {name:'全物件2030 CF',score:propComplete,detail:`${Math.round(propComplete*props.length)}/${props.length}件 ≥60% confidence`},
  {name:'連結BS照合',score:$('bsOk').checked?1:0,detail:$('bsOk').checked?'済':'未完'},
  {name:'制度DD',score:$('systemOk').checked?1:0,detail:$('systemOk').checked?'済':'未完'}
 ];
 return{items,score:mean(items.map(x=>x.score))*100,propComplete};
}
function decision(){
 const e=exitEconomics(),p=projections(),st=stressEconomics(),dq=dataQuality(),sim=simResult(),mode=$('mode').value,target=mode==='personal'?e.personalTarget:e.fullTarget,margin=target&&p.base.end?((p.base.end/target)-1)*100:null,ss=n('safe'),livingExit=e.livingExit,safeTarget=st.safeTarget,reqMargin=(n('capitalMarginPolicy')||0)/100,reQ=reQuality(),props=properties.filter(x=>x.active!==false);
 const g1=spendingStats().count===12&&$('expenseOk').checked&&n('living')!==null;
 const g2=target===null?null:p.base.end>=target*(1+reqMargin);
 const recurring=mode==='personal'?e.wifeExit+e.re:e.re;
 const g3=livingExit===null?null:recurring>=livingExit;
 const g4=safeTarget===null||ss===null?null:ss>=safeTarget;
 const g5=st.margin===null?null:st.margin>=0;
 const g6=props.length?props.every(x=>Number.isFinite(propCF(x,true))&&(vnum(x.confidence)||0)>=60):false;
 const g7=$('pseudoDone').checked&&sim.pass;
 const g8=$('systemOk').checked;
 const gates=[
  {name:'① Spending Evidence',desc:'12か月の正常化コア支出＋レビュー済',pass:g1,w:15,critical:true},
  {name:'② Capital Adequacy',desc:`Base資産 ≥ 必要資本＋${fmt(n('capitalMarginPolicy')||0)}% margin`,pass:g2,w:20,critical:true},
  {name:'③ Recurring CF',desc:'Exit後の継続収入でExit年生活費をカバー',pass:g3,w:10,critical:false},
  {name:'④ Liquidity Buffer',desc:`安全資産 ≥ ${n('safeYearsTarget')||2}年生活費＋修繕＋移行費`,pass:g4,w:15,critical:true},
  {name:'⑤ Composite Stress',desc:'妻収入0＋RE haircut＋修繕＋移行費でも強制売却不要',pass:g5,w:15,critical:true},
  {name:'⑥ RE Data Quality',desc:'全物件2030 CFをconfidence 60%以上で確定',pass:g6,w:10,critical:false},
  {name:'⑦ Pseudo Retirement',desc:'実生活テスト実施済＋現在のSimulationもPASS',pass:g7,w:10,critical:false},
  {name:'⑧ System DD',desc:'退職金/DC/税/社保/有給等の制度DD済',pass:g8,w:5,critical:false}
 ];
 const score=sum(gates.map(g=>g.pass===true?g.w:0)),critical=gates.filter(g=>g.critical),criticalPass=critical.every(g=>g.pass===true);
 let verdict='BUILD',text='未通過Gateを順に閉じる段階です。';
 if(n('living')===null||n('safe')===null||n('transition')===null){verdict='INPUT REQUIRED';text='生活費・指定安全資産・退職翌年バッファの3点を確定してください。'}
 else if(score>=85&&dq.score>=80&&criticalPass){verdict='GO';text='主要リスクを定量化し、Critical GateとData Quality基準を通過しています。退職直前の制度再確認を条件に実行可能圏です。'}
 else if(score>=65){verdict='CONDITIONAL';text='実行可能圏に近いものの、未通過Gateまたはデータ品質の改善が必要です。'}
 const blockers=gates.filter(g=>g.pass!==true).map(g=>g.name);
 return{e,p,st,dq,sim,target,margin,reQ,gates,score,criticalPass,verdict,text,blockers,recurring};
}
function renderProjectionChart(pr){
 const svg=$('projChart'),w=900,h=270,pad={l:55,r:18,t:18,b:32},all=[...pr.cons.series,...pr.base.series,...pr.up.series].map(x=>x.v),min=Math.min(...all)*.98,max=Math.max(...all)*1.02,series=[['cons',pr.cons,'#8394aa'],['base',pr.base,'#6aa9ff'],['up',pr.up,'#68d5e8']];
 const X=m=>pad.l+(m/Math.max(1,monthsToExit()))*(w-pad.l-pad.r),Y=v=>h-pad.b-((v-min)/Math.max(1,max-min))*(h-pad.t-pad.b);
 let s='';for(let i=0;i<5;i++){const y=pad.t+i*(h-pad.t-pad.b)/4,val=max-(max-min)*i/4;s+=`<line x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}" stroke="#20364f"/><text x="${pad.l-7}" y="${y+3}" text-anchor="end" fill="#7f94ad" font-size="9">${fmt(val)}</text>`}
 series.forEach(([k,obj,c])=>{const pts=obj.series.filter((_,i)=>i%3===0||i===obj.series.length-1).map(x=>`${X(x.m)},${Y(x.v)}`).join(' ');s+=`<polyline fill="none" stroke="${c}" stroke-width="2.2" points="${pts}"/>`});
 const years=Math.ceil(yearsToExit());for(let i=0;i<=years;i++){const m=Math.min(monthsToExit(),i*12),x=X(m);s+=`<text x="${x}" y="${h-10}" text-anchor="middle" fill="#7f94ad" font-size="9">${i===0?'Now':new Date($('asOfDate').value+'T00:00:00').getFullYear()+i}</text>`}
 svg.innerHTML=s;
}
function drawHistoryChart(id,hist,key,suffix=''){
 const svg=$(id),data=hist.map(r=>({q:r.q,v:vnum(r[key])})).filter(x=>x.v!==null);if(!data.length){svg.innerHTML='<text x="260" y="95" text-anchor="middle" fill="#7f94ad" font-size="11">履歴データなし</text>';return}
 const w=520,h=190,p={l:46,r:14,t:15,b:30},vals=data.map(x=>x.v),min=Math.min(...vals),max=Math.max(...vals),lo=min===max?min*.9:min,hi=min===max?max*1.1:max,range=Math.max(1,hi-lo),X=i=>p.l+(i/Math.max(1,data.length-1))*(w-p.l-p.r),Y=v=>h-p.b-(v-lo)/range*(h-p.t-p.b);let s='';
 for(let i=0;i<4;i++){const y=p.t+i*(h-p.t-p.b)/3,val=hi-range*i/3;s+=`<line x1="${p.l}" x2="${w-p.r}" y1="${y}" y2="${y}" stroke="#1f344c"/><text x="${p.l-5}" y="${y+3}" text-anchor="end" fill="#7890aa" font-size="8">${fmt(val)}${suffix}</text>`}
 const pts=data.map((d,i)=>`${X(i)},${Y(d.v)}`).join(' ');s+=`<polyline fill="none" stroke="#6aa9ff" stroke-width="2.2" points="${pts}"/>`;
 data.forEach((d,i)=>{s+=`<circle cx="${X(i)}" cy="${Y(d.v)}" r="3" fill="#68d5e8"/><text x="${X(i)}" y="${h-10}" text-anchor="middle" fill="#7890aa" font-size="8">${d.q.replace('20','')}</text>`});svg.innerHTML=s;
}
function renderProperties(){
 const rows=properties.map((p,i)=>{const a=propCF(p,false),b=propCF(p,true),sourceNow=vnum(p.overrideNow)!==null?'Override':Number.isFinite(propCalc(p,false))?'Detail':'Missing',sourceExit=vnum(p.overrideExit)!==null?'Override':Number.isFinite(propCalc(p,true))?'Detail':'Missing';return `<tr><td><b>${p.name}</b><div class="muted">${p.note||''}</div></td><td>${p.owner||'--'}</td><td class="${a>=0?'good':'bad'}">${Number.isFinite(a)?fmt(a)+'万':'--'}</td><td class="${b>=0?'good':'bad'}">${Number.isFinite(b)?fmt(b)+'万':'--'}</td><td>${fmt(vnum(p.confidence)||0)}%</td><td>${sourceExit}${sourceNow!==sourceExit?' / '+sourceNow:''}</td><td><button class="btn" onclick="openProperty(${i})">編集</button></td></tr>`}).join('');$('propertyRows').innerHTML=rows;
 const r=reTotals(),q=reQuality();$('reNowTotal').textContent=fmt(r.now)+'万円/年';$('reExitTotal').textContent=fmt(r.exit)+'万円/年';$('reWeightedConfidence').textContent=pct(q);$('rePositiveCount').textContent=`${properties.filter(p=>p.active!==false&&Number.isFinite(propCF(p,true))&&propCF(p,true)>0).length}/${properties.filter(p=>p.active!==false).length}`;$('reQualityPill').textContent=`Data ${Math.round(q)}%`;
}
function openProperty(i){const p=properties[i];$('propIndex').value=i;$('propertyModalTitle').textContent=p.name;const fields=[['name','物件名','text'],['owner','Owner','text'],['rentNow','年間賃料 Current','number'],['rentExit','年間賃料 2030','number'],['debtNow','年間返済 Current','number'],['debtExit','年間返済 2030','number'],['management','管理費等','number'],['taxInsurance','固定資産税・保険','number'],['repairReserve','修繕引当','number'],['vacancyReserve','空室引当','number'],['other','その他経費','number'],['overrideNow','Current CF Override','number'],['overrideExit','2030 CF Override','number'],['confidence','Confidence %','number'],['note','メモ','text']];$('propertyFields').innerHTML=fields.map(([k,l,t])=>`<div class="field"><label>${l}</label><input class="prop-input" data-key="${k}" type="${t}" value="${p[k]??''}"></div>`).join('');$$('.prop-input').forEach(x=>x.addEventListener('input',previewProperty));previewProperty();openModal('propertyModal');}
function previewProperty(){const i=parseInt($('propIndex').value),p={...properties[i]};$$('.prop-input').forEach(x=>p[x.dataset.key]=x.value===' '?null:x.value);const cn=propCalc(p,false),ce=propCalc(p,true),un=propCF(p,false),ue=propCF(p,true);$('propCalcNow').textContent=Number.isFinite(cn)?fmt(cn)+'万円':'--';$('propCalcExit').textContent=Number.isFinite(ce)?fmt(ce)+'万円':'--';$('propUseNow').textContent=Number.isFinite(un)?fmt(un)+'万円':'--';$('propUseExit').textContent=Number.isFinite(ue)?fmt(ue)+'万円':'--';}
function savePropertyModal(){const i=parseInt($('propIndex').value),p={...properties[i]};$$('.prop-input').forEach(x=>{const k=x.dataset.key;p[k]=['name','owner','note'].includes(k)?x.value:(x.value===''?null:parseFloat(x.value))});properties[i]=p;closeModal('propertyModal');markDirty();update();}
function renderDQ(dq){$('dqRows').innerHTML=dq.items.map(x=>`<div class="dqrow"><div><b>${x.name}</b><div class="muted">${x.detail}</div></div><div><div class="meter"><i style="width:${clamp(x.score*100,0,100)}%"></i></div><div class="muted" style="text-align:right;margin-top:3px">${Math.round(x.score*100)}%</div></div></div>`).join('');}
function renderRoadmap(){const grouped={};roadmap.forEach(r=>(grouped[r[0]]??=[]).push(r));$('roadmapGrid').innerHTML=Object.entries(grouped).map(([y,rows])=>`<div class="year"><h3>${y}</h3>${rows.map(r=>`<div class="mile"><b>${r[1]} · ${r[2]}</b><p>${r[3]}</p></div>`).join('')}</div>`).join('')}
