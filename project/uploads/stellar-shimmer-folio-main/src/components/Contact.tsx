import { useState, useEffect } from 'react';
import { Github, Linkedin, Twitter, Mail, Send, ArrowUpRight, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [socials, setSocials] = useState<{ icon: any; label: string; href: string }[]>([]);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Message sent!', description: "Thanks for reaching out. I'll get back to you soon." });
    setForm({ name: '', email: '', message: '' });
  };

  const inputClasses = "peer w-full rounded-xl px-4 pt-6 pb-2 text-white text-sm outline-none transition-all duration-300 placeholder-transparent"
    + " border border-white/[0.08] focus:border-primary/60 focus:shadow-[0_0_16px_hsl(239_84%_67%/0.15)]"
    + " bg-[rgba(0,0,0,0.3)] backdrop-blur-sm";
  const labelClasses = "absolute left-4 top-2 text-xs text-foreground/40 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary";

  return (
    <section id="contact" className="relative py-[120px] px-6">
      {/* Radial glow behind section */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '700px', height: '700px',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(239 84% 67% / 0.06) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="max-w-5xl mx-auto relative">
        {/* Full-width heading */}
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Start a Project</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>
        <ShimmerHeading
          text="Let's"
          accent="Build"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-6 text-white"
        />
        <Reveal variant="up" delay={160}>
          <p className="text-foreground/50 text-base md:text-lg text-center mb-16 max-w-2xl mx-auto">
            Have a product in mind or scoping a new engagement? Tell us about it — we'll get back within one business day.
          </p>
        </Reveal>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-16">
          {/* LEFT column — info */}
          <Reveal as="div" variant="right" delay={120} className="lg:w-[40%] flex flex-col justify-center relative">
            {/* sentinel removed to keep original markup */}
            {/* Decorative glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 300, height: 300,
                top: '20%', left: '-10%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                filter: 'blur(80px)',
              }}
            />

            <div className="relative space-y-6">
              {/* Info rows */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Mail size={18} className="text-primary" />
                </div>
                <a href="mailto:tobiaspreisler@gmail.com" className="text-sm transition-colors duration-200 hover:text-primary" style={{ color: '#B8BCC8' }}>
                  tobiaspreisler@gmail.com
                </a>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <MapPin size={18} className="text-primary" />
                </div>
                <span className="text-sm" style={{ color: '#B8BCC8' }}>Copenhagen, Denmark</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Clock size={18} className="text-primary" />
                </div>
                <span className="text-sm" style={{ color: '#B8BCC8' }}>Usually replies within 24 hours</span>
              </div>

              {/* Social icons */}
              <div className="flex gap-3 pt-4">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.label !== 'Email' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-full flex items-center justify-center text-foreground/40 hover:text-primary hover:shadow-[0_0_16px_hsl(239_84%_67%/0.25)] transition-all duration-300 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label={s.label}
                  >
                    <s.icon size={18} />
                  </a>
                ))}
              </div>

              {/* Book intro call */}
              <a
                href="https://cal.com/mast3kmedia/intro"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-foreground/90 hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(245,158,11,0.06))',
                  border: '1px solid rgba(99,102,241,0.25)',
                  boxShadow: '0 0 24px hsl(239 84% 67% / 0.10)',
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Clock size={16} className="text-primary" />
                  Book a 30-min intro call
                </span>
                <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </a>
            </div>
          </Reveal>

          {/* RIGHT column — form */}
          <Reveal as="div" variant="left" delay={200} className="lg:w-[60%]">
            <div
              className="rounded-2xl p-8 md:p-10"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {[
                  { id: 'name', type: 'text', label: 'Name', value: form.name, key: 'name' as const },
                  { id: 'email', type: 'email', label: 'Email', value: form.email, key: 'email' as const },
                ].map((field) => (
                  <div key={field.id} className="relative">
                    <input
                      type={field.type}
                      required
                      value={field.value}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className={inputClasses}
                      placeholder={field.label}
                      id={field.id}
                    />
                    <label htmlFor={field.id} className={labelClasses}>
                      {field.label}
                    </label>
                  </div>
                ))}

                <div className="relative">
                  <textarea
                    required rows={5} value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`${inputClasses} resize-none`}
                    placeholder="Message" id="message"
                  />
                  <label htmlFor="message" className={labelClasses}>
                    Message
                  </label>
                </div>

                <button
                  type="submit"
                  className="group w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 75% 72%))',
                    boxShadow: '0 4px 20px hsl(239 84% 67% / 0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px hsl(239 84% 67% / 0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px hsl(239 84% 67% / 0.2)'; }}
                >
                  <Send size={16} /> Send Message
                  <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
