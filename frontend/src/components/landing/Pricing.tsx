import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';

const tiers = [
  {
    name: 'Starter',
    price: '$5',
    subtitle: 'per user/month',
    description: 'For early-stage teams building accountability from day one.',
    features: ['Realtime tracking', 'Basic reports', 'Project tagging', 'Email support'],
    featured: false,
  },
  {
    name: 'Pro',
    price: '$10',
    subtitle: 'per user/month',
    description: 'For scaling companies that need analytics and automation.',
    features: ['Everything in Starter', 'Productivity analytics', 'Automated reports', 'Manager dashboards'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    subtitle: 'pricing',
    description: 'For complex org structures, controls, and procurement workflows.',
    features: ['Custom onboarding', 'RBAC controls', 'Security reviews', 'Priority support'],
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with your team"
          description="Start with a self-serve plan, then upgrade when you need deeper controls, reporting, or rollouts."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              whileHover={{ y: -8 }}
              className={`premium-ring relative overflow-hidden rounded-[34px] border p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.85)] transition ${
                tier.featured
                  ? 'border-sky-300 bg-[linear-gradient(180deg,#06111f_0%,#020617_100%)] text-white'
                  : 'border-white/65 bg-white/82 text-slate-950 backdrop-blur-xl'
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-28 ${tier.featured ? 'bg-[linear-gradient(180deg,rgba(56,189,248,0.18),transparent)]' : 'bg-[linear-gradient(180deg,rgba(125,211,252,0.18),transparent)]'}`} />
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold tracking-[-0.04em]">{tier.name}</h3>
                {tier.featured && (
                  <span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                    Most popular
                  </span>
                )}
              </div>
              <p className={`relative mt-4 text-sm leading-7 ${tier.featured ? 'text-slate-300' : 'text-slate-600'}`}>
                {tier.description}
              </p>
              <div className="relative mt-9 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-[-0.06em]">{tier.price}</span>
                <span className={`pb-1 text-sm ${tier.featured ? 'text-slate-300' : 'text-slate-500'}`}>
                  {tier.subtitle}
                </span>
              </div>
              <ul className={`relative mt-8 space-y-3.5 text-sm ${tier.featured ? 'text-slate-200' : 'text-slate-600'}`}>
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${tier.featured ? 'bg-cyan-300' : 'bg-sky-600'}`} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`relative mt-9 inline-flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-semibold transition duration-300 ${
                  tier.featured
                    ? 'bg-white text-slate-950 hover:-translate-y-0.5 hover:bg-sky-100'
                    : 'bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-sky-600'
                }`}
              >
                {tier.name === 'Enterprise' ? 'Talk to sales' : 'Start Free Trial'}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
