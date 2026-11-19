/* Чистые функции модели. Все значения в демонстрации синтетические. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HomeModel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function forecast(history,now,regimeStart=-Infinity){
 const p=history.filter(x=>Number.isFinite(x.t)&&Number.isFinite(x.co2)&&x.t>=now-15&&x.t>=regimeStart&&x.t<=now);
 if(!p.length||now-p[p.length-1].t>2)return {valid:false,reason:'Нет свежих показаний'};
 if(p.length<5||p[p.length-1].t-p[0].t<4)return {valid:false,reason:'Нужно 5 точек после смены режима'};
 const mt=p.reduce((s,x)=>s+x.t,0)/p.length,mc=p.reduce((s,x)=>s+x.co2,0)/p.length;
 const den=p.reduce((s,x)=>s+(x.t-mt)**2,0);if(den===0)return {valid:false,reason:'Недостаточный интервал'};
 const slope=p.reduce((s,x)=>s+(x.t-mt)*(x.co2-mc),0)/den;
 return {valid:true,value:clamp(mc+slope*(now+15-mt),420,5000),slope};
}
function economy(o){
 const {rooms,annual,saving,tariff,nodeCost,hubCost,hubWatts}=o;
 if(![rooms,annual,saving,tariff,nodeCost,hubCost,hubWatts].every(Number.isFinite)||rooms<1||rooms>100||annual<0||saving<0||saving>100||tariff<0||nodeCost<0||hubCost<0||hubWatts<0)throw Error('Проверьте параметры расчёта');
 const capital=rooms*nodeCost+hubCost,gross=rooms*annual*saving/100*tariff,hubEnergy=hubWatts/1000*8760,net=gross-hubEnergy*tariff;
 return {capital,gross,hubEnergy,net,payback:net>0?capital/net:null};
}
function devices(s,config){
 const fresh=s.online&&s.t-s.lastReading<=2;
 const f=forecast(s.history,s.t,s.regimeStart);
 const fan=fresh&&config.autoVent&&!s.window&&s.highMinutes>=2;
 const eco=s.t-s.lastMotion>=30;
 const heater=fresh&&config.autoHeat&&!s.window&&!eco&&s.temp<config.target;
 return {fresh,fan,heater,eco,forecast:f};
}
function initial(){return {t:15,co2:920,temp:22.6,humidity:46,people:3,window:false,online:true,lastReading:15,lastMotion:15,highMinutes:0,regimeStart:-Infinity,history:Array.from({length:16},(_,t)=>({t,co2:770+10*t})),energy:0,logs:[]};}
function step(old,config){
 const s=JSON.parse(JSON.stringify(old));if(old.regimeStart===-Infinity)s.regimeStart=-Infinity;
 const d=devices(old,config);s.t++;
 if(s.people>0)s.lastMotion=s.t;
 if(s.online){
  const exchange=s.window?0.12:d.fan?0.07:0.007;
  s.co2=clamp(s.co2+s.people*6-(s.co2-420)*exchange,420,5000);
  s.temp=clamp(s.temp+(d.heater?0.09:0)-(s.temp-18)*(s.window?0.025:0.002),10,35);
  s.humidity=clamp(s.humidity+s.people*0.015-(s.humidity-40)*(s.window?0.04:0.003),10,90);
  s.lastReading=s.t;s.history.push({t:s.t,co2:s.co2});s.history=s.history.slice(-180);
  s.highMinutes=s.co2>config.threshold?s.highMinutes+1:0;
 }else{s.highMinutes=0;}
 const power=8+(d.fan?25:0)+(d.heater?500:0);s.energy+=power/1000/60;
 return s;
}
return {forecast,economy,devices,initial,step,clamp};
});
