const han=c=>/[\p{Script=Han}々]/u.test(c);
export function normalizeState(s){
 if(!s||!Array.isArray(s.questions)||s.questions.length!==30||!Number.isInteger(s.upper)||s.upper<1||s.upper>15||!Number.isInteger(s.lower)||s.lower<0||s.lower>15)throw Error('プリントの形式が正しくありません。');
 const questions=s.questions.map(q=>{if(!Array.isArray(q)||q.length>40)throw Error('問題は40文字以内にしてください。');return q.map(t=>{if(!t||typeof t.char!=='string'||[...t.char].length!==1||typeof t.reading!=='string'||t.reading.length>20||!['text','blank','kana'].includes(t.mode))throw Error('文字・読み・空欄の形式が正しくありません。');return {char:t.char,reading:t.reading,mode:t.mode==='kana'?'text':t.mode,showReading:t.showReading!==false,readingSource:typeof t.readingSource==='string'?t.readingSource:'imported',isNew:typeof t.isNew==='boolean'?t.isNew:t.mode==='blank'};})});
 const text=(k,max)=>typeof s[k]==='string'?s[k].slice(0,max):'';
 return {fontChoice:['ud','kyokasho','gothic','mincho'].includes(s.fontChoice)?s.fontChoice:'ud',printMode:s.printMode==='separate'?'separate':'combined',batch:Array.isArray(s.batch)?s.batch.slice(0,100).map(x=>({name:String(x.name||''),state:normalizeState({...x.state,batch:undefined})})):[],batchIndex:Number.isInteger(s.batchIndex)?s.batchIndex:0,unitName:text('unitName',100),studentName:text('studentName',20),grade:text('grade',10),marker:text('marker',10),printUnit:s.printUnit!==false,printName:s.printName!==false,printMeta:s.printMeta!==false,upper:s.upper,lower:s.lower,rows:s.rows===1?1:2,guides:s.guides!==false,divider:s.divider===true,numberVisible:Array.from({length:30},(_,i)=>s.numberVisible?.[i]!==false),questions,showKnownReadings:s.showKnownReadings!==false,newKanji:text('newKanji',200),publisher:text('publisher',30),volume:text('volume',10),month:Number.isInteger(s.month)?s.month:null};
}
export function parseWorksheetFile(data){
 const rows=data?.schema==='kanji-print-maker'&&data.version===1?data.sheets:Array.isArray(data)?data:data?.questions?[{name:data.unitName||'漢字プリント',state:data}]:null;
 if(!Array.isArray(rows)||rows.length<1||rows.length>100)throw Error('読み込めるプリントデータではありません。');
 return rows.map((row,i)=>{if(!row||typeof row.name!=='string')throw Error('保存名がありません。');return {id:typeof row.id==='string'?row.id:'import-'+i,name:row.name.slice(0,100),state:normalizeState(row.state)}});
}
export function setKnownReadings(state,show){state.showKnownReadings=show;state.questions.forEach(q=>q.forEach(t=>{if(han(t.char)&&t.mode!=='blank'&&t.isNew!==true)t.showReading=show}));}
