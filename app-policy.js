const POLICY_2026={
  referenceDate:'2026-10-06',
  dependentIncomeLimitMan:130,
  nationalPensionMonthlyMan:1.792,
  tokyoHealthRatePct:9.85,
  careRatePct:1.62,
  childSupportRatePct:0.23,
  pensionRatePct:18.3,
  employerChildContributionPct:0.36,
  voluntaryStandardMonthlyCapMan:32
};

const HEALTH_STANDARD_2026=[
  [6.3,5.8],[7.3,6.8],[8.3,7.8],[9.3,8.8],[10.1,9.8],[10.7,10.4],[11.4,11.0],
  [12.2,11.8],[13.0,12.6],[13.8,13.4],[14.6,14.2],[15.5,15.0],[16.5,16.0],
  [17.5,17.0],[18.5,18.0],[19.5,19.0],[21.0,20.0],[23.0,22.0],[25.0,24.0],
  [27.0,26.0],[29.0,28.0],[31.0,30.0],[33.0,32.0],[35.0,34.0],[37.0,36.0],
  [39.5,38.0],[42.5,41.0],[45.5,44.0],[48.5,47.0],[51.5,50.0],[54.5,53.0],
  [57.5,56.0],[60.5,59.0],[63.5,62.0],[66.5,65.0]
];

