import {$} from './ui-utils.js';
const dialog=$('#image-dialog');let opener;
if(dialog&&typeof dialog.showModal==='function'){
 for(const link of document.querySelectorAll('[data-fullsize], .message-body a:has(img)'))link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey)return;event.preventDefault();opener=link;const img=$('img',dialog);img.src=link.href;img.alt=$('img',link)?.alt||'Full-size image';dialog.showModal();});
 $('[data-close]',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>opener?.focus());
}
for(const image of document.querySelectorAll('.avatar img'))image.addEventListener('error',()=>image.remove());
for(const container of document.querySelectorAll('[data-embed]')){const button=$('[data-load-embed]',container);button.hidden=false;button.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src=container.dataset.embed;frame.title=container.dataset.title;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.sandbox='allow-scripts allow-same-origin allow-presentation';frame.allow='fullscreen; picture-in-picture';frame.allowFullscreen=true;container.prepend(frame);button.remove();});}
