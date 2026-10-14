'use client';

import { FileText, ExternalLink } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { prettify } from '@/lib/format';

type Doc = { doc_type: string; file_url: string; mime_type?: string; uploaded_at?: string };

export default function DocViewer({ documents }: { documents: Doc[] }) {
  if (!documents?.length) return <p className="text-sm text-muted-foreground">No documents uploaded.</p>;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {documents.map((d) => {
        const url = fileUrl(d.file_url);
        const isPdf = d.mime_type === 'application/pdf' || d.file_url.endsWith('.pdf');
        return (
          <a
            key={d.doc_type}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="relative flex h-36 items-center justify-center overflow-hidden bg-muted">
              {isPdf ? (
                <FileText className="h-12 w-12 text-muted-foreground" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={d.doc_type}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <ExternalLink className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium group-hover:text-primary">{prettify(d.doc_type)}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
