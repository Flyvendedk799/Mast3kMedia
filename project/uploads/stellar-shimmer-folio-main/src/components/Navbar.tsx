import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Work', href: '#projects', id: 'projects' },
  { label: 'Services', href: '#services', id: 'services' },
  { label: 'Studio', href: '#about', id: 'about' },
  { label: 'Insights', href: '/insights', id: 'insights', external: true },
  { label: 'Contact', href: '#contact', id: 'contact' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section detection
  useEffect(() => {
    if (!isHome) return;
    const sectionIds = navLinks.map(l => l.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHome]);

  const handleClick = (href: string, external?: boolean) => {
    setMobileOpen(false);
    if (external) {
      navigate(href);
      return;
    }
    if (isHome) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/' + href);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-[hsl(235_30%_4%/0.7)] shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
      style={{
        borderBottom: scrolled ? '1px solid transparent' : 'none',
        borderImage: scrolled ? 'linear-gradient(90deg, transparent, hsl(239 84% 67% / 0.3), transparent) 1' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:border-primary/30 hover:shadow-[0_0_16px_hsl(239_84%_67%/0.25)] transition-all duration-300"
        >
          <span className="text-base font-bold font-heading bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            M3
          </span>
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => {
            const isActive = activeSection === l.id;
            return (
              <button
                key={l.href}
                onClick={() => handleClick(l.href, (l as any).external)}
                className="text-sm transition-colors duration-200 relative"
                style={{
                  color: isActive ? '#6366F1' : undefined,
                  borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
                  paddingBottom: 2,
                }}
              >
                <span className={isActive ? '' : 'text-muted-foreground hover:text-foreground transition-colors'}>
                  {l.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground/70"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden backdrop-blur-xl bg-[hsl(235_30%_4%/0.85)] border-t border-white/5 animate-fade-in">
          <div className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((l) => {
              const isActive = activeSection === l.id;
              return (
                <button
                  key={l.href}
                  onClick={() => handleClick(l.href, (l as any).external)}
                  className="text-left py-2 transition-colors duration-200"
                  style={{ color: isActive ? '#6366F1' : undefined }}
                >
                  <span className={isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground'}>
                    {l.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
