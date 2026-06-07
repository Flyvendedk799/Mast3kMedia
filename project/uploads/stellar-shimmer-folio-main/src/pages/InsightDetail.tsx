import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingOrbs from '@/components/FloatingOrbs';
import CustomCursor from '@/components/CustomCursor';
import ShareBar from '@/components/ShareBar';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { readingTime } from '@/lib/readingTime';
import type { Tables } from '@/integrations/supabase/types';

type Post = Tables<'blog_posts'>;

const InsightDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug!).eq('published', true).maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data);
      const { data: rel } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .neq('id', data.id)
        .order('published_at', { ascending: false })
        .limit(3);
      setRelated(rel || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl gradient-text animate-pulse">Loading…</div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="relative min-h-screen bg-background overflow-x-hidden">
        <FloatingOrbs />
        <Navbar />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
          <div className="glass rounded-2xl gradient-border p-12 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Article not found</h1>
            <Link to="/insights" className="glow-button px-6 py-3 rounded-lg text-primary-foreground font-semibold text-sm inline-flex items-center gap-2">
              <ArrowLeft size={16} /> All insights
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mins = readingTime(post.content);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden noise-overlay">
      <CustomCursor />
      <FloatingOrbs />
      <Navbar />

      <main className="relative z-10">
        <article className="pt-32 pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/insights"
              className="glass rounded-full px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-2 mb-10 hover:-translate-x-1 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> All insights
            </Link>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {post.tags.map((t) => (
                  <span key={t} className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground leading-tight mb-5">
              {post.title}
            </h1>

            <div className="flex items-center justify-between flex-wrap gap-4 mb-10 pb-6 border-b border-border">
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground/80 font-medium">{post.author}</span>
                {post.published_at && (
                  <span className="ml-3 text-muted-foreground">
                    {new Date(post.published_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              <ShareBar title={post.title} readingMinutes={mins} />
            </div>

            {post.cover_url && (
              <img src={post.cover_url} alt={post.title} className="w-full rounded-2xl mb-10 ring-1 ring-white/5" />
            )}

            <div className="prose prose-invert max-w-none prose-headings:font-heading prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground/80 prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-code:text-accent prose-code:bg-muted/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-card/60 prose-pre:border prose-pre:border-border prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-img:rounded-xl prose-hr:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>

            <div className="mt-12 pt-8 border-t border-border flex items-center justify-between flex-wrap gap-4">
              <ShareBar title={post.title} />
              <Link
                to="/insights"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                More insights <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="py-16 px-6 border-t border-border">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-8">Keep <span className="gradient-text">reading</span></h2>
              <div className="grid md:grid-cols-3 gap-5">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/insights/${r.slug}`}
                    className="glass rounded-2xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500"
                  >
                    {r.cover_url ? (
                      <img src={r.cover_url} alt={r.title} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-primary/10 to-accent/10" />
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{r.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default InsightDetail;
