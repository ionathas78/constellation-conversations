export const $=(s,el=document)=>el.querySelector(s);
export function stored(key){try{return localStorage.getItem(key);}catch{return null;}}
export function save(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}}
