// Local feedback uses the same body/speaker/uuid message fields as publications.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function newSessionUUID(source=globalThis.crypto){
 if(typeof source?.randomUUID==='function')return source.randomUUID();
 if(typeof source?.getRandomValues!=='function')throw Error('Secure randomness is unavailable in this browser.');
 const bytes=source.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export const FEEDBACK_LIMITS={messages:100,body:20000,total:250000};
export function restoreFeedback(value,publishedIDs){
 if(!value||value.version!==1||!Array.isArray(value.messages)||value.messages.length>FEEDBACK_LIMITS.messages)return {version:1,messages:[]};
 const known=new Map(publishedIDs.map(id=>[id,null])),threads=new Set(),roots=new Map();let size=0;
 for(const m of value.messages){
 if(!m||!UUID.test(m.uuid)||!UUID.test(m.threadUUID)||known.has(m.uuid)||m.speaker!=='session-reader'||typeof m.body!=='string'||!m.body.trim()||m.body.length>FEEDBACK_LIMITS.body||typeof m.createdAt!=='string'||Number.isNaN(Date.parse(m.createdAt)))return {version:1,messages:[]};
 size+=m.body.length;if(size>FEEDBACK_LIMITS.total)return {version:1,messages:[]};
 if(m.replyTo!==null&&!known.has(m.replyTo))return {version:1,messages:[]};
 const parentThread=known.get(m.replyTo);
 if(m.replyTo&&publishedIDs.includes(m.replyTo)){if(roots.has(m.replyTo)&&roots.get(m.replyTo)!==m.threadUUID)return {version:1,messages:[]};if(!roots.has(m.replyTo)&&threads.has(m.threadUUID))return {version:1,messages:[]};roots.set(m.replyTo,m.threadUUID);}if(parentThread&&parentThread!==m.threadUUID)return {version:1,messages:[]};
 if(m.replyTo===null&&threads.has(m.threadUUID))return {version:1,messages:[]};
 known.set(m.uuid,m.threadUUID);threads.add(m.threadUUID);
 }
 return {version:1,messages:value.messages.map(({uuid,threadUUID,replyTo,speaker,body,createdAt})=>({uuid,threadUUID,replyTo,speaker,body,createdAt}))};
}
export function appendFeedback(state,{body,replyTo=null},publishedIDs,makeUUID=newSessionUUID,now=()=>new Date().toISOString()){
 if(typeof body!=='string'||!body.trim())throw Error('Write a thought first.');
 if(body.length>FEEDBACK_LIMITS.body)throw Error('Keep a message within 20,000 characters.');
 if(state.messages.length>=FEEDBACK_LIMITS.messages||state.messages.reduce((n,m)=>n+m.body.length,0)+body.length>FEEDBACK_LIMITS.total)throw Error('This local session is full. Reset feedback to start again.');
 const parent=state.messages.find(m=>m.uuid===replyTo);if(replyTo&&!parent&&!publishedIDs.includes(replyTo))throw Error('The reply target is unavailable.');
 const thread=parent?.threadUUID||state.messages.find(m=>m.replyTo===replyTo&&replyTo)?.threadUUID||makeUUID();
 const message={uuid:makeUUID(),threadUUID:thread,replyTo,speaker:'session-reader',body:body.trim(),createdAt:now()};
 const next={version:1,messages:[...state.messages,message]};if(restoreFeedback(next,publishedIDs).messages.length!==next.messages.length)throw Error('Could not create a valid local message.');return next;
}
