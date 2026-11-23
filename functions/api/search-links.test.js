import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequest as create } from "./search-links.js";
import { onRequest as resolve } from "../s/[id].js";
import { onRequest as middleware } from "../_middleware.js";
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(fs.readFileSync("migrations/0010_shared_search_links.sql", "utf8"));
  return { sqlite, prepare(sql) { return { bind(...values) { return {
    first: async () => sqlite.prepare(sql).get(...values) || null,
    run: async () => sqlite.prepare(sql).run(...values),
  }; } }; } };
}
const request = (host, query) => new Request("https://" + host + "/api/search-links", {
  method: "POST", headers: { origin: "https://" + host, "content-type": "application/json" },
  body: JSON.stringify({ query }),
});
test("short search links round-trip all filters on the visited domain and deduplicate", async () => {
  const db = database();
  try {
    for (const host of ["www.myeviv.com", "property.myeviv.com", "scmi.myeviv.com"]) {
      const query = new URLSearchParams([["q","Bayuemas"],["type","Terrace House"],["location","Klang"],["location","Setia Alam"],["intent","WTS"],["min","1000"],["max","800000"],["beds","3"],["furnishing","Full"],["sort","price-asc"],["inventory","smi"],["view","featured"]]).toString();
      const make = () => create({ request: request(host, query), env: { REQUIREMENTS_DB: db } });
      const response = await make(); assert.equal(response.status, 200);
      const { path } = await response.json(); assert.match(path, /^\/s\/[A-Za-z0-9_-]{16}$/);
      assert.equal((await (await make()).json()).path, path);
      const id = path.slice(3);
      for (const method of ["GET", "HEAD"]) {
        const redirect = await resolve({ request: new Request("https://" + host + path, { method }), params: { id }, env: { REQUIREMENTS_DB: db } });
        assert.equal(redirect.status, 302);
        const destination = new URL(redirect.headers.get("location"));
        assert.equal(destination.host, host); assert.equal(destination.pathname, "/");
        const restored = destination.searchParams;
        for (const key of new Set(new URLSearchParams(query).keys())) assert.deepEqual(restored.getAll(key).sort(), new URLSearchParams(query).getAll(key).sort());
        assert.equal(restored.get("utm_source"), "catalogue_search");
        assert.equal(redirect.headers.get("cache-control"), "no-store");
      }
      assert.equal((await resolve({ request: new Request("https://other.example"+path), params:{id}, env:{REQUIREMENTS_DB:db} })).status,404);
    }
    assert.equal(db.sqlite.prepare("SELECT count(*) n FROM shared_search_links").get().n,3);
  } finally { db.sqlite.close(); }
});
test("invalid, cross-origin and oversized short-link requests do not write", async () => {
  const db=database(); try {
    for(const query of ["url=https://evil.example","intent=DELETE","min=-1","sort=oops","type="+ "a".repeat(161),"intent=WTL&intent=WTS"]) assert.equal((await create({request:request("property.myeviv.com",query),env:{REQUIREMENTS_DB:db}})).status,400);
    const cross=request("property.myeviv.com","");cross.headers.set("origin","https://evil.example");
    assert.equal((await create({request:cross,env:{REQUIREMENTS_DB:db}})).status,403);
    const huge=request("property.myeviv.com","x".repeat(9000));
    assert.equal((await create({request:huge,env:{REQUIREMENTS_DB:db}})).status,400);
    assert.equal(db.sqlite.prepare("SELECT count(*) n FROM shared_search_links").get().n,0);
    assert.equal((await resolve({request:new Request("https://property.myeviv.com/s/bad"),params:{id:"bad"},env:{REQUIREMENTS_DB:db}})).status,404);
  }finally{db.sqlite.close();}
});
test("storage failures are explicit and short routes pass through SEO middleware", async()=>{
  assert.equal((await create({request:request("scmi.myeviv.com",""),env:{}})).status,503);
  const response=await middleware({request:new Request("https://scmi.myeviv.com/s/abcdefghijklmnop"),env:{},next:async()=>new Response(null,{status:302,headers:{location:"https://scmi.myeviv.com/?intent=WTS"}})});
  assert.equal(response.status,302);
});

test("All searches explicitly override saved filters and creation is bounded without blocking existing links", async()=>{
  const db=database(); try {
    const first=await create({request:request("scmi.myeviv.com",""),env:{REQUIREMENTS_DB:db}});
    const {path}=await first.json();
    const redirect=await resolve({request:new Request("https://scmi.myeviv.com"+path),params:{id:path.slice(3)},env:{REQUIREMENTS_DB:db}});
    assert.equal(new URL(redirect.headers.get("location")).searchParams.get("view"),"all");
    const put=db.sqlite.prepare("INSERT INTO shared_search_links VALUES (?,?,?,?)");
    for(let i=0;i<999;i++)put.run("quota-"+i,"scmi.myeviv.com","q="+i,new Date().toISOString());
    assert.equal((await create({request:request("scmi.myeviv.com","q=new"),env:{REQUIREMENTS_DB:db}})).status,429);
    assert.equal((await create({request:request("scmi.myeviv.com",""),env:{REQUIREMENTS_DB:db}})).status,200);
  } finally {db.sqlite.close();}
});
