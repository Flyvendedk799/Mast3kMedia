import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';
import Testimonials from '@/components/Testimonials';

const items = [
  {
    quote:
      'Mast3kMedia shipped in three weeks what our in-house team scoped at three months. The craft is on another level — every interaction feels considered.',
    author: 'Sofia Lindgren',
    role: 'Head of Product, Nordsk',
  },
  {
    quote:
      "They're rare — engineers who design and designers who actually ship. Our marketing site converts 40% better and the team didn't have to babysit a single pixel.",
    author: 'Marcus Wei',
    role: 'CEO, Hyperloop',
  },
  {
    quote:
      'The studio embedded with us for a quarter and rewrote how we think about product. Their judgment is worth the engagement on its own.',
    author: 'Anders Bruun',
    role: 'CTO, Voltaic',
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="relative py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Word from clients</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>
        <ShimmerHeading
          text="What teams say"
          accent="after shipping"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-10 text-white"
        />
        <Testimonials items={items} />
      </div>
    </section>
  );
};

export default TestimonialsSection;
