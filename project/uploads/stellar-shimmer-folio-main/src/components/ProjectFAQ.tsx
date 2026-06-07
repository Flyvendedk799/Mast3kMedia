import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface ProjectFAQProps {
  items: FAQItem[];
}

const ProjectFAQ = ({ items }: ProjectFAQProps) => {
  const [open, setOpen] = useState<number | null>(0);
  if (!items?.length) return null;

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Frequently <span className="gradient-text">asked</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10">Questions I get the most about this project.</p>
        <div className="space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`glass rounded-xl gradient-border overflow-hidden transition-all duration-500 ${isOpen ? 'shadow-lg shadow-primary/10' : ''}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-muted/10 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-foreground">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
                <div
                  className="grid transition-all duration-500"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProjectFAQ;
