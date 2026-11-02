import {compare,parseDice} from './dice.js';
const safeKey=k=>typeof k==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(k)&&!['constructor','prototype','__proto__'].includes(k);
const validValue=v=>Number.isFinite(v)||(typeof v==='string'&&v.length<=2000);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const FIELDS=new Set(['body','uuid','threadUUID','replyTo','tag','outcome']);
const OPS=new Set(['>','>=','<','<=','=','!=','contains','startsWith','endsWith']);
export function getResponse(state,reference){
 const history=state?.history||[];
 for(let i=history.length-1;i>=0;i--){const input=history[i].input;if(input&&(input.uuid===reference||input.tag===reference))return input;}
 return undefined;
}
export function condition(c,variables,state){
 if(!c)return true;
 const response=c.response?getResponse(state,c.response):undefined;
 if(c.response&&!response)return false;
 let value=c.response?response[c.field||'body']:(variables[c.variable]??0),expected=c.value;
 if(value===undefined||value===null)return false;
 if(typeof value==='string'||typeof expected==='string'){
  if(typeof value!=='string'||typeof expected!=='string')return false;
  value=value.trim().replace(/\s+/g,' ');expected=expected.trim().replace(/\s+/g,' ');
  if(c.ignoreCase){value=value.toLowerCase();expected=expected.toLowerCase();}
  if(c.op==='=')return value===expected;if(c.op==='!=')return value!==expected;
  if(c.op==='contains')return value.includes(expected);if(c.op==='startsWith')return value.startsWith(expected);if(c.op==='endsWith')return value.endsWith(expected);
  return false;
 }
 return c.op==='!='?value!==expected:compare(value,c.op,expected);
}
export function resolveStoryText(text,state){
 return text.replace(/\{\{responses\.([a-zA-Z0-9_-]+)\.(body|uuid|threadUUID|replyTo|tag|outcome)\}\}|\{\{variables\.([a-zA-Z][a-zA-Z0-9_]*)\}\}/g,(_,reference,field,variable)=>{
  const value=variable?(Object.hasOwn(state.variables,variable)?state.variables[variable]:undefined):getResponse(state,reference)?.[field];
  return value===undefined||value===null?'':String(value);
 });
}
function validateCondition(c,tags){
 if(!c||Boolean(c.variable)===Boolean(c.response)||!OPS.has(c.op)||!validValue(c.value))throw Error('Invalid story condition.');
 if(c.variable&&!safeKey(c.variable))throw Error('Invalid condition variable.');
 if(c.response&&(!uuid(c.response)&&!tags.has(c.response)))throw Error('Unknown response reference: '+c.response);
 if(c.field&&!FIELDS.has(c.field))throw Error('Unknown response field.');
 if(typeof c.value==='string'&&['>','>=','<','<='].includes(c.op))throw Error('Ordered conditions need numeric values.');
 if(['contains','startsWith','endsWith'].includes(c.op)&&typeof c.value!=='string')throw Error('Text comparison needs text.');
}
function validateReferences(body,tags){for(const match of body.matchAll(/\{\{responses\.([a-zA-Z0-9_-]+)\.([^}]+)\}\}/g)){if((!tags.has(match[1])&&!uuid(match[1]))||!FIELDS.has(match[2]))throw Error('Unknown response template reference.');}}
export function validateStory(story){
 if(!story||!story.nodes||!Object.hasOwn(story.nodes,story.start))throw Error('Story start is missing.');
 const tags=new Set();for(const node of Object.values(story.nodes))for(const action of node.actions||[])if(action.input)tags.add(action.input.tag||action.input.variable);
 for(const [id,node] of Object.entries(story.nodes)){
  if(!safeKey(id))throw Error('Invalid node identifier.');validateReferences(node.body||'',tags);
  for(const fragment of node.fragments||[]){validateCondition(fragment.when,tags);validateReferences(fragment.body,tags);}
  for(const action of node.actions||[]){
   for(const target of [action.to,action.pass,action.fail].filter(Boolean))if(!Object.hasOwn(story.nodes,target))throw Error(`Unknown story target: ${target}`);
   if(action.roll){parseDice(action.roll);if(!Number.isFinite(action.target)||!action.pass||!action.fail)throw Error('A roll needs a target and both outcomes.');}
   else if(!action.to)throw Error('Choice or text input needs a destination.');
   if(action.input){if(action.roll||!safeKey(action.input.variable)||typeof action.input.label!=='string'||!action.input.label.trim()||!Number.isInteger(action.input.maxLength??2000)||(action.input.maxLength??2000)<1||(action.input.maxLength??2000)>2000)throw Error('Invalid story text input.');}
   if(action.when)validateCondition(action.when,tags);
   if(action.input?.tag&&!safeKey(action.input.tag))throw Error('Invalid response tag.');
   if(action.input?.defaultOutcome&&!safeKey(action.input.defaultOutcome))throw Error('Invalid response outcome.');
   if(action.routes&&!action.input)throw Error('Response routes require a text input action.');
   for(const route of action.routes||[]){validateCondition(route.when,tags);if(!Object.hasOwn(story.nodes,route.to))throw Error('Unknown route destination.');if(route.outcome&&!safeKey(route.outcome))throw Error('Invalid response outcome.');}
   for(const [key,value] of Object.entries(action.set||{}))if(!safeKey(key)||!validValue(value))throw Error('Invalid story variable.');
  }
 }
 return true;
}
export function initialState(story){return {node:story.start,variables:{},history:[]};}
export function transition(story,state,index,roll,submission){
 const action=story.nodes[state.node]?.actions?.[index];if(!action||!condition(action.when,state.variables,state))throw Error('This action is unavailable.');
 if(state.history.length>=200)throw Error('Session limit reached. Restart to continue.');
 if(action.roll&&!Number.isFinite(roll))throw Error('A dice result is required.');
 let input;
 if(action.input){
  if(!submission||typeof submission.body!=='string'||!submission.body.trim()||submission.body.length>(action.input.maxLength??2000))throw Error(`Enter a response of 1–${action.input.maxLength??2000} characters.`);
  const previous=state.history.filter(step=>step.input).map(step=>step.input),parent=previous.at(-1);
  if(!uuid(submission.uuid)||!uuid(submission.threadUUID)||previous.some(m=>m.uuid===submission.uuid)||submission.replyTo!==(parent?.uuid??null)||(parent&&submission.threadUUID!==parent.threadUUID))throw Error('Invalid response identity or thread.');
  input={uuid:submission.uuid,threadUUID:submission.threadUUID,replyTo:submission.replyTo,speaker:'session-reader',body:submission.body.trim(),tag:action.input.tag||action.input.variable,...(action.input.defaultOutcome?{outcome:action.input.defaultOutcome}:{})};
 }
 let to=action.roll?(roll>=action.target?action.pass:action.fail):action.to;
 const variables={...state.variables,...action.set,...(input?{[action.input.variable]:input.body}:{})};
 const step={from:state.node,action:index,to,roll:action.roll?roll:null,...(input?{input}:{})};
 const next={node:to,variables,history:[...state.history,step]};
 const route=(action.routes||[]).find(item=>condition(item.when,variables,next));
 if(route){to=route.to;next.node=to;step.to=to;if(route.outcome)input.outcome=route.outcome;}
 return next;
}
export function restoreState(story,saved){
 let state=initialState(story);if(!saved||!Array.isArray(saved.history)||saved.history.length>200)return state;
 try{for(const step of saved.history){if(step.from!==state.node)throw Error('Invalid session');state=transition(story,state,step.action,step.roll,step.input);}return state;}catch{return initialState(story);}
}
