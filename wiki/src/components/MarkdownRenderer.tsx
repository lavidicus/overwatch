import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

const markdownComponents = {
  h1: (props: any) => <h1 className="mb-4 text-3xl font-semibold" {...props} />,
  h2: (props: any) => <h2 className="mb-3 mt-6 text-2xl font-semibold" {...props} />,
  h3: (props: any) => <h3 className="mb-2 mt-5 text-xl font-semibold" {...props} />,
  p: (props: any) => <p className="mb-4 leading-7 text-slate-200" {...props} />,
  ul: (props: any) => <ul className="mb-4 list-disc space-y-1 pl-5" {...props} />,
  ol: (props: any) => <ol className="mb-4 list-decimal space-y-1 pl-5" {...props} />,
  code: (props: any) => (
    <code className="rounded bg-slate-900 px-1 py-0.5 text-sm" {...props} />
  ),
  pre: (props: any) => (
    <pre className="mb-4 overflow-x-auto rounded bg-slate-900 p-4 text-sm" {...props} />
  ),
  a: (props: any) => (
    <a className="text-[#3498db] hover:underline" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="mb-4 border-l-4 border-slate-700 pl-4 text-slate-300" {...props} />
  ),
  table: (props: any) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border-b border-slate-700 px-3 py-2 text-slate-300" {...props} />
  ),
  td: (props: any) => (
    <td className="border-b border-slate-800 px-3 py-2" {...props} />
  ),
};

type Props = { content: string };

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings, rehypeHighlight]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
