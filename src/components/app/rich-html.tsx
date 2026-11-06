import DOMPurify from "dompurify";
import { useMemo } from "react";


export function RichHtml({ html, className }: { html?: string | null; className?: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html ?? "", { ADD_ATTR: ["target"] }), [html]);
  if (!clean) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
