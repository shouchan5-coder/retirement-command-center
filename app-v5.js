function yearsBetweenDates(fromDate,toDate){
  const a=new Date(fromDate+'T00:00:00'),b=new Date(toDate+'T00:00:00');
  if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return null;
  return Math.max(0,(b-a)/(365.2425*86400000));
}

function projectionToYear(year,riskReturn){
  const asOf=$('asOfDate')?.value;
  const y=yearsBetweenDates(asOf,`${year}-12-31`);
  if(y===null)return null;
  let vals=assetValues().slice();
  const start=sum(vals),months=Math.round(y*12),contrib=(n('contrib')||0)/12;
  const weights=start>0?vals.map(x=>x/start):[.7,.1,.15,.05];
  const rr=(riskReturn||0)/100,gold=(n('goldReturn')||1)/100,cash=.002;
  for(let i=1;i<=months;i++){
    vals[0]=vals[0]*Math.pow(1+rr,1/12)+contrib*weights[0];
    vals[1]=vals[1]*Math.pow(1+rr,1/12)+contrib*weights[1];
    vals[2]=vals[2]*Math.pow(1+cash,1/12)+contrib*weights[2];
    vals[3]=vals[3]*Math.pow(1+gold,1/12)+contrib*weights[3];
  }
  return sum(vals);
}

function capitalTargetForGap(gap,usePolicyFloor=true){
  const swr=(n('swr')||3)/100,tr=n('transition'),floor=n('policyFloor')||0;
  if(gap===null||tr===null||swr<=0)return null;
  const raw=gap/swr+tr;
  return usePolicyFloor?Math.max(floor,raw):raw;
}

function yearEconomics(year){
  const asOf=$('asOfDate')?.value,living=n('living'),wife=n('wife'),hybrid=n('hybridNetIncome');
  const y=yearsBetweenDates(asOf,`${year}-12-31`);
  if(y===null||living===null)return null;
  const infl=(n('inflation')||0)/100,wg=(n('wifeGrowth')||0)/100;
  const livingCore=living*Math.pow(1+infl,y);
  const mandatory=typeof retirementAnnualMandatoryCost==='function'?retirementAnnualMandatoryCost():0;
  const livingWithRoute=mandatory===null?null:livingCore+mandatory;
  const wifeY=(wife||0)*Math.pow(1+wg,y);
  const re=reTotalsForYear(year);
  const personalGap=livingWithRoute===null?null:Math.max(livingWithRoute-wifeY-re.total,0);
  const fullGap=livingWithRoute===null?null:Math.max(livingWithRoute-re.total,0);
  const hybridGap=hybrid===null?null:Math.max(livingCore-wifeY-re.total-hybrid,0);
  return{
    livingCore,
    mandatory,
    living:livingWithRoute,
    wife:wifeY,
    re,
    personalTarget:capitalTargetForGap(personalGap,true),
    hybridTarget:hybridGap===null?null:capitalTargetForGap(hybridGap,true),
    fullTarget:capitalTargetForGap(fullGap,false)
  };
}

function matrixStatus(projected,target,reComplete){
  if(!Number.isFinite(projected)||!Number.isFinite(target))return{label:'INPUT',cls:'warn',margin:null};
  const req=(n('capitalMarginPolicy')||0)/100;
  const margin=target>0?(projected/target-1)*100:null;
  let label='GAP',cls='bad';
  if(projected>=target*(1+req)){label='READY';cls='good'}
  else if(projected>=target){label='BASE';cls='warn'}
  if(!reComplete){label+= '*';cls='warn'}
  return{label,cls,margin};
}

function matrixCell(projected,target,reComplete){
  const s=matrixStatus(projected,target,reComplete);
  if(s.label==='INPUT')return '<span class="warn">INPUT</span>';
  return `<b class="${s.cls}">${s.label}</b><div class="muted">Target ${fmt(target)}万 / ${s.margin===null?'--':(s.margin>=0?'+':'')+s.margin.toFixed(1)+'%'}</div>`;
}

function renderYearMatrix(){
  const root=$('yearMatrixRows');
  if(!root)return;
  const start=Math.round(n('matrixStartYear')||2027),count=clamp(Math.round(n('matrixYears')||5),1,10);
  const baseReturn=n('riskBase')||0,rows=[];
  for(let year=start;year<start+count;year++){
    const projected=projectionToYear(year,baseReturn),e=yearEconomics(year);
    if(!e){
      rows.push(`<tr><td><b>${year}</b></td><td colspan="7" class="warn">as-of日または正常化生活費を入力してください。</td></tr>`);
      continue;
    }
    const reComplete=e.re.count===0?true:e.re.known===e.re.count;
    rows.push(`<tr>
      <td><b>${year}</b></td>
      <td>${Number.isFinite(projected)?fmt(projected)+'万':'--'}</td>
      <td>${fmt(e.re.total)}万</td>
      <td class="${reComplete?'good':'warn'}">${e.re.known}/${e.re.count}</td>
      <td>${e.mandatory===null?'<span class="warn">INPUT</span>':e.mandatory.toFixed(1)+'万/年'}</td>
      <td>${matrixCell(projected,e.personalTarget,reComplete)}</td>
      <td>${matrixCell(projected,e.hybridTarget,reComplete)}</td>
      <td>${matrixCell(projected,e.fullTarget,reComplete)}</td>
    </tr>`);
  }
  root.innerHTML=rows.join('');
  const note=$('yearMatrixNote');
  if(note){
    note.textContent='READYはCapital Adequacyだけの一次判定です。最終GOには8 Decision GatesとData Qualityを使用します。退職後ルートをFIREモデルへ反映した場合、本人退職・完全FIREには選択ルートの年間外部流出を加算します。セミリタイア列は入力済みの「本人ネット収入（税・社保後）」を使うため、同じ社会保険費を二重加算しません。* はRE CFデータ未完了です。';
  }
}
