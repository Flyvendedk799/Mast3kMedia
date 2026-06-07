import { useState, useEffect } from 'react';
import { Github, Linkedin, Twitter, Mail, ArrowUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Footer = () => {
  const [socials, setSocials] = useState<{ icon: any; label: string; href: string }[]>([]);

  useEffect(() => {
    const fetchSocials = async () => {
      const { data } = await supabase.from('social_links').select('*').limit(1).single();
      if (data) {
        setSocials([
          { icon: Github, label: 'GitHub', href: data.github_url || '#' },
          { icon: Linkedin, label: 'LinkedIn', href: data.linkedin_url || '#' },
          { icon: Twitter, label: 'X', href: data.twitter_url || '#' },
          { icon: Mail, label: 'Email', href: data.email ? `mailto:${data.email}` : '#' },
        ]);
      }
    };
    fetchSocials();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const iconBtnStyle: React.CSSProperties = {
    width: 36, height: 36,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%',
  };

  return (
    <footer className="relative">
      {/* Full-width gradient divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #6366F1 30%, #F59E0B 70%, transparent)' }} />

      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col items-center gap-6">
        {/* Tagline */}
        <p className="text-center" style={{ fontSize: '1.1rem', fontWeight: 300, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
          Let's build something remarkable.
        </p>

        {/* Social icons */}
        <div className="flex items-center gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex items-center justify-center text-foreground/30 hover:text-primary hover:border-primary/60 hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 hover:scale-110"
              style={iconBtnStyle}
            >
              <s.icon className="w-4 h-4" />
            </a>
          ))}

          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="flex items-center justify-center text-foreground/30 hover:text-primary hover:border-primary/60 hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] hover:-translate-y-1 transition-all duration-300"
            style={iconBtnStyle}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Copyright */}
        <span className="text-xs text-foreground/20 tracking-wide">
          © {new Date().getFullYear()} Mast3kMedia. All rights reserved.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
