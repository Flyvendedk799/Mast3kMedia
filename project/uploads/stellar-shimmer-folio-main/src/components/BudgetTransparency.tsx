import { Wallet, Clock, FileText } from 'lucide-react';

type Budget = { range?: string; model?: string; duration?: string; note?: string };

const BudgetTransparency = ({ data }: { data: Budget }) => {
  if (!data || (!data.range && !data.model && !data.duration && !data.note)) return null;
  return (
    <section className="py-16" id="budget">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Budget & <span className="gradient-text">scope</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">We believe in transparency about how engagements are priced.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {data.range && (
            <div className="glass rounded-xl gradient-border p-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
                <Wallet size={14} /> Investment range
              </div>
              <div className="text-2xl font-bold gradient-text">{data.range}</div>
            </div>
          )}
          {data.model && (
            <div className="glass rounded-xl gradient-border p-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
                <FileText size={14} /> Engagement model
              </div>
              <div className="text-lg font-semibold text-foreground">{data.model}</div>
            </div>
          )}
          {data.duration && (
            <div className="glass rounded-xl gradient-border p-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
                <Clock size={14} /> Total duration
              </div>
              <div className="text-lg font-semibold text-foreground">{data.duration}</div>
            </div>
          )}
        </div>

        {data.note && (
          <div className="glass rounded-xl gradient-border p-5 text-sm text-muted-foreground leading-relaxed border-l-2 border-l-primary/40">
            {data.note}
          </div>
        )}
      </div>
    </section>
  );
};

export default BudgetTransparency;
