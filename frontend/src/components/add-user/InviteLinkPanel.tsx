import Button from '@/components/ui/Button';

interface InviteLinkPanelProps {
  inviteUrl: string;
  onGenerate: () => void;
  onCopy: () => void;
  isGenerating?: boolean;
  isCopying?: boolean;
}

export default function InviteLinkPanel({
  inviteUrl,
  onGenerate,
  onCopy,
  isGenerating = false,
  isCopying = false,
}: InviteLinkPanelProps) {
  return (
    <div className="space-y-4 rounded-[26px] border border-slate-200/90 bg-white/90 p-5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.2)]">
      <div>
        <p className="text-sm font-semibold text-slate-950">Reusable invite link</p>
        <p className="mt-1 text-sm text-slate-500">
          Share this onboarding link with employees, managers, admins, or clients. They will land on registration with the selected access context prefilled.
        </p>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Invite URL</p>
        <p className="mt-2 break-all text-sm font-medium text-slate-950">
          {inviteUrl || 'Generate a link to preview the onboarding URL.'}
        </p>
      </div>

      <div className="rounded-[22px] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
        Invite link generation is mock-ready right now. The UI and payload structure are in place, but the backend does not yet expose persistent invite-token endpoints.
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Invite Link'}
        </Button>
        <Button variant="secondary" onClick={onCopy} disabled={!inviteUrl || isCopying}>
          {isCopying ? 'Copying...' : 'Copy Link'}
        </Button>
      </div>
    </div>
  );
}
