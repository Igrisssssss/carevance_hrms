import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import CTA from '@/components/landing/CTA';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';

export default function PricingPage() {
  return (
    <div className="relative overflow-x-clip bg-[linear-gradient(180deg,#fcfdff_0%,#f2f8ff_24%,#eef5ff_48%,#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.35),transparent_58%)]" />
      <div className="pointer-events-none absolute left-[-8%] top-[16%] h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6%] top-[38%] h-[26rem] w-[26rem] rounded-full bg-cyan-200/20 blur-3xl" />

      <Navbar />

      <section className="px-4 pb-6 pt-16 sm:px-6 sm:pb-10 sm:pt-22 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Plans & onboarding</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-[4.6rem] sm:leading-[0.94]">
            Pricing that fits trial setup now and billing activation later
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-[1.08rem]">
            Compare Starter, Growth, and Enterprise, then start a workspace owner signup flow with the plan and trial mode already selected.
          </p>
        </div>
      </section>

      <PricingSection standalone />
      <FAQSection />
      <CTA />
      <Footer />
    </div>
  );
}
