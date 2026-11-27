// One-off mechanical migration: explicit React translations, not DOM mutation.
import fs from "node:fs";
import { parse } from "@babel/parser";

const files = ["pages/HomePage.jsx", "pages/PropertyPage.jsx", "pages/AreaPage.jsx", "pages/AboutPage.jsx", "pages/ContactPage.jsx", "pages/CmiPage.jsx", "pages/NotFoundPage.jsx",
  "components/Header.jsx", "components/Layout.jsx", "components/CatalogueFilters.jsx", "components/MultiSelectFilter.jsx", "components/PropertyCard.jsx", "components/ProfilePanel.jsx", "components/ContactActions.jsx", "components/AreaLinks.jsx", "components/RelatedListings.jsx", "components/ShareSelectedPhotosButton.jsx", "components/ListingUnavailableState.jsx", "components/NameCardModal.jsx", "components/PortraitModal.jsx", "components/PropertyVideo.jsx", "components/RecentViewingPill.jsx", "components/ScrollToTopButton.jsx", "components/RouteContent.jsx"];
const attributes = new Set(["aria-label", "placeholder", "title", "alt", "label", "whatsappLabel"]);
function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/); let last = 0;
  lines.forEach((line, index) => { if (/[^ \t]/.test(line)) last = index; });
  return lines.map((line, index) => { let part = line.replace(/\t/g, " "); if (index) part = part.replace(/^ +/, ""); if (index !== lines.length - 1) part = part.replace(/ +$/, ""); return part && index !== last ? part + " " : part; }).join("");
}
for (const file of files) {
  const path = `src/${file}`; const source = fs.readFileSync(path, "utf8");
  if (source.includes("useSiteLanguage")) continue;
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] }); const edits = []; const owners = new Set();
  const insert = (at, text) => edits.push({ start: at, end: at, text });
  const wrap = (node, owner) => { if (node?.type === "JSXEmptyExpression") return; owners.add(owner); insert(node.start, "tSite("); insert(node.end, ")"); };
  function visit(node, parent, owner) {
    if (!node || typeof node !== "object") return;
    if (node.type === "FunctionDeclaration" && /^[A-Z]/.test(node.id?.name || "")) owner = node;
    if (owner && node.type === "JSXText" && node.value.trim()) { owners.add(owner); edits.push({ start: node.start, end: node.end, text: `{tSite(${JSON.stringify(jsxText(node.value))})}` }); }
    if (owner && node.type === "JSXExpressionContainer" && ["JSXElement", "JSXFragment"].includes(parent?.type)) wrap(node.expression, owner);
    if (owner && node.type === "JSXAttribute" && attributes.has(node.name.name) && parent?.name?.name !== "Seo") {
      if (node.value?.type === "StringLiteral") { owners.add(owner); edits.push({ start: node.value.start, end: node.value.end, text: `{tSite(${JSON.stringify(node.value.value)})}` }); }
      else if (node.value?.type === "JSXExpressionContainer") wrap(node.value.expression, owner);
    }
    for (const [key, value] of Object.entries(node)) { if (["loc", "start", "end", "extra", "comments"].includes(key)) continue; if (Array.isArray(value)) value.forEach(child => visit(child, node, owner)); else if (value && typeof value === "object") visit(value, node, owner); }
  }
  visit(ast, null, null);
  if (!owners.size) continue;
  for (const owner of owners) insert(owner.body.start + 1, "\n  const { t: tSite } = useSiteLanguage();");
  const modulePath = file.startsWith("components/") ? "./InquiryLanguage" : "../components/InquiryLanguage";
  insert(0, `import { useSiteLanguage } from ${JSON.stringify(modulePath)};\n`);
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let output = source; for (const edit of edits) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  parse(output, { sourceType: "module", plugins: ["jsx"] }); fs.writeFileSync(path, output);
  console.log(file);
}
