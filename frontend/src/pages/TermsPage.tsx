import LegalDocumentPage from '@/components/public/LegalDocumentPage';
import { termsAndConditionsSections } from '@/lib/legalContent';

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow="Terms & conditions"
      title="Usage terms for CareVance HRMS"
      description="These placeholder terms are included for pre-launch readiness so legal, support, and billing language can be reviewed in-context before production rollout."
      lastUpdated="April 6, 2026"
      sections={termsAndConditionsSections}
    />
  );
}
