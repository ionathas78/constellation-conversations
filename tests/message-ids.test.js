import test from 'node:test';
import assert from 'node:assert/strict';
import {assignMessageUUIDs,messageUUID,validateMessageUUIDs,UUID_PATTERN} from '../src/message-ids.mjs';
test('message UUIDs stay stable through builds, edits, reordering and assignment',()=>{
 const publication={id:'example',messages:[{id:'opening',body:'Hello'},{id:'reply',body:'Hi'}]};
 const before=publication.messages.map(m=>messageUUID(publication,m));before.forEach(uuid=>assert.ok(UUID_PATTERN.test(uuid)));
 assert.equal(assignMessageUUIDs(publication),2);assert.equal(assignMessageUUIDs(publication),0);
 assert.deepEqual(publication.messages.map(m=>m.uuid),before);
 publication.messages.reverse();publication.messages[0].body='Revised';publication.messages[0].id='renamed';
 assert.equal(messageUUID(publication,publication.messages[0]),before[1]);
 assert.notEqual(messageUUID({id:'other'},{id:'opening'}),before[0]);
});
test('message UUID validation rejects invalid and globally duplicated identities',()=>{
 const c={id:'one',messages:[{id:'a'}]};assignMessageUUIDs(c);assert.doesNotThrow(()=>validateMessageUUIDs([c]));
 assert.throws(()=>validateMessageUUIDs([c,{id:'two',messages:[{id:'b',uuid:c.messages[0].uuid}]}]));
 assert.throws(()=>validateMessageUUIDs([{id:'one',messages:[{id:'a',uuid:'invalid'}]}]));
});
