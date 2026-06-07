import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const InquiryCTA = ({ projectTitle }: { projectTitle: string }) => {
  const contactHref = `/?project=${encodeURIComponent(projectTitle)}#contact`;
  return (
    <section className="py-20" id="inquiry">
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative glass rounded-3xl gradient-border p-10 md:p-14 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-primary mb-4 border border-primary/20">
                <Sparkles size={12} /> Start a similar engagement
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Like what you see in <span className="gradient-text">{projectTitle}</span>?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Tell us about your goals and we&apos;ll send a tailored proposal within one business day — referencing what worked in this project.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Link
                to={contactHref}
                className="glow-button px-6 py-3 rounded-lg text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2"
              >
                Start a project <ArrowRight size={16} />
              </Link>
              <a
                href="https://cal.com/mast3kmedia/intro"
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-lg px-6 py-3 text-foreground font-semibold text-sm gradient-border inline-flex items-center justify-center gap-2 hover:bg-muted/30 transition-all"
              >
                Book a call
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InquiryCTA;
