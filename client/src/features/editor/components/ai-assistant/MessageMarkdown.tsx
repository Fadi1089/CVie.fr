import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { children: string };

export function MessageMarkdown({ children }: Props) {
  return (
    <div className="markdown-body break-words text-[13px] leading-6 text-[var(--color-ink)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _node, ...p }) => <h3 className="mt-2 mb-1 text-[14px] font-semibold" {...p} />,
          h2: ({ node: _node, ...p }) => <h3 className="mt-2 mb-1 text-[14px] font-semibold" {...p} />,
          h3: ({ node: _node, ...p }) => <h4 className="mt-2 mb-1 text-[13px] font-semibold" {...p} />,
          h4: ({ node: _node, ...p }) => <h5 className="mt-1.5 mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]" {...p} />,
          p: ({ node: _node, ...p }) => <p className="mb-1.5 last:mb-0" {...p} />,
          ul: ({ node: _node, ...p }) => <ul className="mb-1.5 list-disc pl-5 [&_ul]:my-0.5 [&_ol]:my-0.5" {...p} />,
          ol: ({ node: _node, ...p }) => <ol className="mb-1.5 list-decimal pl-5 [&_ul]:my-0.5 [&_ol]:my-0.5" {...p} />,
          li: ({ node: _node, ...p }) => <li className="mb-0.5" {...p} />,
          strong: ({ node: _node, ...p }) => <strong className="font-semibold" {...p} />,
          em: ({ node: _node, ...p }) => <em className="italic" {...p} />,
          a: ({ node: _node, ...p }) => <a className="underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
          code: ({ node: _node, ...p }) => <code className="rounded bg-[var(--color-paper-soft,#fafaf7)] px-1 py-0.5 text-[12px]" {...p} />,
          pre: ({ node: _node, ...p }) => <pre className="mb-1.5 overflow-x-auto rounded-md bg-[var(--color-paper-soft,#fafaf7)] p-2 text-[12px] leading-5" {...p} />,
          blockquote: ({ node: _node, ...p }) => <blockquote className="mb-1.5 border-l-2 border-[var(--color-rule)] pl-2 text-[var(--color-ink-soft)]" {...p} />,
          hr: () => <hr className="my-2 border-[var(--color-rule)]" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
