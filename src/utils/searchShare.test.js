import test from "node:test";
import assert from "node:assert/strict";
import { createSearchLink, searchShareTarget } from "./searchShare.js";
test("search sharing follows the actual browser origin including www", async()=>{
  for(const host of ["www.myeviv.com","property.myeviv.com","scmi.myeviv.com"]){
    const target=searchShareTarget(new URLSearchParams("intent=WTS&location=Klang&location=Setia+Alam"),"https://"+host);
    const link=await createSearchLink(target,async(url,options)=>{
      assert.equal(url.href,"https://"+host+"/api/search-links");
      assert.equal(JSON.parse(options.body).query,target.search.slice(1));
      return Response.json({path:"/s/abcdefghijklmnop"});
    });
    assert.equal(link,"https://"+host+"/s/abcdefghijklmnop");
  }
});
test("short link helper refuses external destinations and server errors", async()=>{
  const target=new URL("https://scmi.myeviv.com/");
  for(const path of ["https://evil.example","//evil.example","/s/../../evil","/s/short"]) await assert.rejects(createSearchLink(target,async()=>Response.json({path})));
  await assert.rejects(createSearchLink(target,async()=>new Response(null,{status:503})),/Unable/);
});
