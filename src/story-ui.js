import {rollDice} from './dice.js';
import {initialState,transition,restoreState,condition} from './branch.js';
import {describeRoll} from './dice-ui.js';
import {$,stored,save} from './ui-utils.js';
for(const container of document.querySelectorAll('[data-story]')){
 try{
 const story=JSON.parse(container.dataset.story),key='constellation:story:'+container.dataset.storage;
 let parsed;try{parsed=JSON.parse(stored(key));}catch{}
 let state=restoreState(story,parsed);const view=$('[data-story-view]',container),output=$('[data-story-roll]',container),status=$('[data-storage-status]',container);
 function render(focus=false){
  const node=story.nodes[state.node];view.replaceChildren();const text=document.createElement('div');text.className='story-passage';text.tabIndex=-1;text.innerHTML=node.html;view.append(text);
  const actions=document.createElement('div');actions.className='story-actions';
  node.actions.forEach((action,index)=>{if(!condition(action.when,state.variables))return;const button=document.createElement('button');button.type='button';button.textContent=action.label;button.addEventListener('click',()=>{try{const roll=action.roll?rollDice(action.roll):null;state=transition(story,state,index,roll?.total);output.textContent=roll?describeRoll(roll):'';status.textContent=save(key,JSON.stringify(state))?'Progress saved on this device.':'Storage unavailable. Your story continues for this visit.';render(true);}catch(e){output.textContent=e.message;}});actions.append(button);});
  view.append(actions);$('[data-back]',container).disabled=state.history.length===0;if(focus)text.focus();
 }
 $('.story-tools',container).hidden=false;
 $('[data-restart]',container).addEventListener('click',()=>{state=initialState(story);save(key,JSON.stringify(state));output.textContent='Story restarted.';render(true);});
 $('[data-back]',container).addEventListener('click',()=>{state=restoreState(story,{history:state.history.slice(0,-1)});save(key,JSON.stringify(state));output.textContent='Returned to the previous decision.';render(true);});
 status.textContent='Progress stays in this browser. Use Previous decision to try another path.';render();
 }catch{const p=document.createElement('p');p.textContent='Interactive story unavailable. Read every passage below.';container.append(p);}
}
