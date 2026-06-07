import { lazy, Suspense } from 'react';
import FloatingOrbs from '@/components/FloatingOrbs';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Projects from '@/components/Projects';
import Experience from '@/components/Experience';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import CustomCursor from '@/components/CustomCursor';
import PageLoader from '@/components/PageLoader';
import ScrollProgress from '@/components/ScrollProgress';
import SectionDivider from '@/components/SectionDivider';
import MouseSpotlight from '@/components/MouseSpotlight';
import TechMarquee from '@/components/TechMarquee';
import Services from '@/components/Services';
import LogoMarquee from '@/components/LogoMarquee';
import TestimonialsSection from '@/components/TestimonialsSection';
import Stats from '@/components/Stats';
import Process from '@/components/Process';
import Industries from '@/components/Industries';
import FAQ from '@/components/FAQ';

const GlobalScene = lazy(() => import('@/components/GlobalScene'));

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden noise-overlay">
      <PageLoader />
      <CustomCursor />
      <ScrollProgress />

      <FloatingOrbs />
      <Suspense fallback={null}>
        <GlobalScene />
      </Suspense>
      <MouseSpotlight />

      <Navbar />
      <main className="relative z-10">
        <Hero />
        <LogoMarquee />
        <About />
        <TechMarquee />
        <Projects />
        <Stats />
        <SectionDivider />
        <Services />
        <Process />
        <SectionDivider />
        <Industries />
        <SectionDivider />
        <TestimonialsSection />
        <SectionDivider />
        <Experience />
        <FAQ />
        <SectionDivider />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
