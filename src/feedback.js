import {$} from './ui-utils.js';
import {createMarkdownRenderer,escapeHTML,browserURL} from './markdown.js';
import {appendFeedback,restoreFeedback} from './feedback-state.js';
const panel=$('[data-feedback]');
if(panel){
 const form=$('form',panel),input=$('textarea',panel),status=$('[data-feedback-status]',panel),list=$('[data-feedback-list]',panel),preview=$('[data-feedback-preview]',panel),context=$('[data-reply-context]',panel);
 const published=JSON.parse(panel.dataset.messages),publishedIDs=published.map(m=>m.uuid),key='constellation:feedback:'+panel.dataset.publication+':v1';
 const labels=new Map(published.map(m=>[m.uuid,`${m.name}: ${m.excerpt}`]));let replyTo=null,renderer,loading,state={version:1,messages:[]},storageWorks=true;
 try{state=restoreFeedback(JSON.parse(sessionStorage.getItem(key)),publishedIDs);}catch{storageWorks=false;}
 const persist=()=>{try{sessionStorage.setItem(key,JSON.stringify(state));storageWorks=true;}catch{storageWorks=false;}return storageWorks;};
 function loadScript(name){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../vendor/'+name,import.meta.url).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('The local formatting tools could not load. Your draft is still here; try Preview again.'));};document.head.append(script);});}
 function ready(){if(renderer)return Promise.resolve(renderer);if(!loading)loading=Promise.all([window.markdownit?null:loadScript('markdown-it.min.js'),window.katex?null:loadScript('katex.min.js')]).then(()=>{const emoji=JSON.parse(panel.dataset.emoji);renderer=createMarkdownRenderer(window.markdownit,{math:window.katex,emoji:()=>emoji,renderEmoji:id=>{const item=emoji[id];return `<picture class="custom-emoji"><source media="(prefers-reduced-motion: reduce)" srcset="${escapeHTML(browserURL(item.static))}"><img src="${escapeHTML(browserURL(item.src))}" alt="${escapeHTML(item.alt)}" loading="lazy"></picture>`;}});return renderer;}).catch(error=>{loading=null;throw error;});return loading;}
 function setReply(uuid){replyTo=uuid;context.textContent=uuid?`Replying to ${labels.get(uuid)||'your local message'}`:'Starting a new local thread.';$('[data-cancel-reply]',panel).hidden=!uuid;panel.open=true;input.focus();}
 function render(){list.replaceChildren();for(const m of state.messages){const article=document.createElement('article');article.className='message human-message local-feedback';article.id=m.uuid;article.dataset.thread=m.threadUUID;
 article.innerHTML=`<div class="avatar-slot"><span class="avatar" aria-hidden="true">You</span></div><div class="message-main"><h3>You <span class="speaker-role">Local feedback</span><a class="message-permalink" href="#${m.uuid}" aria-label="Jump to your local message">#</a></h3><p class="muted feedback-context"></p><div class="message-body"></div><button type="button" class="local-reply">Reply</button></div>`;
 $('.feedback-context',article).textContent=m.replyTo?'In reply to '+(labels.get(m.replyTo)||'your local message'):'New thread';
 if(renderer){try{$('.message-body',article).innerHTML=renderer.render(m.body);}catch{$('.message-body',article).textContent=m.body;}}else{$('.message-body',article).textContent=m.body;$('.message-body',article).classList.add('feedback-plain');}
 $('.local-reply',article).addEventListener('click',()=>setReply(m.uuid));labels.set(m.uuid,'You: '+m.body.slice(0,100));list.append(article);}
 $('[data-reset-feedback]',panel).disabled=state.messages.length===0;}
 // A published message button only selects a target; it never changes the transcript.
 for(const button of document.querySelectorAll('[data-feedback-reply]')){button.hidden=false;button.addEventListener('click',()=>setReply(button.dataset.feedbackReply));}
 $('[data-cancel-reply]',panel).addEventListener('click',()=>setReply(null));
 $('[data-preview-feedback]',panel).addEventListener('click',async()=>{try{const md=await ready();preview.innerHTML=md.render(input.value);preview.hidden=false;status.textContent='Preview only — nothing has been added.';}catch(error){status.textContent=error.message;}});
 form.addEventListener('submit',async event=>{event.preventDefault();const button=$('[type=submit]',form);button.disabled=true;try{await ready();renderer.render(input.value);state=appendFeedback(state,{body:input.value,replyTo},publishedIDs);persist();render();input.value='';preview.replaceChildren();preview.hidden=true;setReply(null);status.textContent=storageWorks?'Added to this tab’s session. Nothing was published or sent.':'Added for this visit. Browser storage is unavailable.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
 $('[data-reset-feedback]',panel).addEventListener('click',()=>{state={version:1,messages:[]};persist();render();input.value='';preview.replaceChildren();preview.hidden=true;setReply(null);status.textContent='Local feedback reset. The published conversation is unchanged.';});
 $('[data-feedback-controls]',panel).hidden=false;$('[data-feedback-fallback]',panel).hidden=true;context.textContent='Starting a new local thread.';render();
 if(state.messages.length){panel.open=true;ready().then(render).catch(error=>{status.textContent=error.message;});}
}
