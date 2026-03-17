import { ShieldCheck, UserCog, UserRound, UsersRound } from 'lucide-react';
import { FieldLabel } from '@/components/ui/FormField';
import { InviteUserRole } from '@/services/addUser';

const roleOptions: Array<{
  value: InviteUserRole;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    value: 'employee',
    label: 'Regular User',
    description: 'Track work and attendance.',
    icon: UserRound,
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Monitor team activity and approvals.',
    icon: UsersRound,
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full platform control and configuration.',
    icon: ShieldCheck,
  },
  {
    value: 'client',
    label: 'Client',
    description: 'Limited client-facing visibility.',
    icon: UserCog,
  },
];

export default function RoleSelector({
  value,
  onChange,
  allowedRoles = roleOptions.map((option) => option.value),
}: {
  value: InviteUserRole;
  onChange: (role: InviteUserRole) => void;
  allowedRoles?: InviteUserRole[];
}) {
  return (
    <div>
      <FieldLabel>Access Level</FieldLabel>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {roleOptions.filter((option) => allowedRoles.includes(option.value)).map((option) => {
          const Icon = option.icon;
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${
                active
                  ? 'border-sky-300 bg-sky-50/85 shadow-[0_22px_46px_-34px_rgba(14,165,233,0.45)]'
                  : 'border-slate-200/90 bg-white/85 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-2.5 ${active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{option.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
