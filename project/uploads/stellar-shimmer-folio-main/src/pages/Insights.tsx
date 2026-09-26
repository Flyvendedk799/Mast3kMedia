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

/* ── Compact card for the grid ─────────────────────────────── */
const PostCard = ({ post }: { post: Post }) => {
  const mins = readingTime(post.content);
  return (
    <Link
      to={`/insights/${post.slug}`}
      className="glass rounded-2xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 flex flex-col"
    >
      {post.cover_url ? (
        <img
          src={post.cover_url}
          alt={post.title}
          className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
        />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-primary/10 to-accent/10" />
      )}
      <div className="p-5 lg:p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
          {post.published_at && (
            <span>{new Date(post.published_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock size={11} /> {mins} min</span>
        </div>
        <h3 className="text-lg lg:text-xl font-heading font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-2 text-xs text-primary">
          Read article <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  );
};

/* ── Featured hero card (latest post) ──────────────────────── */
const FeaturedCard = ({ post }: { post: Post }) => {
  const mins = readingTime(post.content);
  return (
    <Link
      to={`/insights/${post.slug}`}
      className="glass rounded-2xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 grid grid-cols-1 lg:grid-cols-2"
    >
      {/* Image – stacks on mobile, left half on desktop */}
      {post.cover_url ? (
        <img
          src={post.cover_url}
          alt={post.title}
          className="w-full h-56 sm:h-64 lg:h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
        />
      ) : (
        <div className="w-full h-56 sm:h-64 lg:h-full bg-gradient-to-br from-primary/10 to-accent/10" />
      )}

      {/* Copy – right half on desktop */}
      <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary mb-4 block">Featured</span>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
          {post.published_at && (
            <span>{new Date(post.published_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock size={11} /> {mins} min</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-foreground mb-4 leading-tight group-hover:text-primary transition-colors">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-4 mb-6">{post.excerpt}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          Read article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

/* ── Page ───────────────────────────────────────────────────── */
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

  const [featured, ...rest] = posts;

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden noise-overlay">
      <CustomCursor />
      <FloatingOrbs />
      <Navbar />

      <main className="relative z-10">
        {/* ── Header ── */}
        <section className="pt-32 pb-12 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">Insights</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-foreground mt-3 mb-4 leading-tight">
              Notes from the <span className="gradient-text">studio</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Field notes on building product, shipping fast, and running a small senior team.
            </p>
          </div>
        </section>

        {/* ── Posts ── */}
        <section className="pb-24 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="space-y-8">
                {/* Featured skeleton */}
                <div className="glass rounded-2xl gradient-border h-64 lg:h-80 animate-pulse" />
                {/* Grid skeleton */}
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="glass rounded-2xl gradient-border h-72 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="glass rounded-2xl gradient-border p-16 text-center">
                <p className="text-muted-foreground">No insights published yet. Check back soon.</p>
              </div>
            ) : (
              <div className="space-y-8 lg:space-y-10">
                {/* Featured latest post – full-width hero */}
                {featured && <FeaturedCard post={featured} />}

                {/* Remaining posts – responsive grid */}
                {rest.length > 0 && (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                    {rest.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </div>
                )}
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
