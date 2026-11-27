import { useSiteLanguage } from "./InquiryLanguage";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function ScrollToTopButton() {
  const { t: tSite } = useSiteLanguage();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  if (!visible) return null;
  return <button className="scroll-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={tSite("Scroll to top")} title={tSite("Scroll to top")}><ArrowUp size={19} /></button>;
}
