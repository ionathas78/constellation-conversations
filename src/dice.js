/** Bounded recursive-descent dice grammar. No dynamic code evaluation. */
const LIMIT = {count:100,sides:1000000,draws:2000,depth:16,length:300};
export function secureInteger(sides) {
  const range=4294967296, ceiling=range-range%sides;
  let n; do { n=globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; } while(n>=ceiling);
  return n%sides+1;
}
export function parseDice(source) {
  if(typeof source!=='string'||source.length>LIMIT.length) throw Error('Use an expression of at most 300 characters.');
  const s=source.toLowerCase().replace(/\s+/g,'').replace(/\badv\b/g,'2d20kh1').replace(/\bdis\b/g,'2d20kl1');
  let i=0,depth=0,totalDice=0;
  const take=re=>{const m=s.slice(i).match(re);if(m){i+=m[0].length;return m[0];}};
  function atom(){
    if(++depth>LIMIT.depth) throw Error('Expression nesting is too deep.');
    let node;
    if(take(/^\(/)){node=expression();if(!take(/^\)/))throw Error('Missing closing parenthesis.');}
    else if(take(/^[+-]/)){const sign=s[i-1];node={type:'unary',sign,child:atom()};}
    else {
      const start=i, n=take(/^\d+/);
      if(take(/^d/)){
        const count=n?Number(n):1, sides=Number(take(/^\d+/));
        totalDice+=count;
        if(!Number.isSafeInteger(count)||count<1||totalDice>LIMIT.count||!Number.isSafeInteger(sides)||sides<2||sides>LIMIT.sides)throw Error('Use at most 100 dice, with 2–1,000,000 sides.');
        node={type:'dice',count,sides,mods:[]};const seen=new Set();
        while(true){
          const mod=take(/^(kh|kl|dh|dl)\d+|^!|^ro?(?:>=|<=|=|>|<)\d+|^cs(?:>=|<=|=|>|<)\d+/);
          if(!mod)break;
          const kind=mod.match(/^(kh|kl|dh|dl|ro|r|cs|!)/)[0];
          const family=['kh','kl','dh','dl'].includes(kind)?'keep':kind==='ro'?'r':kind;
          if(seen.has(family))throw Error('Use each modifier family only once per dice term.');seen.add(family);
          if(family==='keep'&&Number(mod.slice(2))>count)throw Error('Keep/drop count exceeds dice count.');
          node.mods.push(mod);
        }
        node.label=s.slice(start,i);
      }else if(n) {const value=Number(n);if(!Number.isSafeInteger(value)||value>1e9)throw Error('Constant is too large.');node={type:'number',value};}
      else throw Error('Expected a number, dice term, or parentheses.');
    }
    depth--;return node;
  }
  function product(){let node=atom();while(/[*/]/.test(s[i]||' ')&&i<s.length){const op=s[i++];node={type:'binary',op,left:node,right:atom()};}return node;}
  function expression(){let node=product();while(/[+-]/.test(s[i]||' ')&&i<s.length){const op=s[i++];node={type:'binary',op,left:node,right:product()};}return node;}
  const ast=expression();if(i!==s.length)throw Error(`Unexpected token at position ${i+1}.`);return ast;
}
export function compare(value,op,target){return ({'>':()=>value>target,'>=':()=>value>=target,'<':()=>value<target,'<=':()=>value<=target,'=':()=>value===target})[op]?.()??false;}
export function rollDice(source,random=secureInteger){
  const ast=parseDice(source),terms=[];let draws=0;
  const draw=sides=>{if(++draws>LIMIT.draws)throw Error('Roll limit reached; simplify rerolls or explosions.');const n=random(sides);if(!Number.isInteger(n)||n<1||n>sides)throw Error('Invalid random result.');return n;};
  function run(n){
    if(n.type==='number')return n.value;
    if(n.type==='unary')return (n.sign==='-'?-1:1)*run(n.child);
    if(n.type==='binary'){const a=run(n.left),b=run(n.right);if(n.op==='/'&&b===0)throw Error('Division by zero.');const v=({'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b})[n.op]();if(!Number.isFinite(v)||Math.abs(v)>1e12)throw Error('Result exceeds calculation limits.');return v;}
    const reroll=n.mods.find(x=>x.startsWith('r')),explode=n.mods.includes('!');
    const test=reroll?.match(/^(ro?)(>=|<=|=|>|<)(\d+)$/);
    const dice=Array.from({length:n.count},()=>{let value=draw(n.sides),history=[value],parts=[];
      function rer(){let attempts=0;while(test&&compare(value,test[2],Number(test[3]))){if(++attempts>100)throw Error('Reroll limit reached.');value=draw(n.sides);history.push(value);if(test[1]==='ro')break;}}
      rer();parts.push(value);let explosions=0;while(explode&&value===n.sides){if(++explosions>100)throw Error('Explosion limit reached.');value=draw(n.sides);history.push(value);rer();parts.push(value);}return {value:parts.reduce((a,b)=>a+b,0),history,parts,kept:true};});
    const keep=n.mods.find(x=>/^[kd][hl]/.test(x));
    if(keep){const kind=keep.slice(0,2),amount=Number(keep.slice(2)),order=dice.map((d,i)=>({i,v:d.value})).sort((a,b)=>(kind.endsWith('h')?b.v-a.v:a.v-b.v)||a.i-b.i);if(kind[0]==='k')dice.forEach(d=>d.kept=false);order.slice(0,amount).forEach(x=>dice[x.i].kept=kind[0]==='k');}
    const success=n.mods.find(x=>x.startsWith('cs'))?.match(/^cs(>=|<=|=|>|<)(\d+)$/);
    const value=dice.filter(d=>d.kept).reduce((a,d)=>a+(success?Number(compare(d.value,success[1],Number(success[2]))):d.value),0);
    terms.push({expression:n.label,dice,value,successes:!!success});return value;
  }
  const total=run(ast);return {expression:source,total,terms,draws};
}
