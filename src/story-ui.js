import {rollDice} from './dice.js';
import {initialState,transition,restoreState,condition,resolveStoryText} from './branch.js';
import {describeRoll} from './dice-ui.js';
import {newSessionUUID} from './feedback-state.js';
import {getReaderMarkdown} from './reader-markdown.js';
import {$,stored,save} from './ui-utils.js';
for(const container of document.querySelectorAll('[data-story]')){
 try{
 const story=JSON.parse(container.dataset.story),key='constellation:story:'+container.dataset.storage,emoji=JSON.parse(container.dataset.emoji||'{}');
 const tabSession=Object.values(story.nodes).some(node=>node.actions.some(action=>action.input));
 function persist(){if(!tabSession)return save(key,JSON.stringify(state));try{sessionStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}}
 let parsed;try{parsed=JSON.parse(tabSession?sessionStorage.getItem(key):stored(key));}catch{}
 let state=restoreState(story,parsed),renderer;const drafts=new Map(),view=$('[data-story-view]',container),output=$('[data-story-roll]',container),status=$('[data-storage-status]',container);
 async function ready(){if(!renderer)renderer=await getReaderMarkdown(emoji);return renderer;}
 function advance(index,roll,submission){state=transition(story,state,index,roll?.total,submission);output.textContent=roll?describeRoll(roll):'';status.textContent=persist()?(tabSession?'Progress saved in this tab’s session.':'Progress saved on this device.'):'Storage unavailable. Your story continues for this visit.';render(true);}
 function fillReferences(element){const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))if(node.nodeValue.includes('{{'))node.nodeValue=resolveStoryText(node.nodeValue,state);}
 function render(focus=false){
  const node=story.nodes[state.node];view.replaceChildren();
  for(const step of state.history){if(!step.input)continue;const response=step.input,article=document.createElement('article');article.className='message human-message story-response';article.id=response.uuid;article.dataset.thread=response.threadUUID;
   const main=document.createElement('div');main.className='message-main';const heading=document.createElement('h3');heading.textContent='You · Story response';const link=document.createElement('a');link.className='message-permalink';link.href='#'+response.uuid;link.textContent='#';link.setAttribute('aria-label','Jump to your response in this session');heading.append(link);main.append(heading);const body=document.createElement('div');body.className='message-body';
   if(renderer){try{body.innerHTML=renderer.render(response.body);}catch{body.textContent=response.body;body.classList.add('feedback-plain');}}else{body.textContent=response.body;body.classList.add('feedback-plain');}
   main.append(body);const avatar=document.createElement('div');avatar.className='avatar-slot';const initials=document.createElement('span');initials.className='avatar';initials.textContent='You';initials.setAttribute('aria-hidden','true');avatar.append(initials);article.append(avatar,main);view.append(article);
  }
  const text=document.createElement('div');text.className='story-passage';text.tabIndex=-1;text.innerHTML=node.html;fillReferences(text);
  for(const fragment of node.fragments||[]){if(!condition(fragment.when,state.variables,state))continue;const part=document.createElement('div');part.className='story-fragment';part.innerHTML=fragment.html;fillReferences(part);text.append(part);}
  view.append(text);
  const actions=document.createElement('div');actions.className='story-actions';
  node.actions.forEach((action,index)=>{
   if(!condition(action.when,state.variables,state))return;
   if(action.input){
    const form=document.createElement('form');form.className='story-input';const label=document.createElement('label'),input=document.createElement('textarea'),preview=document.createElement('div'),previewButton=document.createElement('button'),submit=document.createElement('button'),controls=document.createElement('div');
    input.id=`story-input-${container.dataset.storage.replace(/[^a-z0-9_-]/gi,'-')}-${index}`;input.name='body';input.rows=4;input.required=true;input.maxLength=action.input.maxLength??2000;input.placeholder=action.input.placeholder||'Markdown is welcome.';input.value=drafts.get(`${state.node}:${index}`)||'';label.htmlFor=input.id;label.textContent=action.input.label;
    input.addEventListener('input',()=>drafts.set(`${state.node}:${index}`,input.value));preview.className='message-body feedback-preview';preview.hidden=true;preview.setAttribute('aria-label','Response preview');previewButton.type='button';previewButton.textContent='Preview';submit.type='submit';submit.textContent=action.label;controls.className='feedback-actions';
    previewButton.addEventListener('click',async()=>{try{const md=await ready();preview.innerHTML=md.render(input.value);preview.hidden=false;output.textContent='Preview only. Submit to continue the story.';}catch(error){output.textContent=error.message;}});
    form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;const submittedNode=state.node,historyLength=state.history.length;try{const md=await ready();if(state.node!==submittedNode||state.history.length!==historyLength)throw Error('The passage changed before submission. Return to the prompt to try again.');md.render(input.value);const parent=state.history.filter(step=>step.input).at(-1)?.input;const submission={uuid:newSessionUUID(),threadUUID:parent?.threadUUID||newSessionUUID(),replyTo:parent?.uuid??null,body:input.value};advance(index,null,submission);drafts.delete(`${stepNode}:${index}`);}catch(error){output.textContent=error.message;submit.disabled=false;}});
    const stepNode=state.node;controls.append(previewButton,submit);form.append(label,input,controls,preview);actions.append(form);
   }else{
    const button=document.createElement('button');button.type='button';button.textContent=action.label;button.addEventListener('click',()=>{try{advance(index,action.roll?rollDice(action.roll):null);}catch(error){output.textContent=error.message;}});actions.append(button);
   }
  });
  view.append(actions);$('[data-back]',container).disabled=state.history.length===0;if(focus)text.focus();
 }
 $('.story-tools',container).hidden=false;
 $('[data-restart]',container).addEventListener('click',()=>{state=initialState(story);drafts.clear();persist();output.textContent='Story restarted.';render(true);});
 $('[data-back]',container).addEventListener('click',()=>{const step=state.history.at(-1);if(step?.input)drafts.set(`${step.from}:${step.action}`,step.input.body);state=restoreState(story,{history:state.history.slice(0,-1)});persist();output.textContent='Returned to the previous decision.';render(true);});
 status.textContent=tabSession?'Progress and responses stay in this tab. Use Previous decision to try another path.':'Progress stays in this browser. Use Previous decision to try another path.';render();
 if(state.history.some(step=>step.input))ready().then(()=>render()).catch(error=>{output.textContent=error.message;});
 }catch{const p=document.createElement('p');p.textContent='Interactive story unavailable. Read every passage below.';container.append(p);}
}
