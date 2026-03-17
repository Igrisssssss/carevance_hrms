import { CSSProperties, lazy, Suspense } from 'react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import DemoSection from '@/components/landing/DemoSection';
import Features from '@/components/landing/Features';
import Workflow from '@/components/landing/Workflow';
import Benefits from '@/components/landing/Benefits';
import Security from '@/components/landing/Security';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

const Screenshots = lazy(() => import('@/components/landing/Screenshots'));

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip bg-[linear-gradient(180deg,#fcfdff_0%,#f2f8ff_24%,#eef5ff_48%,#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.35),transparent_58%)]" />
      <div className="pointer-events-none absolute left-[-8%] top-[16%] h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6%] top-[38%] h-[26rem] w-[26rem] rounded-full bg-cyan-200/20 blur-3xl" />
      <div className="particle-layer" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="particle"
            style={
              {
                '--size': `${(index % 4) + 6}px`,
                '--left': `${(index * 7) % 100}%`,
                '--duration': `${12 + (index % 5) * 3}s`,
                '--delay': `${(index % 6) * 1.1}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <Navbar />
      <Hero />
      <DemoSection />
      <Features />
      <Workflow />
      <Benefits />
      <Suspense fallback={<div className="px-4 py-20 sm:px-6 lg:px-8" />}>
        <Screenshots />
      </Suspense>
      <Security />
      <PricingSection />
      <FAQSection />
      <CTA />
      <Footer />
    </div>
  );
}
