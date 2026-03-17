import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import AdaptiveSurface from '@/components/ui/AdaptiveSurface';
import { desktopDownloadUrl } from '@/lib/runtimeConfig';

export default function CTA() {
  return (
    <section className="px-4 py-18 sm:px-6 sm:py-24 lg:px-8">
      <AdaptiveSurface
        as={motion.div}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.6 }}
        className="premium-ring noise-overlay mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_22%,#075985_60%,#22d3ee_100%)] px-6 py-10 text-white shadow-[0_42px_120px_-56px_rgba(2,6,23,0.95)] sm:rounded-[44px] sm:px-12 sm:py-18"
        tone="dark"
        backgroundColor="#0f172a"
        data-navbar-contrast="dark"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_30%)]" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-2xl">
            <p className="contrast-text-accent text-sm font-semibold uppercase tracking-[0.28em]">Start now</p>
            <h2 className="contrast-text-primary mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-6xl sm:leading-[0.95]">
              Launch a workspace trial or talk through your CareVance rollout
            </h2>
            <p className="contrast-text-secondary mt-4 text-base leading-7 sm:text-lg sm:leading-8">
              Start the owner signup flow for immediate setup, or connect with sales when you need a guided rollout or enterprise planning.
            </p>
          </div>
          <div className="relative flex flex-col gap-3 sm:gap-4 sm:flex-row">
            <Link
              to="/start-trial"
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-50 sm:w-auto"
            >
              Start Free Trial
            </Link>
            <Link
              to="/contact-sales"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 sm:w-auto"
            >
              Contact Sales
            </Link>
            <a
              href={desktopDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-slate-950/20 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-slate-950/30 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Download for Windows
            </a>
          </div>
        </div>
      </AdaptiveSurface>
    </section>
  );
}
