import { Link } from 'react-router-dom';
import { useConsent } from '@/contexts/ConsentContext';

export default function AuthPageFooter() {
  const { openPreferences } = useConsent();

  return (
    <div className="mt-6 border-t border-slate-200/80 pt-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
        <Link to="/privacy" className="font-medium transition hover:text-slate-950">
          Privacy Policy
        </Link>
        <Link to="/terms" className="font-medium transition hover:text-slate-950">
          Terms & Conditions
        </Link>
        <Link to="/support" className="font-medium transition hover:text-slate-950">
          Support
        </Link>
        <button
          type="button"
          onClick={openPreferences}
          className="font-medium text-slate-500 transition hover:text-slate-950"
        >
          Cookie Preferences
        </button>
      </div>
    </div>
  );
}
