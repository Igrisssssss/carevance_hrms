import { motion } from 'framer-motion';
import SectionHeading from './SectionHeading';

const logos = ['Stripe', 'Notion', 'Figma', 'Linear', 'Remote', 'Zapier', 'Airtable', 'Ramp'];

export default function LogoCloud() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Trusted by"
          title="Trusted by 5,000+ teams worldwide"
          description="High-performing product, support, and operations teams rely on CareVance to see where work moves and where it slows down."
        />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {logos.map((logo, index) => (
            <motion.div
              key={logo}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="group flex h-24 items-center justify-center rounded-3xl border border-white/60 bg-white/70 px-6 text-xl font-semibold tracking-tight text-slate-400 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.6)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:text-slate-900"
            >
              <span className="grayscale transition duration-300 group-hover:grayscale-0">{logo}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