function healthStandardMonthly2026(monthlyMan){
  if(!Number.isFinite(monthlyMan)||monthlyMan<=0)return null;
  for(const [upper,std] of HEALTH_STANDARD_2026)if(monthlyMan<upper)return std;
  return 68.0;
}
function pensionStandardMonthly2026(monthlyMan){
  if(!Number.isFinite(monthlyMan)||monthlyMan<=0)return null;
  if(monthlyMan<9.3)return 8.8;
  return Math.max(8.8,healthStandardMonthly2026(monthlyMan));
}
function nationalPensionAnnual(){
  const m=n('nationalPensionMonthly');
  return m===null?null:m*12;
}
function dependentAssessment(){
  const income=n('dependentAssessmentIncome'),spouseGross=n('spouseInsuredGrossIncome');
  if(income===null||spouseGross===null)return{status:'INPUT',eligible:null,detail:'本人の扶養判定用年間収入と、被保険者である配偶者の年間収入を入力'};
  const belowLimit=income<POLICY_2026.dependentIncomeLimitMan;
  const belowHalf=income<spouseGross/2;
  const eligible=belowLimit&&belowHalf;
  return{
    status:eligible?'POTENTIAL':'NO',
    eligible,
    detail:eligible?'数値基準上は候補。最終認定は加入先保険者で確認':'130万円基準または配偶者収入1/2基準を満たさない'
  };
}
function corporateScenario(monthlyMan){
  const fixed=n('corpFixedAnnual')||0,taxPct=n('corpEffectiveTaxPct')||0,care=$('corpCareApplicable')?.checked;
  if(!Number.isFinite(monthlyMan)||monthlyMan<=0){
    return{monthly:0,gross:0,status:'CHECK',healthStd:null,pensionStd:null,employee:null,employer:null,tax:null,net:null,companyCash:fixed,groupLeakage:fixed,note:'役員報酬0円時の本人の社会保険資格は個別事情を含め制度確認が必要'};
  }
  const healthStd=healthStandardMonthly2026(monthlyMan),pensionStd=pensionStandardMonthly2026(monthlyMan);
  const healthRate=POLICY_2026.tokyoHealthRatePct+(care?POLICY_2026.careRatePct:0);
  const employeeHealth=healthStd*(healthRate+POLICY_2026.childSupportRatePct)/100/2*12;
  const employeePension=pensionStd*POLICY_2026.pensionRatePct/100/2*12;
  const employee=employeeHealth+employeePension;
  const employer=employee+pensionStd*POLICY_2026.employerChildContributionPct/100*12;
  const gross=monthlyMan*12,tax=gross*taxPct/100,net=gross-employee-tax;
  return{
    monthly:monthlyMan,gross,status:'SCREEN',healthStd,pensionStd,employee,employer,tax,net,
    companyCash:gross+employer+fixed,
    groupLeakage:employee+employer+tax+fixed,
    note:'2026協会けんぽ東京・厚生年金の標準報酬表による概算。税は入力した実効税率による簡易値'
  };
}
function voluntaryReference2026(){
  const care=$('corpCareApplicable')?.checked;
  const rate=POLICY_2026.tokyoHealthRatePct+POLICY_2026.childSupportRatePct+(care?POLICY_2026.careRatePct:0);
  return POLICY_2026.voluntaryStandardMonthlyCapMan*rate/100*12;
}
function fillVoluntaryReference2026(){
  $('voluntaryAnnual').value=voluntaryReference2026().toFixed(1);
  markDirty();update();
}
function routeCost(route){
  const pension=nationalPensionAnnual(),dep=dependentAssessment();
  if(route==='dependent')return dep.eligible===true?{cost:0,status:'POTENTIAL',detail:dep.detail}:{cost:null,status:dep.status,detail:dep.detail};
  if(route==='nhi'){
    const nhi=n('nhiAnnual');
    return nhi===null||pension===null?{cost:null,status:'INPUT',detail:'国保年額と国民年金を入力'}:{cost:nhi+pension,status:'SCREEN',detail:'国保＋国民年金'};
  }
  if(route==='voluntary'){
    const v=n('voluntaryAnnual');
    return v===null||pension===null?{cost:null,status:'INPUT',detail:'任意継続年額と国民年金を入力'}:{cost:v+pension,status:'SCREEN',detail:'任意継続＋国民年金'};
  }
  if(route.startsWith('corp')){
    const monthly=vnum(route.replace('corp',''));
    const c=corporateScenario(monthly);
    return monthly===0?{cost:null,status:'CHECK',detail:c.note}:{cost:c.groupLeakage,status:'SCREEN',detail:'法人＋役員報酬のグループ外部流出概算'};
  }
  return{cost:null,status:'INPUT',detail:'退職後ルートを選択'};
}
function selectedRouteResult(){
  return routeCost($('selectedExitRoute')?.value||'');
}
function retirementAnnualMandatoryCost(){
  if(!$('applyRouteToFire')?.checked)return 0;
  const r=selectedRouteResult();
  return Number.isFinite(r.cost)?r.cost:null;
}
function transitionSuggestion(){
  const resident=n('residentTaxCarryover'),other=n('exitOneOffOther');
  if(resident===null&&other===null)return null;
  return (resident||0)+(other||0);
}
function adoptTransitionSuggestion(){
  const x=transitionSuggestion();
  if(x===null){alert('住民税残額またはその他一時費用を入力してください。');return}
  $('transition').value=x.toFixed(1);
  markDirty();update();
}
function renderPolicyPlanner(){
  const dep=dependentAssessment(),pension=nationalPensionAnnual(),nhi=n('nhiAnnual'),vol=n('voluntaryAnnual'),sel=selectedRouteResult(),trans=transitionSuggestion();
  if($('dependentResult')){$('dependentResult').textContent=dep.status;$('dependentResult').className=dep.eligible===true?'good':dep.eligible===false?'bad':'warn'}
  if($('dependentDetail'))$('dependentDetail').textContent=dep.detail;
  if($('pensionAnnualView'))$('pensionAnnualView').textContent=pension===null?'--':pension.toFixed(1)+'万円/年';
  if($('nhiRouteCost'))$('nhiRouteCost').textContent=nhi===null||pension===null?'--':(nhi+pension).toFixed(1)+'万円/年';
  if($('voluntaryRouteCost'))$('voluntaryRouteCost').textContent=vol===null||pension===null?'--':(vol+pension).toFixed(1)+'万円/年';
  if($('selectedRouteCost')){$('selectedRouteCost').textContent=Number.isFinite(sel.cost)?sel.cost.toFixed(1)+'万円/年':sel.status;$('selectedRouteCost').className=Number.isFinite(sel.cost)?'good':'warn'}
  if($('selectedRouteDetail'))$('selectedRouteDetail').textContent=sel.detail;
  if($('transitionSuggestion'))$('transitionSuggestion').textContent=trans===null?'--':trans.toFixed(1)+'万円';
  const body=$('corpScenarioRows');
  if(body){
    body.innerHTML=[0,6,10,20,30].map(m=>{
      const c=corporateScenario(m);
      return `<tr>
        <td><b>${m}万円/月</b></td>
        <td>${c.healthStd===null?'--':c.healthStd.toFixed(1)+'万'}</td>
        <td>${c.pensionStd===null?'--':c.pensionStd.toFixed(1)+'万'}</td>
        <td>${c.employee===null?'--':c.employee.toFixed(1)+'万/年'}</td>
        <td>${c.employer===null?'--':c.employer.toFixed(1)+'万/年'}</td>
        <td>${c.net===null?'--':c.net.toFixed(1)+'万/年'}</td>
        <td>${c.groupLeakage===null?'--':c.groupLeakage.toFixed(1)+'万/年'}</td>
        <td class="${c.status==='CHECK'?'warn':''}">${c.status}</td>
      </tr>`;
    }).join('');
  }
}
