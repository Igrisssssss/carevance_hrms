import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SectionHeading from './SectionHeading';

const faqs = [
  {
    question: 'Is employee data secure?',
    answer: 'Yes. CareVance encrypts data in transit and at rest, supports role-based access, and is designed for enterprise security review workflows.',
  },
  {
    question: 'Does CareVance track screenshots?',
    answer: 'Teams can configure privacy controls based on policy. The platform is designed to emphasize activity insights and focus patterns over invasive monitoring.',
  },
  {
    question: 'Does it work for remote teams?',
    answer: 'Yes. CareVance is built specifically for distributed teams that need visibility across home, office, and hybrid environments.',
  },
  {
    question: 'Can we export reports?',
    answer: 'Yes. Managers can export reports for payroll, client billing, internal reviews, and executive summaries.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Answers for buyers, operators, and team leads"
          description="The most common questions usually come down to deployment speed, privacy, and reporting flexibility."
        />
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-[26px] border border-white/60 bg-white/80 p-2 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.85)] backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 rounded-[20px] px-5 py-4 text-left"
                >
                  <span className="text-lg font-semibold tracking-tight text-slate-950">{faq.question}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
