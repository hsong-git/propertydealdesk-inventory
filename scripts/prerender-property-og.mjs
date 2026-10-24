import path from "node:path";
import { fileURLToPath } from "node:url";
import { prerenderPropertyOgRoutes } from "./property-og.mjs";
import { catalogueBuildMode } from "./catalogue-build-mode.mjs";
import { writeBuildProof } from "./catalogue-build-proof.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const distRoot = path.join(projectRoot, "dist");

const result = await prerenderPropertyOgRoutes({ projectRoot, publicRoot, distRoot });
writeBuildProof(distRoot, catalogueBuildMode());
console.log(`Prerendered ${result.count} property OG pages and ${result.count} short-link OG pages for inventory ${result.inventoryVersion}.`);
