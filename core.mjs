export const isKanji=c=>/[\p{Script=Han}々]/u.test(c);
export const hira=s=>[...s].map(c=>{let n=c.codePointAt(0);return n>=0x30a1&&n<=0x30f6?String.fromCodePoint(n-0x60):c}).join('');
export const token=(char,reading='')=>({char,reading,mode:isKanji(char)?'blank':'text'});
export function reconcile(text,old=[]){const cs=[...text],n=cs.length,m=old.length;const dp=Array.from({length:n+1},()=>Array(m+1).fill(0));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=cs[i]===old[j].char?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);let i=0,j=0,result=[];while(i<n){if(j<m&&cs[i]===old[j].char){result.push({...old[j]});i++;j++}else if(j<m&&dp[i][j+1]>dp[i+1][j])j++;else result.push(token(cs[i++]));}return result}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const visible=t=>t.mode==='kana'?hira(t.reading||t.char):t.char;
export const units=q=>q.reduce((n,t)=>n+(t.mode==='blank'?1:Math.max(1,[...visible(t)].length)),0);
// Compact kana spacing leaves more room for the answer squares.
export const heightUnits=q=>q.reduce((n,t)=>n+(t.mode==='blank'?1.02:Math.max(1,[...visible(t)].length)*.5),0);
export function layout(state){
 const upper=state.questions.slice(0,state.upper),lower=state.questions.slice(15,15+state.lower);
 const upperUnits=Math.max(1,...upper.map(heightUnits)),lowerUnits=Math.max(1,...lower.map(heightUnits));
 const upperTarget=Math.min(26,273/state.upper/1.42);
 const twoTarget=Math.min(upperTarget,state.lower?273/state.lower/1.42:upperTarget);
 // Do not shrink the upper row to accommodate the lower row.
 const single=state.lower===0||twoTarget<upperTarget-.01||twoTarget*(upperUnits+lowerUnits+1.17)+4>174;
 const box=single?Math.min(upperTarget,174/(upperUnits+.44)):twoTarget;
 const shownLower=single?0:state.lower;
 return {box,slot:273/state.upper,longest:Math.max(upperUnits,shownLower?lowerUnits:0),maxCount:Math.max(state.upper,shownLower),single,shownLower,lowerBase:12+(upperUnits+.73)*box+4,upperUnits,lowerUnits};
}
export function worksheet(state){const plan=layout(state),{box:s}=plan;const fam="'UD デジタル 教科書体 N-R','UD Digi Kyokasho N-R','UD デジタル 教科書体 NP-R','BIZ UDGothic','BIZ UDPGothic',sans-serif";let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="297mm" height="210mm" role="img" aria-label="A4漢字プリント"><rect width="297" height="210" fill="white"/><g fill="#111" font-family="${fam}">`;
const txt=(text,x,y,size,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" ${extra}>${esc(text)}</text>`;
if(state.printMeta!==false){
 if(state.grade)out+=`<text x="12" y="198" font-size="4">${esc(state.grade)}</text>`;
 if(state.marker)out+=`<text x="57" y="198" font-size="4">${esc(state.marker)}</text>`;
}
if(state.printUnit&&state.unitName)out+=`<text x="110" y="198" font-size="${Math.min(4,72/Math.max(1,[...state.unitName].length))}">${esc(state.unitName)}</text>`;
out+=`<text x="205" y="198" font-size="3.7">なまえ</text><path d="M220 199h62" stroke="#555" stroke-width=".3"/>`;
let regions=[];for(let half=0;half<(plan.shownLower?2:1);half++){let count=half?state.lower:state.upper,slot=273/count,base=half?plan.lowerBase:12;for(let qi=0;qi<count;qi++){const idx=(half?15:0)+qi,q=state.questions[idx],cx=285-slot*(qi+.5),x=cx-s/2;if(state.numberVisible?.[idx]!==false)out+=`<circle cx="${cx}" cy="${base}" r="${s*.29}" fill="none" stroke="#e55772" stroke-width=".45"/>`+txt(String(qi+1+(half?state.upper:0)),cx,base,s*.42);let y=base+s*.44;for(const t of q){if(t.mode==='blank'){out+=`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="white" stroke="#333" stroke-width=".35"/>`;if(state.guides)out+=`<path d="M${x+s/2} ${y}v${s}M${x} ${y+s/2}h${s}" fill="none" stroke="#bbb" stroke-width=".2" stroke-dasharray="1 1"/>`;const r=[...hira(t.reading)],rs=Math.min(s*.23,s*.9/Math.max(1,r.length));r.forEach((ch,k)=>{out+=txt(ch,x+s+rs*.85,y+s/2+(k-(r.length-1)/2)*rs*1.05,rs)});regions.push({question:idx,character:t.char,x,y,width:s,height:s});y+=s*1.02}else{const chars=[...visible(t)];for(const c of chars){out+=txt(c,cx,y+s*.25,s*.44,c==='ー'?`transform="rotate(90 ${cx} ${y+s*.25})"`:/[、。，．「」『』（）]/.test(c)?'style="writing-mode:vertical-rl;text-orientation:upright"':'');y+=s*.5}}}}}
if(state.divider&&plan.shownLower)out+=`<path d="M12 ${plan.lowerBase-s*.29-2}h273" stroke="#aaa" stroke-width=".25" stroke-dasharray="2 2"/>`;out+='</g></svg>';return {svg:out,regions,box:s,shownLower:plan.shownLower,single:plan.single}}
