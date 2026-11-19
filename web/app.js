'use strict';
const M=HomeModel,$=id=>document.getElementById(id),fmt=(n,d=0)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
const defaults={autoVent:true,autoHeat:false,threshold:1000,target:22};let config={...defaults},state=M.initial(),timer=null,lastDevices='',storageOK=true;
try{const p=JSON.parse(localStorage.getItem('aiot-home-settings')||'null');if(p&&typeof p==='object'){for(const k of ['autoVent','autoHeat'])if(typeof p[k]==='boolean')config[k]=p[k];if(Number.isFinite(p.threshold))config.threshold=M.clamp(p.threshold,600,2000);if(Number.isFinite(p.target))config.target=M.clamp(p.target,16,28);}}catch(e){storageOK=false;}
for(const k of Object.keys(config)){if(typeof config[k]==='boolean')$(k).checked=config[k];else $(k).value=config[k];}
function log(text){state.logs.unshift({t:state.t,text});state.logs=state.logs.slice(0,100);}
function save(){try{localStorage.setItem('aiot-home-settings',JSON.stringify(config));}catch(e){storageOK=false;}}
function forecastNow(){return state.online?M.forecast(state.history,state.t,state.regimeStart):{valid:false,reason:'Связь потеряна, прогноз отключён'};}
function chart(f){
 const width=760,height=260,left=48,right=18,top=18,bottom=32,start=Math.max(0,state.t-30),end=state.t+15;
 const hist=state.history.filter(p=>p.t>=start),vals=hist.map(p=>p.co2);if(f.valid)vals.push(f.value);vals.push(config.threshold);
 const ymax=Math.ceil(Math.max(1200,...vals)/200)*200,ymin=400,x=t=>left+(t-start)/(end-start)*(width-left-right),y=c=>height-bottom-(c-ymin)/(ymax-ymin)*(height-top-bottom);
 let svg='';for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;svg+='<line x1="'+left+'" y1="'+y(v)+'" x2="'+(width-right)+'" y2="'+y(v)+'" stroke="#e7eef0"/><text x="35" y="'+(y(v)+4)+'" text-anchor="end" fill="#74848c" font-size="11">'+Math.round(v)+'</text>';}
 svg+='<line x1="'+left+'" y1="'+y(config.threshold)+'" x2="'+(width-right)+'" y2="'+y(config.threshold)+'" stroke="#cc9141" stroke-dasharray="5 5"/>';
 const points=hist.map(p=>x(p.t)+','+y(p.co2)).join(' ');svg+='<polyline points="'+points+'" fill="none" stroke="#007f82" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
 if(f.valid)svg+='<line x1="'+x(state.t)+'" y1="'+y(state.co2)+'" x2="'+x(end)+'" y2="'+y(f.value)+'" stroke="#007f82" stroke-width="2" stroke-dasharray="6 5"/>';
 svg+='<line x1="'+x(state.t)+'" y1="'+top+'" x2="'+x(state.t)+'" y2="'+(height-bottom)+'" stroke="#a9bcbd" stroke-dasharray="3 5"/>';
 for(const t of [start,state.t,end])svg+='<text x="'+x(t)+'" y="'+(height-8)+'" text-anchor="middle" fill="#74848c" font-size="11">'+(t===state.t?'Сейчас':t===end?'+15 мин':t+' мин')+'</text>';
 $('chart').innerHTML=svg;
}
function render(){
 const d=M.devices(state,config),f=forecastNow(),power=8+(d.fan?25:0)+(d.heater?500:0);
 $('co2').innerHTML=(d.fresh?fmt(state.co2):'—')+' <small>ppm</small>';$('temp').innerHTML=(d.fresh?fmt(state.temp,1):'—')+' <small>°C</small>';$('humidity').innerHTML=(d.fresh?fmt(state.humidity):'—')+' <small>%</small>';
 $('co2Status').textContent=!d.fresh?'Нет свежих показаний':state.co2>config.threshold?'Выше рабочего порога':'Ниже рабочего порога';$('power').innerHTML=fmt(power)+' <small>Вт</small>';$('energy').textContent='За сеанс: '+fmt(state.energy,3)+' кВт·ч';
 $('simTime').textContent='Модельное время: '+state.t+' мин';$('prediction').textContent=f.valid?fmt(f.value)+' ppm':'Нет прогноза';$('forecastText').textContent=!f.valid?f.reason:f.value>config.threshold?'Возможен рост выше порога. Проверьте вентиляцию.':'При сохранении текущего тренда порог не будет превышен.';
 $('people').value=state.people;$('peopleValue').textContent=state.people;$('window').checked=state.window;$('online').checked=state.online;$('linkStatus').textContent=state.online?'Показания поступают':'Связь потеряна';$('fan').textContent=d.fan?'Вкл.':'Выкл.';$('heater').textContent=d.heater?'Вкл.':'Выкл.';$('eco').textContent=d.eco?'Эко':'Комфорт';
 const ds=[d.fan,d.heater,d.eco,d.fresh].join();if(lastDevices&&lastDevices!==ds)log('Состояние: вентиляция '+(d.fan?'вкл.':'выкл.')+', обогрев '+(d.heater?'вкл.':'выкл.')+', '+(d.eco?'Эко':'Комфорт')+(d.fresh?'':', нет данных'));lastDevices=ds;
 $('log').replaceChildren(...state.logs.slice(0,30).map(item=>{const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.textContent=item.t+' мин';text.textContent=item.text;li.append(time,text);return li;}));
 $('saveStatus').textContent=storageOK?'Настройки сохраняются только в этом браузере. Журнал доступен для экспорта.':'Хранилище браузера недоступно. Работа продолжается, журнал можно экспортировать.';chart(f);
}
function pause(){if(timer){clearInterval(timer);timer=null;}$('play').textContent='Запустить модель';}
function advance(n=1){for(let i=0;i<n;i++)state=M.step(state,config);render();}
$('play').addEventListener('click',()=>{if(timer)pause();else{timer=setInterval(()=>advance(),2000);$('play').textContent='Пауза';}});$('step').addEventListener('click',()=>advance(5));
$('people').addEventListener('input',e=>{state.people=Number(e.target.value);if(state.people)state.lastMotion=state.t;render();});
$('window').addEventListener('change',e=>{state.window=e.target.checked;state.regimeStart=state.t;state.highMinutes=0;log(state.window?'Окно открыто, прогноз собирается заново':'Окно закрыто, прогноз собирается заново');render();});
$('online').addEventListener('change',e=>{state.online=e.target.checked;state.regimeStart=state.t;log(state.online?'Связь восстановлена, ожидаются свежие точки':'Потеря связи, команды по датчикам блокируются');render();});
for(const k of Object.keys(config))$(k).addEventListener('change',e=>{const el=e.target;if(!el.checkValidity()){el.reportValidity();el.value=config[k];return;}config[k]=el.type==='checkbox'?el.checked:Number(el.value);if(k==='threshold')state.highMinutes=0;save();log('Изменены настройки сценариев');render();});
function reset(){pause();state=M.initial();lastDevices='';log('Учебная модель запущена. Все показания синтетические.');render();}
$('reset').addEventListener('click',reset);
for(const el of document.querySelectorAll('[data-preset]'))el.addEventListener('click',()=>{
 pause();state=M.initial();lastDevices='';const p=el.dataset.preset;
 if(p==='stuffy'){state.people=8;state.co2=1200;state.history=Array.from({length:16},(_,t)=>({t,co2:900+t*20}));state.highMinutes=2;log('Ситуация: душная аудитория, 8 человек');}
 if(p==='window'){state.window=true;state.co2=1250;state.history=Array.from({length:16},(_,t)=>({t,co2:950+t*20}));state.regimeStart=state.t;log('Ситуация: окно открыто. Прогноз временно отключён');}
 if(p==='empty'){state.people=0;state.lastMotion=state.t-31;log('Ситуация: 31 минута без людей, режим Эко');}
 if(p==='offline'){state.online=false;log('Ситуация: потеря связи, управление заблокировано');}
 render();
});
const econIds=['rooms','annual','saving','tariff','nodeCost','hubCost','hubWatts'];
function calculate(){try{for(const id of econIds)if(!$(id).checkValidity()||$(id).value==='')throw Error('Заполните все поля допустимыми числами.');const e=M.economy(Object.fromEntries(econIds.map(k=>[k,Number($(k).value)])));$('payback').innerHTML=e.payback===null?'Не достигается':fmt(e.payback,2)+' <small>года</small>';$('capital').textContent=fmt(e.capital,2)+' ₽';$('gross').textContent=fmt(e.gross,2)+' ₽';$('net').textContent=fmt(e.net,2)+' ₽/год';$('calcError').textContent='';}catch(e){$('calcError').textContent=e.message;$('payback').textContent='—';for(const id of ['capital','gross','net'])$(id).textContent='—';}}
for(const id of econIds)$(id).addEventListener('input',calculate);
$('export').addEventListener('click',()=>{const payload={application:'Умный дом для всех',version:'1.0.0',mode:'simulation',exportedAt:new Date().toISOString(),config,state:{...state,regimeStart:Number.isFinite(state.regimeStart)?state.regimeStart:null}};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aiot-home-simulation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);log('Журнал и история экспортированы в JSON');render();});
for(const a of document.querySelectorAll('nav a'))a.addEventListener('click',()=>{document.querySelector('nav a.active')?.classList.remove('active');a.classList.add('active');});
reset();calculate();
