import {preparedData} from './sample-data.mjs';
import {parseWorksheetFile,normalizeState,setKnownReadings} from './data-format.mjs';
import {token,reconcile,isKanji,worksheet,hira,layout} from './core.mjs';
import {suggestReadings} from './readings.mjs';
import {worksheetPdf} from './pdf.mjs';
const $=id=>document.getElementById(id);
const state={fontChoice:'ud',printMode:'combined',batch:[],batchIndex:0,newKanji:'',showKnownReadings:true,unitName:'',studentName:'',printUnit:true,grade:'',marker:'',printMeta:true,printName:true,upper:5,lower:5,rows:2,guides:true,divider:false,numberVisible:Array(30).fill(true),questions:Array.from({length:30},()=>[])};
Object.assign(state,normalizeState(preparedData.sheets[0].state));
const storageKey='kanji-print-maker-v1',draftKey=storageKey+'-draft';
let savedSheets=[],storageError='',draftTimer;
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))savedSheets=saved;const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(validState(draft))Object.assign(state,draft)}catch(e){storageError='ブラウザの保存を利用できません。入力内容はこの画面で編集できます。'}
function validState(s){return s&&Array.isArray(s.questions)&&s.questions.length===30&&s.questions.every(q=>Array.isArray(q)&&q.every(t=>t&&typeof t.char==='string'&&typeof t.reading==='string'))&&Number.isInteger(s.upper)&&s.upper>=1&&s.upper<=15&&Number.isInteger(s.lower)&&s.lower>=0&&s.lower<=15}
function saveDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{localStorage.setItem(draftKey,JSON.stringify(state))}catch(e){$('saveStatus').textContent='自動保存できませんでした。ブラウザの空き容量や保存設定を確認してください。'}},250)}
state.questions=state.questions.map(q=>q.map(t=>t.mode==='kana'?{...t,mode:'text'}:t));
let half=0,selected={question:0,char:0};
let pdfUrl;
function preview(){saveDraft();if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;$('pdfResult').replaceChildren()}captureBatch();const results=outputSheets().map(worksheet),result=results[0];$('paper').innerHTML=results.map(r=>'<div class=print-page>'+r.svg+'</div>').join('');$('metrics').textContent=`${results.length}枚 ／ ${results.reduce((n,r)=>n+r.count,0)}問 ／ 升目 約${result.box.toFixed(1)}mm ／ ${result.single?'１段':'２段'}`;
const visible=[...state.questions.slice(0,state.upper),...state.questions.slice(15,15+result.shownLower)].flat();let missing=visible.filter(t=>isKanji(t.char)&&t.showReading!==false&&!t.reading).length;
const notice=result.single&&state.lower>0?'一段を選んでいるため、下半分は印刷しません。入力内容は保持しています。 ':''; $('status').textContent=notice+(missing?`読みが未入力の文字が${missing}個あります。文字を選んで、読みを入力してください。`:result.box<8?'問題数や文の長さによって、升目が小さくなっています。配置を確認してください。':'');$('bottomTab').textContent=state.lower===0?'下半分（なし）':result.single?'下半分（印刷対象外）':'下半分';$('bottomTab').disabled=state.lower===0;}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function renderQuestions(){const container=$('questions');container.replaceChildren();let count=half?state.lower:state.upper;for(let i=0;i<count;i++){const idx=(half?15:0)+i,q=state.questions[idx];const card=el('div',undefined,'question');const head=el('div',undefined,'qhead');const number=i+1+(half?state.upper:0),numberButton=el('button',`${number} 番号：${state.numberVisible[idx]?'表示':'非表示'}`,'number-toggle');numberButton.setAttribute('aria-label',`問題${number}の番号表示を切り替え`);numberButton.setAttribute('aria-pressed',String(state.numberVisible[idx]));numberButton.onclick=()=>{state.numberVisible[idx]=!state.numberVisible[idx];numberButton.textContent=`${number} 番号：${state.numberVisible[idx]?'表示':'非表示'}`;numberButton.setAttribute('aria-pressed',String(state.numberVisible[idx]));preview()};head.append(numberButton);const inp=el('input');inp.value=q.map(t=>t.char).join('');inp.maxLength=40;inp.placeholder='単語や短い文を入力';inp.setAttribute('aria-label',`問題${i+1+(half?state.upper:0)}`);head.append(inp);card.append(head);const body=el('div');card.append(body);container.append(card);
const renderBody=()=>{body.replaceChildren();const chips=el('div',undefined,'chips');state.questions[idx].forEach((t,j)=>{const b=el('button',t.char,`chip ${t.mode} ${selected.question===idx&&selected.char===j?'active':''}`);b.setAttribute('aria-label',`${t.char}：${{blank:'空欄升',kana:'ひらがな',text:'そのまま'}[t.mode]}`);b.onclick=()=>{selected={question:idx,char:j};renderQuestions()};chips.append(b)});body.append(chips);if(selected.question===idx&&state.questions[idx][selected.char]){const t=state.questions[idx][selected.char],edit=el('div',undefined,'editbox');edit.append(el('strong',`「${t.char}」の表示`));const modes=el('div',undefined,'modes');for(const [mode,label]of [['text','そのまま'],['blank','空欄升']]){const b=el('button',label,t.mode===mode?'active':'');b.onclick=()=>{t.mode=mode;t.isNew=mode==='blank';if(t.mode==='text'&&state.showKnownReadings===false)t.showReading=false;preview();renderBody()};modes.append(b)}edit.append(modes);const label=el('label','読み・ふりがな（編集できます）');const read=el('input');read.value=t.reading;read.placeholder='例：がく';read.setAttribute('aria-label',`${t.char}の読み`);read.maxLength=20;read.oninput=()=>{t.reading=hira(read.value);t.readingSource='manual';preview()};label.append(read);edit.append(label);if(isKanji(t.char)){const show=el('label',undefined,'reading-toggle'),check=el('input');check.type='checkbox';check.checked=t.showReading!==false;check.onchange=()=>{t.showReading=check.checked;preview()};show.append(check,document.createTextNode('ふりがなを表示する'));edit.append(show)}edit.append(el('p','漢字・空欄升の右側に表示します。予測した読みは確認・修正してください。','helper'));body.append(edit)}};
inp.addEventListener('input',()=>{state.questions[idx]=suggestReadings(reconcile(inp.value,state.questions[idx])).map(t=>{if(typeof t.isNew==='boolean'||!isKanji(t.char)||!state.newKanji)return t;const isNew=state.newKanji.includes(t.char);return {...t,isNew,mode:isNew?'blank':'text',showReading:isNew||state.showKnownReadings!==false}});if(selected.question===idx&&selected.char>=state.questions[idx].length)selected.char=Math.max(0,state.questions[idx].length-1);renderBody();preview()});renderBody()}}
for(const key of ['unitName','grade','marker','studentName'])$(key).oninput=()=>{state[key]=$(key).value;preview()};for(const key of ['upper','lower']){$(key).onchange=()=>{const min=key==='upper'?1:0,v=Math.trunc(Number($(key).value));state[key]=Math.max(min,Math.min(15,Number.isFinite(v)?v:5));$(key).value=state[key];state.rows=state.upper>=10||state.lower>0?2:1;$('oneRow').checked=state.rows===1;$('twoRows').checked=state.rows===2;if(key==='lower'&&state.lower===0&&half)tab(0);renderQuestions();preview()}}for(const key of ['guides','divider','printUnit','printMeta','printName'])$(key).onchange=()=>{state[key]=$(key).checked;preview()};
for(const [id,rows] of [['oneRow',1],['twoRows',2]])$(id).onchange=()=>{state.rows=rows;$('oneRow').checked=rows===1;$('twoRows').checked=rows===2;preview()};
function tab(h){half=h;selected={question:h?15:0,char:0};$('topTab').classList.toggle('active',!h);$('bottomTab').classList.toggle('active',!!h);$('topTab').setAttribute('aria-selected',String(!h));$('bottomTab').setAttribute('aria-selected',String(!!h));renderQuestions()}
$('topTab').onclick=()=>tab(0);$('bottomTab').onclick=()=>tab(1);$('print').onclick=()=>window.print();syncFields();refreshSaved();renderQuestions();preview();
if(document.modelContext?.registerTool){try{document.modelContext.registerTool({name:'read_worksheet',description:'Read the current worksheet questions, character display modes, readings and A4 cell size.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({unitName:state.unitName,studentName:state.studentName,printUnit:state.printUnit,grade:state.grade,marker:state.marker,printMeta:state.printMeta,printName:state.printName,upper:state.upper,lower:state.lower,numberVisible:state.numberVisible,questions:[...state.questions.slice(0,state.upper),...state.questions.slice(15,15+state.lower)],box:worksheet(state).box})})}catch(e){console.warn('Tool registration unavailable')}}

$('pdf').onclick=async()=>{
 const button=$('pdf');button.disabled=true;button.textContent='PDFを作っています…';
 try{const blob=await worksheetPdf(outputSheets().map(s=>worksheet(s).svg));if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(blob);
 const link=el('a','PDFを開く');link.href=pdfUrl;link.target='_blank';link.rel='noopener';
 const note=el('p','PC・タブレットで使えます。「PDFを開く」または「PDFを保存」を選んでください。iPadでは開いたPDFの共有メニューから印刷できます。');
 const save=el('a','PDFを保存');save.href=pdfUrl;save.download='kanji-print.pdf';save.style.marginLeft='8px';
 $('pdfResult').replaceChildren(link,save,note);$('pdfResult').scrollIntoView({block:'nearest'});
 }catch(e){$('pdfResult').textContent='PDFを作れませんでした。ページを再読み込みしてお試しください。iPadではSafariで開いてください。';console.error(e)}
 finally{button.disabled=false;button.textContent='PDFを作る'}
};

function syncFields(){ $('fontChoice').value=state.fontChoice||'ud';$('printMode').value=state.printMode||'combined';refreshBatch();$('newKanji').value=state.newKanji||'';$('showKnownReadings').checked=state.showKnownReadings!==false;for(const key of ['unitName','grade','marker','studentName','upper','lower'])$(key).value=state[key]||'';for(const key of ['guides','divider','printUnit','printMeta','printName'])$(key).checked=state[key]!==false;$('oneRow').checked=state.rows===1;$('twoRows').checked=state.rows!==1;}
function refreshSaved(id=''){const select=$('savedSheets');select.replaceChildren(new Option('選んでください',''));for(const item of savedSheets)select.append(new Option(item.name,item.id));select.value=id;$('saveOverwrite').disabled=!id;$('loadSheet').disabled=!id;$('deleteSheet').disabled=!id;$('exportAllSaved').disabled=savedSheets.length===0;if(storageError)$('saveStatus').textContent=storageError;}
function commitSaved(next,id,message){try{localStorage.setItem(storageKey,JSON.stringify(next));savedSheets=next;refreshSaved(id);$('saveStatus').textContent=message;return true}catch(e){$('saveStatus').textContent='保存できませんでした。ブラウザの空き容量や保存設定を確認してください。';return false}}
$('savedSheets').onchange=()=>{const item=savedSheets.find(s=>s.id===$('savedSheets').value);if(item)$('saveName').value=item.name;const id=$('savedSheets').value;for(const key of ['saveOverwrite','loadSheet','deleteSheet'])$(key).disabled=!id;};
$('saveNew').onclick=()=>{const id=globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random();const name=$('saveName').value.trim()||state.unitName||'漢字プリント '+new Date().toLocaleString('ja-JP');commitSaved([...savedSheets,{id,name,state:structuredClone(state)}],id,'保存しました。');};
$('saveOverwrite').onclick=()=>{const id=$('savedSheets').value,item=savedSheets.find(s=>s.id===id);if(!item)return;commitSaved(savedSheets.map(s=>s.id===id?{id,name:$('saveName').value.trim()||item.name,state:structuredClone(state)}:s),id,'上書き保存しました。');};
$('loadSheet').onclick=()=>{const item=savedSheets.find(s=>s.id===$('savedSheets').value);if(!item||!validState(item.state)){ $('saveStatus').textContent='この保存データを開けません。';return;}Object.assign(state,normalizeState(item.state));state.questions=state.questions.map(q=>q.map(t=>t.mode==='kana'?{...t,mode:'text'}:t));syncFields();tab(0);preview();$('saveStatus').textContent='保存したプリントを開きました。';};
$('deleteSheet').onclick=()=>{const id=$('savedSheets').value;if(id)commitSaved(savedSheets.filter(s=>s.id!==id),'','選んだ保存データを削除しました。編集中の内容は残っています。');};
let beforeClear;
$('clearAll').onclick=()=>{beforeClear=structuredClone(state);state.batch=[];state.batchIndex=0;state.questions=Array.from({length:30},()=>[]);state.numberVisible=Array(30).fill(true);state.newKanji='';state.showKnownReadings=true;for(const key of ['unitName','grade','marker','studentName'])state[key]='';syncFields();tab(0);preview();$('undoClear').hidden=false;$('saveStatus').textContent='問題・単元名・学年・ページ・名前を消しました。保存したプリントは残っています。';};
$('undoClear').onclick=()=>{if(!beforeClear)return;Object.assign(state,beforeClear);syncFields();tab(0);preview();beforeClear=null;$('undoClear').hidden=true;$('saveStatus').textContent='消す前に戻しました。';};
window.addEventListener('pagehide',()=>{try{localStorage.setItem(draftKey,JSON.stringify(state))}catch(e){}});

function openWorksheet(sheet){
 Object.assign(state,normalizeState(sheet.state));
 $('saveName').value=sheet.name;syncFields();tab(0);preview();
}
function flatQuestions(s){return [...s.questions.slice(0,s.upper),...s.questions.slice(15,15+s.lower)].map(q=>structuredClone(q))}
function captureBatch(){if(state.printMode==='separate'&&state.batch?.length){const copy=structuredClone(state);delete copy.batch;state.batch[state.batchIndex||0].state=copy}}
function refreshBatch(){const select=$('editUnit');select.replaceChildren();for(const [i,s] of (state.batch||[]).entries())select.append(new Option(s.name,String(i)));select.value=String(state.batchIndex||0);$('editUnitLabel').hidden=state.printMode!=='separate'||!state.batch?.length}
function outputSheets(){if(state.printMode==='separate'&&state.batch?.length)return state.batch.map(s=>({...s.state,fontChoice:state.fontChoice,studentName:state.studentName,printName:state.printName,printUnit:state.printUnit,printMeta:state.printMeta,guides:state.guides,divider:state.divider}));return [state]}
function combineSheets(sheets){const qs=sheets.flatMap(s=>flatQuestions(s.state));if(qs.length>30)throw Error('１枚にまとめられるのは30問までです。「単元ごとに続けて印刷」を選んでください。');const flags=sheets.flatMap(({state:s})=>[...s.numberVisible.slice(0,s.upper),...s.numberVisible.slice(15,15+s.lower)]);const first=normalizeState(sheets[0].state),upper=Math.min(qs.length,qs.length<10?9:Math.ceil(qs.length/2)),lower=qs.length-upper;return {...first,unitName:sheets.map(s=>s.state.unitName||s.name).join('・'),newKanji:[...new Set(sheets.flatMap(s=>[...(s.state.newKanji||'')]))].join(''),upper,lower,rows:qs.length>=10?2:1,questions:Array.from({length:30},(_,i)=>i<upper?qs[i]:i>=15&&i<15+lower?qs[upper+i-15]:[]),numberVisible:Array.from({length:30},(_,i)=>i<upper?flags[i]:i>=15&&i<15+lower?flags[upper+i-15]:true)}}
const selectedUnits=new Set();
function unitGrade(sheet){return String(sheet.state.grade||sheet.name).match(/[1-6１-６]/)?.[0]?.replace(/[１-６]/g,c=>String(c.charCodeAt(0)-0xff10))||''}
function updateUnitSelection(){ $('unitSelectionStatus').textContent=`選択中：${selectedUnits.size}単元`;$('uncheckUnits').disabled=selectedUnits.size===0;}
function renderUnitList(){const grade=$('unitGrade').value;selectedUnits.clear();$('preparedSheets').replaceChildren();let count=0;for(const [i,sheet] of preparedData.sheets.entries()){if(unitGrade(sheet)!==grade)continue;count++;const label=el('label'),check=el('input');check.type='checkbox';check.value=String(i);check.onchange=()=>{check.checked?selectedUnits.add(i):selectedUnits.delete(i);updateUnitSelection()};label.append(check,document.createTextNode(sheet.name));$('preparedSheets').append(label)}if(!count)$('preparedSheets').append(el('p',`${grade}年の単元はまだ登録されていません。`,'helper'));updateUnitSelection()}
$('unitGrade').onchange=renderUnitList;
$('uncheckUnits').onclick=()=>{selectedUnits.clear();$('preparedSheets').querySelectorAll('input').forEach(c=>c.checked=false);updateUnitSelection()};
renderUnitList();
$('openPrepared').onclick=()=>{const sheets=[...selectedUnits].sort((a,b)=>a-b).map(i=>structuredClone(preparedData.sheets[i]));if(!sheets.length){$('dataStatus').textContent='単元を選んでください。';return}try{const mode=$('printMode').value,font=state.fontChoice;const next=mode==='combined'?combineSheets(sheets):normalizeState(sheets[0].state);Object.assign(state,next,{fontChoice:font,printMode:mode,batch:mode==='separate'?sheets:[],batchIndex:0});syncFields();tab(0);preview();$('dataStatus').textContent=sheets.length+'単元を開きました。選択した一覧の順に印刷します。'}catch(e){$('dataStatus').textContent=e.message}};
$('editUnit').onchange=()=>{captureBatch();const batch=state.batch,index=Number($('editUnit').value),font=state.fontChoice;Object.assign(state,normalizeState(batch[index].state),{batch,batchIndex:index,fontChoice:font,printMode:'separate'});syncFields();tab(0);preview()};
$('fontChoice').onchange=()=>{state.fontChoice=$('fontChoice').value;preview()};
$('printMode').onchange=()=>{captureBatch();const mode=$('printMode').value;if(mode==='combined'&&state.batch?.length){try{const next=combineSheets(state.batch),font=state.fontChoice;Object.assign(state,next,{fontChoice:font,batch:[],batchIndex:0,printMode:mode});syncFields();tab(0)}catch(e){$('printMode').value='separate';$('dataStatus').textContent=e.message;return}}state.printMode=mode;refreshBatch();preview()};
$('showKnownReadings').onchange=()=>{setKnownReadings(state,$('showKnownReadings').checked);renderQuestions();preview()};
$('newKanji').onchange=()=>{
 state.newKanji=$('newKanji').value;
 state.questions.forEach(q=>q.forEach(t=>{if(isKanji(t.char)){t.isNew=state.newKanji.includes(t.char);t.mode=t.isNew?'blank':'text';t.showReading=t.isNew||state.showKnownReadings!==false}}));
 renderQuestions();preview();
};
$('importData').onclick=()=>$('dataFile').click();
$('dataFile').onchange=async()=>{
 const file=$('dataFile').files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('データは5MB以内にしてください。');
  const sheets=parseWorksheetFile(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
  const newSheets=sheets.map(sheet=>({...sheet,id:globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random()}));
  const stored=commitSaved([...savedSheets,...newSheets],newSheets[0].id,`${sheets.length}件のプリントを保存しました。`);
  openWorksheet(newSheets[0]);
  $('dataStatus').textContent=stored?`${sheets.length}件を読み込みました。「保存したプリント」から単元を選んで「開く」を押してください。`:'最初のプリントを開きました。ブラウザに保存できないため、編集後はデータを書き出してください。';
 }catch(e){$('dataStatus').textContent='読み込めませんでした。'+e.message}
 finally{$('dataFile').value=''}
};
$('exportData').onclick=()=>{
 try{
  const sheet={id:globalThis.crypto?.randomUUID?.()||String(Date.now()),name:$('saveName').value.trim()||state.unitName||'漢字プリント',state:normalizeState(state)};
  const data={schema:'kanji-print-maker',version:1,sheets:[sheet]};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=el('a');link.href=url;link.download=(sheet.name.replace(/[\\/:*?"<>|]/g,'_')||'kanji-print')+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  $('dataStatus').textContent='編集したデータを書き出しました。別の端末でも読み込んで編集できます。';
 }catch(e){$('dataStatus').textContent='書き出せませんでした。'+e.message}
};

function downloadWorksheetData(sheets,filename){
 const data={schema:'kanji-print-maker',version:1,sheets};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const link=el('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('exportAllSaved').onclick=()=>{
 if(!savedSheets.length){$('saveStatus').textContent='保存したプリントがありません。先に「新しく保存」を押してください。';return}
 try{const sheets=savedSheets.map(item=>({id:item.id,name:item.name,state:normalizeState(item.state)}));downloadWorksheetData(sheets,'kanji-print-saved-'+new Date().toISOString().slice(0,10)+'.json');$('saveStatus').textContent=`保存した${sheets.length}件をまとめて書き出しました。未保存の編集内容は含まれません。`}
 catch(e){$('saveStatus').textContent='まとめて書き出せませんでした。'+e.message}
};
