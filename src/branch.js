import {compare,parseDice} from './dice.js';
const safeKey=k=>typeof k==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(k)&&!['constructor','prototype','__proto__'].includes(k);
export function condition(c,variables){if(!c)return true;return compare(variables[c.variable]??0,c.op,c.value);}
export function validateStory(story){
  if(!story||!story.nodes||!Object.hasOwn(story.nodes,story.start))throw Error('Story start is missing.');
  for(const [id,node] of Object.entries(story.nodes)){
    if(!safeKey(id))throw Error('Invalid node identifier.');
    for(const action of node.actions||[]){
      for(const target of [action.to,action.pass,action.fail].filter(Boolean))if(!Object.hasOwn(story.nodes,target))throw Error(`Unknown story target: ${target}`);
      if(action.roll){parseDice(action.roll);if(!Number.isFinite(action.target)||!action.pass||!action.fail)throw Error('A roll needs a target and both outcomes.');}
      else if(!action.to)throw Error('Choice needs a destination.');
      if(action.when&&(!safeKey(action.when.variable)||!['>','>=','<','<=','='].includes(action.when.op)||!Number.isFinite(action.when.value)))throw Error('Invalid story condition.');
      for(const [key,value] of Object.entries(action.set||{}))if(!safeKey(key)||!Number.isFinite(value))throw Error('Invalid story variable.');
    }
  }
  return true;
}
export function initialState(story){return {node:story.start,variables:{},history:[]};}
export function transition(story,state,index,roll){
  const action=story.nodes[state.node]?.actions?.[index];if(!action||!condition(action.when,state.variables))throw Error('This action is unavailable.');
  if(state.history.length>=200)throw Error('Session limit reached. Restart to continue.');
  if(action.roll&&!Number.isFinite(roll))throw Error('A dice result is required.');
  const to=action.roll?(roll>=action.target?action.pass:action.fail):action.to;
  return {node:to,variables:{...state.variables,...action.set},history:[...state.history,{from:state.node,action:index,to,roll:action.roll?roll:null}]};
}
export function restoreState(story,saved){
  let state=initialState(story);if(!saved||!Array.isArray(saved.history)||saved.history.length>200)return state;
  try {for(const step of saved.history){if(step.from!==state.node)throw Error('Invalid session');state=transition(story,state,step.action,step.roll);}return state;}catch{return initialState(story);}
}
