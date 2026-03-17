import { FieldLabel, TextInput } from '@/components/ui/FormField';
import Button from '@/components/ui/Button';

interface InviteLinkPanelProps {
  email: string;
  inviteUrl: string;
  onEmailChange: (value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  isGenerating?: boolean;
  isCopying?: boolean;
}

export default function InviteLinkPanel({
  email,
  inviteUrl,
  onEmailChange,
  onGenerate,
  onCopy,
  isGenerating = false,
  isCopying = false,
}: InviteLinkPanelProps) {
  return (
    <div className="space-y-4 rounded-[26px] border border-slate-200/90 bg-white/90 p-5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.2)]">
      <div>
        <p className="text-sm font-semibold text-slate-950">Single-use secure invite link</p>
        <p className="mt-1 text-sm text-slate-500">
          Generate a secure invite URL for one email address. The recipient lands on CareVance with the invited email and role already locked.
        </p>
      </div>

      <div>
        <FieldLabel>Recipient Email</FieldLabel>
        <TextInput
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="new.user@company.com"
        />
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Invite URL</p>
        <p className="mt-2 break-all text-sm font-medium text-slate-950">
          {inviteUrl || 'Generate a link to preview the onboarding URL.'}
        </p>
      </div>

      <div className="rounded-[22px] border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-800">
        This link is secure and single-use. If you need reusable links later, keep this panel as the starting point for a future multi-use flow.
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onGenerate} disabled={isGenerating || !email.trim()}>
          {isGenerating ? 'Generating...' : 'Generate Invite Link'}
        </Button>
        <Button variant="secondary" onClick={onCopy} disabled={!inviteUrl || isCopying}>
          {isCopying ? 'Copying...' : 'Copy Link'}
        </Button>
      </div>
    </div>
  );
}
