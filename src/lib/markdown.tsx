import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  "img",
  "h1",
  "h2",
  "iframe",
]);

/** Render admin-written markdown to safe HTML. */
export function renderMarkdown(md: string) {
  const html = marked.parse(md, { async: false, gfm: true, breaks: true });
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "title"],
    },
    // Allow embedded YouTube / Vimeo videos only.
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    transformTags: {
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
      a: (tagName, attribs) => {
        const external = /^https?:\/\//.test(attribs.href ?? "");
        return {
          tagName,
          attribs: external ? { ...attribs, target: "_blank", rel: "noopener noreferrer" } : attribs,
        };
      },
    },
  });
}

export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  return (
    <div
      className={`prose prose-slate max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-brand-950 prose-a:text-brand-700 hover:prose-a:text-accent-600 prose-img:mx-auto prose-img:max-h-[75vh] prose-img:w-auto prose-img:rounded-lg ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
