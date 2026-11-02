/** Shared safe Markdown configuration for published messages and local drafts. */
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function browserURL(value){
 if(typeof value!=='string')throw Error('A URL is required.');
 if(value.startsWith('#'))return value;
 if(/^\/(?!\/)/.test(value)&&!value.includes('\\')&&!value.split(/[/?#]/).includes('..'))return value;
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use HTTPS or a local URL.');return url.href;
}
export function createMarkdownRenderer(MarkdownIt,{resolveURL=browserURL,math,highlight,emoji=()=>({}),renderEmoji}={}){
 const md=new MarkdownIt({html:false,linkify:true,typographer:false,breaks:true,highlight:highlight||((source)=>escapeHTML(source))});
 const image=md.renderer.rules.image;
 md.renderer.rules.image=(tokens,i,options,env,self)=>{const url=resolveURL(tokens[i].attrGet('src'));tokens[i].attrSet('src',url);tokens[i].attrSet('loading','lazy');const img=image(tokens,i,options,env,self);const linked=tokens.slice(0,i).reduce((n,t)=>n+(t.type==='link_open'?1:t.type==='link_close'?-1:0),0)>0;return linked?img:`<a data-fullsize href="${escapeHTML(url)}">${img}</a>`;};
 md.renderer.rules.link_open=(tokens,i,options,env,self)=>{const href=tokens[i].attrGet('href');tokens[i].attrSet('href',href?.startsWith('#')?href:resolveURL(href));tokens[i].attrSet('rel','noopener noreferrer');return self.renderToken(tokens,i,options);};
 if(math){
 md.inline.ruler.before('escape','math',(state,silent)=>{if(state.src[state.pos]!=='$')return false;const end=state.src.indexOf('$',state.pos+1);if(end<0||end===state.pos+1)return false;if(!silent){const token=state.push('math_inline','',0);token.content=state.src.slice(state.pos+1,end);}state.pos=end+1;return true;});
 md.renderer.rules.math_inline=(tokens,i)=>math.renderToString(tokens[i].content,{throwOnError:false,trust:false,strict:'warn',output:'htmlAndMathml'});
 md.block.ruler.before('fence','math_block',(state,start,end,silent)=>{const line=state.src.slice(state.bMarks[start]+state.tShift[start],state.eMarks[start]);if(line.trim()!=='$$')return false;let next=start+1;while(next<end&&state.src.slice(state.bMarks[next]+state.tShift[next],state.eMarks[next]).trim()!=='$$')next++;if(next===end)return false;if(silent)return true;const token=state.push('math_block','math',0);token.content=state.getLines(start+1,next,0,false);state.line=next+1;return true;});
 md.renderer.rules.math_block=(tokens,i)=>math.renderToString(tokens[i].content,{displayMode:true,throwOnError:false,trust:false,output:'htmlAndMathml'});
 }
 if(renderEmoji){md.inline.ruler.before('emphasis','custom_emoji',(state,silent)=>{const match=state.src.slice(state.pos).match(/^:([a-z0-9_-]+):/);if(!match||!emoji()[match[1]])return false;if(!silent){const token=state.push('custom_emoji','',0);token.content=match[1];}state.pos+=match[0].length;return true;});md.renderer.rules.custom_emoji=(tokens,i)=>renderEmoji(tokens[i].content);}
 return md;
}
