import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import AdaptiveSurface from '@/components/ui/AdaptiveSurface';
import BrandLogo from '@/components/branding/BrandLogo';
import { inviteApi } from '@/services/api';
import { InviteValidationResponse } from '@/types';

export default function InviteSignupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [isLoading, setIsLoading] = useState(true);
  const [invite, setInvite] = useState<InviteValidationResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      if (!token) {
        setError('Invite token is missing.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await inviteApi.validate(token);
        if (!mounted) return;
        if (response.data.valid) {
          setInvite(response.data);
          setError('');
        } else {
          setError(response.data.message || 'This invite is not valid.');
        }
      } catch (requestError: any) {
        if (!mounted) return;
        setError(requestError?.response?.data?.message || 'Unable to validate this invite.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    validate();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fcfdff_0%,#f2f8ff_26%,#eef5ff_56%,#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.32),transparent_58%)]" />
      <div className="pointer-events-none absolute -left-16 top-28 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-40 h-[28rem] w-[28rem] rounded-full bg-cyan-200/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1200px] items-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-xl animate-fade-in">
          <AdaptiveSurface
            className="glass-panel premium-ring rounded-[34px] p-6 shadow-[0_40px_120px_-56px_rgba(15,23,42,0.45)] sm:p-8"
            tone="light"
            backgroundColor="rgba(255,255,255,0.8)"
          >
            <div className="mb-6">
              <div className="mb-6 flex items-center">
                <Link
                  to="/"
                  aria-label="Back to home"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_16px_35px_-24px_rgba(15,23,42,0.25)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-slate-950 hover:text-slate-950"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
              <BrandLogo variant="full" size="sm" className="mb-5 max-w-[16rem]" />
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-[3.1rem] sm:leading-[0.95]">
                Continue your invite signup
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600">
                This page validates the invite token before you continue. Wire your full signup form here once ready.
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 px-4 py-4 text-sm text-slate-600">
                Validating invite...
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            {!isLoading && invite?.valid ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Invite verified</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      {invite.email} {invite.role ? `(${invite.role})` : ''}
                    </p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-4 text-sm text-slate-600">
                  Placeholder: continue the signup flow here, then call the invite acceptance endpoint once the account is created.
                </div>
              </div>
            ) : null}
          </AdaptiveSurface>
        </div>
      </div>
    </main>
  );
}
