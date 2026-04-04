import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

const markdownComponents = {
  h1: (props: any) => (
    <h1 className="mb-4 text-[2.25rem] font-bold" {...props} />
  ),
  h2: (props: any) => (
    <h2
      className="mb-3 mt-8 border-l-2 border-[var(--notion-border)] pl-3 text-2xl font-semibold"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3
      className="mb-2 mt-6 border-l-2 border-[var(--notion-border)] pl-3 text-xl font-semibold"
      {...props}
    />
  ),
  p: (props: any) => (
    <p className="mb-4 leading-7 text-[var(--notion-text)]" {...props} />
  ),
  ul: (props: any) => (
    <ul className="mb-4 list-disc space-y-1 pl-6" {...props} />
  ),
  ol: (props: any) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6" {...props} />
  ),
  code: (props: any) => (
    <code
      className="rounded bg-[var(--notion-code)] px-1 py-0.5 text-sm"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre
      className="mb-4 overflow-x-auto rounded-lg bg-[var(--notion-code)] p-4 text-sm"
      {...props}
    />
  ),
  a: (props: any) => {
    const safeHref =
      typeof props.href === "string" ? encodeURI(props.href) : props.href;
    return (
      <a
        {...props}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--notion-accent)] hover:underline"
      />
    );
  },
  blockquote: (props: any) => (
    <blockquote
      className="mb-4 rounded-md border-l-4 border-[var(--notion-accent)] bg-[var(--notion-callout)] px-4 py-3 text-[var(--notion-secondary)]"
      {...props}
    />
  ),
  table: (props: any) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      className="border-b border-[var(--notion-border)] px-3 py-2 text-[var(--notion-secondary)]"
      {...props}
    />
  ),
  td: (props: any) => (
    <td className="border-b border-[var(--notion-border)] px-3 py-2" {...props} />
  ),
};

type Props = { content: string };

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: "append", properties: { className: ["heading-anchor"] } },
          ],
          rehypeHighlight,
        ]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
