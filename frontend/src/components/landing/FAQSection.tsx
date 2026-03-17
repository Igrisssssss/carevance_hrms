import AdaptiveSurface from '@/components/ui/AdaptiveSurface';
import { pricingFaqs } from '@/constants/pricing';

export default function FAQSection() {
  return (
    <section id="faq" className="px-4 py-18 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">FAQ</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-[3.15rem] sm:leading-[0.95]">
            Answers for trials, billing, onboarding, and invites
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Straightforward answers for the first questions teams ask while setting up a new HRMS workspace.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {pricingFaqs.map((item) => (
            <AdaptiveSurface
              key={item.question}
              className="rounded-[28px] border border-white/80 bg-white/88 p-6 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.26)]"
              tone="light"
              backgroundColor="rgba(255,255,255,0.88)"
            >
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
            </AdaptiveSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
