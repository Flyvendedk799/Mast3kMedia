import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingOrbs from '@/components/FloatingOrbs';
import CustomCursor from '@/components/CustomCursor';
import { ArrowRight, Clock } from 'lucide-react';
import { readingTime } from '@/lib/readingTime';
import type { Tables } from '@/integrations/supabase/types';

type Post = Tables<'blog_posts'>;

const Insights = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      setPosts(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden noise-overlay">
      <CustomCursor />
      <FloatingOrbs />
      <Navbar />

      <main className="relative z-10">
        <section className="pt-32 pb-12 px-6">
          <div className="max-w-5xl mx-auto">
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">Insights</span>
            <h1 className="text-4xl md:text-6xl font-heading font-extrabold text-foreground mt-3 mb-4 leading-tight">
              Notes from the <span className="gradient-text">studio</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Field notes on building product, shipping fast, and running a small senior team.
            </p>
          </div>
        </section>

        <section className="pb-24 px-6">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="glass rounded-2xl gradient-border h-72 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="glass rounded-2xl gradient-border p-16 text-center">
                <p className="text-muted-foreground">No insights published yet. Check back soon.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {posts.map((p) => {
                  const mins = readingTime(p.content);
                  return (
                    <Link
                      key={p.id}
                      to={`/insights/${p.slug}`}
                      className="glass rounded-2xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 flex flex-col"
                    >
                      {p.cover_url ? (
                        <img
                          src={p.cover_url}
                          alt={p.title}
                          className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-primary/10 to-accent/10" />
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                          {p.published_at && (
                            <span>{new Date(p.published_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          )}
                          <span>·</span>
                          <span className="inline-flex items-center gap-1"><Clock size={11} /> {mins} min</span>
                        </div>
                        <h3 className="text-xl font-heading font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">{p.excerpt}</p>
                        )}
                        <div className="mt-auto flex items-center gap-2 text-xs text-primary">
                          Read article <ArrowRight size={12} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Insights;
