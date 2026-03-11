import { motion } from 'framer-motion';
import { DownloadCloud, Gauge, ScanSearch } from 'lucide-react';
import SectionHeading from './SectionHeading';

const steps = [
  {
    icon: DownloadCloud,
    title: 'Create the organization and manage users',
    description: 'Admins create the organization, add employees or managers, and optionally organize people into report groups.',
  },
  {
    icon: ScanSearch,
    title: 'Track work, attendance, and desktop activity',
    description: 'Employees punch in, run timers, and the desktop tracker can record app usage, URLs, idle periods, and screenshots.',
  },
  {
    icon: Gauge,
    title: 'Review dashboards, approvals, and payroll actions',
    description: 'Managers monitor activity, review attendance and overtime requests, export reports, and process payroll records.',
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Workflow"
          title="How the implemented workflow works"
          description="This sequence is taken from the code paths that connect auth, timer tracking, desktop telemetry, reporting, and admin approvals."
        />

        <div className="relative mt-16 grid gap-8 lg:grid-cols-3">
          <div className="absolute left-1/2 top-12 hidden h-px w-[68%] -translate-x-1/2 bg-[linear-gradient(90deg,rgba(15,23,42,0.15),rgba(14,165,233,0.55),rgba(15,23,42,0.15))] lg:block" />
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="relative rounded-[30px] border border-white/60 bg-white/75 p-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#0f172a,#0284c7,#67e8f9)] text-white shadow-[0_22px_38px_-20px_rgba(14,165,233,0.8)]">
                <step.icon className="h-9 w-9" />
              </div>
              <div className="mx-auto mt-6 flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700">
                {index + 1}
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
