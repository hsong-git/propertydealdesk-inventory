import test from "node:test";
import assert from "node:assert/strict";
import { createEngagementMeter, startEngagementTracking } from "./engagement.js";

test("engagement needs ten active seconds and an interaction; hidden time is excluded", () => {
  const meter = createEngagementMeter();
  meter.sample(0, true);
  for (let at = 1000; at <= 10000; at += 1000) assert.equal(meter.sample(at,true).ready,false);
  assert.equal(meter.sample(10000,true,true).ready,true);
  const hidden = createEngagementMeter();
  hidden.sample(0,true,true); hidden.sample(4000,false);
  assert.equal(hidden.sample(64000,false).active_ms,4000);
  hidden.sample(64000,true);
  assert.equal(hidden.sample(69000,true).ready,false);
  assert.equal(hidden.sample(70000,true).ready,true);
});

test("tracker ignores synthetic interactions, admin pages, background time and duplicate engagement", () => {
  let time=0, callback, cleared=0;
  const store=new Map(), sent=[];
  const doc=new EventTarget(); doc.visibilityState="visible"; doc.hasFocus=()=>true;
  const win=new EventTarget(); win.location={pathname:"/admin/analytics"};
  win.sessionStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
  win.setInterval=fn=>{callback=fn;return 1;}; win.clearInterval=()=>{cleared++;};
  // Capture handlers so trusted browser events can be represented in this unit test.
  const handlers={}; doc.addEventListener=(name,handler)=>{handlers[name]=handler;}; doc.removeEventListener=()=>{};
  const stop=startEngagementTracking({windowRef:win,documentRef:doc,sessionId:"unit-session",now:()=>time,send:value=>sent.push(value)});
  time=20000; handlers.pointerdown({type:"pointerdown",isTrusted:true}); callback();
  assert.equal(sent.length,0);
  win.location.pathname="/"; callback();
  for(let i=0;i<11;i++){time+=1000;handlers.pointerdown({type:"pointerdown",isTrusted:false});callback();}
  assert.equal(sent.length,0);
  handlers.keydown({type:"keydown",isTrusted:true});
  assert.equal(sent.length,1); assert.equal(sent[0].interacted,true); assert.ok(sent[0].active_ms>=10000);
  callback(); assert.equal(sent.length,1); assert.ok(cleared);
  stop();
  startEngagementTracking({windowRef:win,documentRef:doc,sessionId:"unit-session",now:()=>time,send:value=>sent.push(value)});
  assert.equal(sent.length,1);
});
