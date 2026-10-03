import { useEffect } from "react";
import { agentProfile } from "../config/agentProfile";
import { agentJsonLd, applyJsonLd, applySeo } from "../utils/seo";

export function Seo(props) {
  useEffect(() => {
    const privatePage = /^\/(admin|download)(\/|$)/.test(window.location.pathname);
    applySeo({ ...props, robots: privatePage ? "noindex, nofollow" : props.robots });
    applyJsonLd("agent-jsonld", agentJsonLd(agentProfile));
    if (props.structuredData) applyJsonLd("page-jsonld", props.structuredData);
    else document.getElementById("page-jsonld")?.remove();
  }, [
    props.title,
    props.description,
    props.canonical,
    props.ogTitle,
    props.ogDescription,
    props.image,
    props.type,
    props.robots,
    props.structuredData,
  ]);
  return null;
}
