import { useEffect } from "react";
import { agentProfile } from "../config/agentProfile";
import { agentJsonLd, applyJsonLd, applySeo } from "../utils/seo";

export function Seo(props) {
  useEffect(() => {
    applySeo(props);
    applyJsonLd("agent-jsonld", agentJsonLd(agentProfile));
  }, [
    props.title,
    props.description,
    props.canonical,
    props.ogTitle,
    props.ogDescription,
    props.image,
    props.type,
  ]);
  return null;
}
