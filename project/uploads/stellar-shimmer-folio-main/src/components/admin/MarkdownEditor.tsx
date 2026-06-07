import { useState } from 'react';
import { Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  rows?: number;
}

const renderMarkdown = (text: string) => {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-foreground">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-accent text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
};

const MarkdownEditor = ({ value, onChange, label = 'Content', rows = 5 }: MarkdownEditorProps) => {
  const [preview, setPreview] = useState(false);

  const inputClass = "w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary transition-colors resize-none font-mono";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {preview ? <Edit3 size={12} /> : <Eye size={12} />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div
          className="w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground leading-relaxed min-h-[120px]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={inputClass}
          placeholder="Supports **bold**, *italic*, `code`, ### headings"
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
