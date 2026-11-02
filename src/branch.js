import {compare,parseDice} from './dice.js';
const safeKey=k=>typeof k==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(k)&&!['constructor','prototype','__proto__'].includes(k);
const validValue=v=>Number.isFinite(v)||(typeof v==='string'&&v.length<=2000);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
export function condition(c,variables){if(!c)return true;const value=variables[c.variable]??0;if(typeof value==='string'||typeof c.value==='string')return c.op==='='&&value===c.value;return compare(value,c.op,c.value);}
export function validateStory(story){
 if(!story||!story.nodes||!Object.hasOwn(story.nodes,story.start))throw Error('Story start is missing.');
 for(const [id,node] of Object.entries(story.nodes)){
  if(!safeKey(id))throw Error('Invalid node identifier.');
  for(const action of node.actions||[]){
   for(const target of [action.to,action.pass,action.fail].filter(Boolean))if(!Object.hasOwn(story.nodes,target))throw Error(`Unknown story target: ${target}`);
   if(action.roll){parseDice(action.roll);if(!Number.isFinite(action.target)||!action.pass||!action.fail)throw Error('A roll needs a target and both outcomes.');}
   else if(!action.to)throw Error('Choice or text input needs a destination.');
   if(action.input){if(action.roll||!safeKey(action.input.variable)||typeof action.input.label!=='string'||!action.input.label.trim()||!Number.isInteger(action.input.maxLength??2000)||(action.input.maxLength??2000)<1||(action.input.maxLength??2000)>2000)throw Error('Invalid story text input.');}
   if(action.when&&(!safeKey(action.when.variable)||!['>','>=','<','<=','='].includes(action.when.op)||!validValue(action.when.value)||(typeof action.when.value==='string'&&action.when.op!=='=')))throw Error('Invalid story condition.');
   for(const [key,value] of Object.entries(action.set||{}))if(!safeKey(key)||!validValue(value))throw Error('Invalid story variable.');
  }
 }
 return true;
}
export function initialState(story){return {node:story.start,variables:{},history:[]};}
export function transition(story,state,index,roll,submission){
 const action=story.nodes[state.node]?.actions?.[index];if(!action||!condition(action.when,state.variables))throw Error('This action is unavailable.');
 if(state.history.length>=200)throw Error('Session limit reached. Restart to continue.');
 if(action.roll&&!Number.isFinite(roll))throw Error('A dice result is required.');
 let input;
 if(action.input){
  if(!submission||typeof submission.body!=='string'||!submission.body.trim()||submission.body.length>(action.input.maxLength??2000))throw Error(`Enter a response of 1–${action.input.maxLength??2000} characters.`);
  const previous=state.history.filter(step=>step.input).map(step=>step.input),parent=previous.at(-1);
  if(!uuid(submission.uuid)||!uuid(submission.threadUUID)||previous.some(m=>m.uuid===submission.uuid)||submission.replyTo!==(parent?.uuid??null)||(parent&&submission.threadUUID!==parent.threadUUID))throw Error('Invalid response identity or thread.');
  input={uuid:submission.uuid,threadUUID:submission.threadUUID,replyTo:submission.replyTo,speaker:'session-reader',body:submission.body.trim()};
 }
 const to=action.roll?(roll>=action.target?action.pass:action.fail):action.to;
 const step={from:state.node,action:index,to,roll:action.roll?roll:null,...(input?{input}:{})};
 return {node:to,variables:{...state.variables,...action.set,...(input?{[action.input.variable]:input.body}:{})},history:[...state.history,step]};
}
export function restoreState(story,saved){
 let state=initialState(story);if(!saved||!Array.isArray(saved.history)||saved.history.length>200)return state;
 try{for(const step of saved.history){if(step.from!==state.node)throw Error('Invalid session');state=transition(story,state,step.action,step.roll,step.input);}return state;}catch{return initialState(story);}
}
