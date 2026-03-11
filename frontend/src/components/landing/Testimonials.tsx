import { motion } from 'framer-motion';
import SectionHeading from './SectionHeading';

const testimonials = [
  {
    quote: 'TimeTrack increased our team productivity by 35%.',
    author: 'CEO',
    company: 'Remote Agency',
    initials: 'RA',
  },
  {
    quote: 'We finally have one source of truth for focus time, delivery risk, and operational load.',
    author: 'VP Operations',
    company: 'ScaleForge',
    initials: 'SF',
  },
  {
    quote: 'The analytics changed how we run weekly staffing and client planning conversations.',
    author: 'COO',
    company: 'Northstar Digital',
    initials: 'ND',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Customers"
          title="Teams use TimeTrack to improve execution without adding management drag"
          description="Customer stories consistently point to the same outcome: clearer visibility, faster planning, and better focus."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.company}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="rounded-[30px] border border-white/60 bg-white/80 p-7 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.85)] backdrop-blur"
            >
              <p className="text-lg leading-8 text-slate-700">"{testimonial.quote}"</p>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#0ea5e9)] text-sm font-semibold text-white">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
