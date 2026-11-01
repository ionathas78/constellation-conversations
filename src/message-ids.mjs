import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// Application namespace, fixed permanently. Never change after publication.
const NAMESPACE='be090055-0339-49db-bd8b-267db043720f';
export const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function messageUUID(publication,message){
 if(message.uuid)return message.uuid;
 // UUIDv5 fallback keeps unassigned content stable across builds and reordering.
 const bytes=createHash('sha1').update(Buffer.from(NAMESPACE.replaceAll('-',''),'hex')).update(JSON.stringify([publication.id,message.id])).digest().subarray(0,16);
 bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;
 const h=bytes.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function assignMessageUUIDs(publication){
 let assigned=0;for(const message of publication.messages){if(!message.uuid){message.uuid=messageUUID(publication,message);assigned++;}}
 return assigned;
}
export function validateMessageUUIDs(publications){
 const seen=new Set();
 for(const c of publications)for(const m of c.messages){const uuid=messageUUID(c,m);if(!UUID_PATTERN.test(uuid))throw Error(`Invalid message UUID: ${c.id}/${m.id}`);if(seen.has(uuid))throw Error(`Duplicate message UUID: ${uuid}`);seen.add(uuid);}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const directory=new URL('../content/conversations/',import.meta.url);let count=0;
 for(const name of await fs.readdir(directory)){if(!name.endsWith('.json'))continue;const file=new URL(name,directory),c=JSON.parse(await fs.readFile(file,'utf8'));const assigned=assignMessageUUIDs(c);count+=assigned;if(assigned)await fs.writeFile(file,JSON.stringify(c,null,2)+'\n');}
 console.log(`Stored ${count} message UUIDs; existing UUIDs preserved.`);
}
