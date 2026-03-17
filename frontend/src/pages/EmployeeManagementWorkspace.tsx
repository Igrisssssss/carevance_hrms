import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invitationApi, organizationApi, reportGroupApi, userApi } from '@/services/api';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterPanel from '@/components/dashboard/FilterPanel';
import MetricCard from '@/components/dashboard/MetricCard';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import DataTable from '@/components/dashboard/DataTable';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { useAuth } from '@/contexts/AuthContext';
import { getAssignableRoles } from '@/lib/permissions';
import { KeyRound, MailPlus, ShieldCheck, Users } from 'lucide-react';

type EmployeeWorkspaceMode = 'employees' | 'teams' | 'invitations' | 'roles';

const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const modeCopy: Record<EmployeeWorkspaceMode, { title: string; description: string; eyebrow: string }> = {
  employees: {
    eyebrow: 'Employee Management',
    title: 'Employees',
    description: 'Employee directory with work status, tracked time, and a current 360 summary for the selected person.',
  },
  teams: {
    eyebrow: 'Employee Management',
    title: 'Teams / Departments',
    description: 'Manage report groups as teams or departments using the existing backend group model.',
  },
  invitations: {
    eyebrow: 'Employee Management',
    title: 'Invitations / Onboarding',
    description: 'Send secure invitations, review pending onboarding, and track active members.',
  },
  roles: {
    eyebrow: 'Employee Management',
    title: 'Roles / Permissions',
    description: 'Review and update employee roles against the existing user role model.',
  },
};

export default function EmployeeManagementWorkspace({ mode }: { mode: EmployeeWorkspaceMode }) {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<number[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'employee' | 'client'>('employee');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const allowedRoles = useMemo(() => getAssignableRoles(user, organization), [organization, user]);

  const usersQuery = useQuery({
    queryKey: ['employee-workspace-users'],
    queryFn: async () => {
      const response = await userApi.getAll({ period: 'all' });
      return response.data || [];
    },
  });

  const groupsQuery = useQuery({
    queryKey: ['employee-workspace-groups'],
    queryFn: async () => {
      const response = await reportGroupApi.list();
      return response.data?.data || [];
    },
  });

  const membersQuery = useQuery({
    queryKey: ['employee-workspace-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const response = await organizationApi.getMembers(organization.id);
      return response.data || [];
    },
    enabled: Boolean(organization?.id),
  });

  const invitationsQuery = useQuery({
    queryKey: ['employee-workspace-invitations'],
    queryFn: async () => {
      const response = await invitationApi.list();
      return response.data?.invitations || [];
    },
    enabled: mode === 'invitations' && allowedRoles.length > 0,
  });

  const selectedUser = useMemo(
    () => (usersQuery.data || []).find((item: any) => item.id === selectedUserId) || (usersQuery.data || [])[0] || null,
    [selectedUserId, usersQuery.data]
  );

  useEffect(() => {
    if (!selectedUserId && (usersQuery.data || []).length > 0) {
      setSelectedUserId(usersQuery.data![0].id);
    }
  }, [selectedUserId, usersQuery.data]);

  useEffect(() => {
    if (allowedRoles.length === 0) {
      return;
    }

    if (!allowedRoles.includes(inviteRole)) {
      setInviteRole(allowedRoles[0] as 'admin' | 'manager' | 'employee' | 'client');
    }
  }, [allowedRoles, inviteRole]);

  const profileQuery = useQuery({
    queryKey: ['employee-workspace-profile', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return null;
      const response = await userApi.getProfile360(selectedUser.id);
      return response.data;
    },
    enabled: mode === 'employees' && Boolean(selectedUser?.id),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error('Organization context unavailable.');
      }

      await invitationApi.create({
        email: inviteEmail.trim(),
        role: inviteRole,
        delivery: 'email',
      });
    },
    onSuccess: async () => {
      setInviteEmail('');
      setInviteRole('employee');
      setFeedback({ tone: 'success', message: 'Invitation sent successfully.' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-workspace-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['employee-workspace-members', organization?.id] }),
      ]);
    },
    onError: (error: any) => {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || error?.message || 'Failed to send invitation.' });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      await reportGroupApi.create({ name: groupName.trim(), user_ids: groupMembers });
    },
    onSuccess: async () => {
      setGroupName('');
      setGroupMembers([]);
      setFeedback({ tone: 'success', message: 'Team created successfully.' });
      await queryClient.invalidateQueries({ queryKey: ['employee-workspace-groups'] });
    },
    onError: (error: any) => {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to create team.' });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: 'admin' | 'manager' | 'employee' }) => {
      await userApi.update(userId, { role });
    },
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Role updated successfully.' });
      await queryClient.invalidateQueries({ queryKey: ['employee-workspace-users'] });
    },
    onError: (error: any) => {
      setFeedback({ tone: 'error', message: error?.response?.data?.message || 'Failed to update role.' });
    },
  });

  const isLoading = usersQuery.isLoading || groupsQuery.isLoading || membersQuery.isLoading || profileQuery.isLoading || invitationsQuery.isLoading;
  const isError = usersQuery.isError || groupsQuery.isError || membersQuery.isError || profileQuery.isError || invitationsQuery.isError;
  const pageTitle = modeCopy[mode];
  const users = usersQuery.data || [];
  const groups = groupsQuery.data || [];
  const members = membersQuery.data || [];
  const invitations = invitationsQuery.data || [];

  if (isLoading) {
    return <PageLoadingState label={`Loading ${pageTitle.title.toLowerCase()}...`} />;
  }

  if (isError) {
    return (
      <PageErrorState
        message={
          (usersQuery.error as any)?.response?.data?.message ||
          (groupsQuery.error as any)?.response?.data?.message ||
          (membersQuery.error as any)?.response?.data?.message ||
          (invitationsQuery.error as any)?.response?.data?.message ||
          (profileQuery.error as any)?.response?.data?.message ||
          'Failed to load employee management data.'
        }
        onRetry={() => {
          void usersQuery.refetch();
          void groupsQuery.refetch();
          void membersQuery.refetch();
          void profileQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={pageTitle.eyebrow} title={pageTitle.title} description={pageTitle.description} />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {mode === 'employees' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Employees" value={users.length} hint="Current organization users" icon={Users} accent="sky" />
            <MetricCard label="Working Now" value={users.filter((user: any) => user.is_working).length} hint="Active timers right now" icon={ShieldCheck} accent="emerald" />
            <MetricCard label="Managers / Admins" value={users.filter((user: any) => user.role !== 'employee').length} hint="Elevated roles" icon={KeyRound} accent="violet" />
            <MetricCard label="Tracked Time" value={formatDuration(users.reduce((sum: number, user: any) => sum + Number(user.total_elapsed_duration || user.total_duration || 0), 0))} hint="Visible across users" icon={Users} accent="amber" />
          </div>

          <FilterPanel className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Selected Employee</FieldLabel>
              <SelectInput value={selectedUserId || ''} onChange={(event) => setSelectedUserId(event.target.value ? Number(event.target.value) : null)}>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </SelectInput>
            </div>
          </FilterPanel>

          <DataTable
            title="Employee Directory"
            description="Role, work state, and tracked hours from the existing users endpoint."
            rows={users}
            emptyMessage="No employees found."
            columns={[
              { key: 'employee', header: 'Employee', render: (row: any) => <div><p className="font-medium text-slate-950">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
              { key: 'role', header: 'Role', render: (row: any) => row.role },
              { key: 'working', header: 'Working', render: (row: any) => (row.is_working ? 'Yes' : 'No') },
              { key: 'project', header: 'Current Project', render: (row: any) => row.current_project || 'No active timer' },
              { key: 'tracked', header: 'Tracked', render: (row: any) => formatDuration(row.total_elapsed_duration || row.total_duration || 0) },
            ]}
          />

          {!profile ? (
            <PageEmptyState title="No employee selected" description="Select an employee to load the profile summary." />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SurfaceCard className="p-5">
                <h2 className="text-lg font-semibold text-slate-950">Employee 360</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Worked</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatDuration(profile.summary.total_duration)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance Days</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{profile.summary.present_days}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Approved Leave</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{profile.summary.approved_leave_days}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Time Adjustments</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatDuration(profile.summary.approved_time_edit_seconds)}</p>
                  </div>
                </div>
              </SurfaceCard>
              <DataTable
                title="Recent Time Entries"
                description="Latest recorded work sessions for the selected employee."
                rows={profile.recent_time_entries || []}
                emptyMessage="No recent time entries found."
                columns={[
                  { key: 'project', header: 'Project', render: (row: any) => row.project?.name || 'No project' },
                  { key: 'description', header: 'Description', render: (row: any) => row.description || 'No description' },
                  { key: 'duration', header: 'Duration', render: (row: any) => formatDuration(row.duration || 0) },
                  { key: 'start', header: 'Start', render: (row: any) => new Date(row.start_time).toLocaleString() },
                ]}
              />
            </div>
          )}
        </>
      )}

      {mode === 'teams' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SurfaceCard className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">Create Team / Department</h2>
            <div className="mt-4 space-y-4">
              <div>
                <FieldLabel>Team Name</FieldLabel>
                <TextInput value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Engineering" />
              </div>
              <div>
                <FieldLabel>Members</FieldLabel>
                <div className="max-h-56 overflow-auto rounded-[22px] border border-slate-200 p-3">
                  {users.map((user: any) => (
                    <label key={user.id} className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={groupMembers.includes(user.id)}
                        onChange={(event) =>
                          setGroupMembers((current) =>
                            event.target.checked ? [...current, user.id] : current.filter((value) => value !== user.id)
                          )
                        }
                      />
                      {user.name} ({user.email})
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={() => createGroupMutation.mutate()} disabled={!groupName.trim() || createGroupMutation.isPending}>
                Create Team
              </Button>
            </div>
          </SurfaceCard>

          <DataTable
            title="Existing Teams"
            description="Current report groups reused as teams or departments."
            rows={groups}
            emptyMessage="No teams found."
            columns={[
              { key: 'name', header: 'Team', render: (row: any) => row.name },
              { key: 'members', header: 'Members', render: (row: any) => row.users?.length || 0 },
              { key: 'member_names', header: 'People', render: (row: any) => (row.users || []).map((user: any) => user.name).join(', ') || 'No members' },
            ]}
          />
        </div>
      )}

      {mode === 'invitations' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SurfaceCard className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">Send Invitation</h2>
            <p className="mt-1 text-sm text-slate-500">Invitation emails send secure accept links, and the backend locks email and role when the user completes signup.</p>
            <div className="mt-4 space-y-4">
              {allowedRoles.length === 0 ? (
                <PageEmptyState title="Invite permissions unavailable" description="Your current role does not allow sending workspace invitations." />
              ) : null}
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="employee@company.com" />
              </div>
              <div>
                <FieldLabel>Role</FieldLabel>
                <SelectInput value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'admin' | 'manager' | 'employee' | 'client')}>
                  {allowedRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail.trim() || inviteMutation.isPending || allowedRoles.length === 0}>
                <MailPlus className="h-4 w-4" />
                Send Invitation
              </Button>
            </div>
          </SurfaceCard>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <MetricCard label="Active Members" value={members.length} hint="Loaded from organization members" icon={Users} accent="sky" />
              <MetricCard label="Pending Invites" value={invitations.filter((item: any) => item.status === 'pending').length} hint="Tracked from the invitation system" icon={MailPlus} accent="amber" />
            </div>
            <DataTable
              title="Pending Invitations"
              description="Secure invites waiting to be accepted."
              rows={invitations}
              emptyMessage="No invitations found."
              columns={[
                { key: 'email', header: 'Email', render: (row: any) => row.email },
                { key: 'role', header: 'Role', render: (row: any) => row.role },
                { key: 'status', header: 'Status', render: (row: any) => row.status },
                { key: 'expires_at', header: 'Expires', render: (row: any) => row.expires_at ? new Date(row.expires_at).toLocaleString() : 'n/a' },
              ]}
            />
            <DataTable
              title="Current Members"
              description="Active organization members available from the current backend."
              rows={members}
              emptyMessage="No members found."
              columns={[
                { key: 'name', header: 'Name', render: (row: any) => row.name },
                { key: 'email', header: 'Email', render: (row: any) => row.email },
                { key: 'role', header: 'Role', render: (row: any) => row.role },
                { key: 'status', header: 'Status', render: (row: any) => (row.is_active ? 'Active' : 'Inactive') },
              ]}
            />
          </div>
        </div>
      )}

      {mode === 'roles' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Admins" value={users.filter((user: any) => user.role === 'admin').length} hint="Organization admins" icon={ShieldCheck} accent="sky" />
            <MetricCard label="Managers" value={users.filter((user: any) => user.role === 'manager').length} hint="Managers" icon={ShieldCheck} accent="emerald" />
            <MetricCard label="Employees" value={users.filter((user: any) => user.role === 'employee').length} hint="Employee users" icon={Users} accent="violet" />
            <MetricCard label="Permission Model" value="Role-based" hint="Using current user.role field" icon={KeyRound} accent="amber" />
          </div>

          <SurfaceCard className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">Role Assignment</h2>
            <div className="mt-4 space-y-3">
              {users.length === 0 ? (
                <PageEmptyState title="No users found" description="Users must exist before roles can be updated." />
              ) : (
                users.map((user: any) => (
                  <div key={user.id} className="flex flex-col gap-3 rounded-[22px] border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <SelectInput
                        value={user.role}
                        onChange={(event) =>
                          updateRoleMutation.mutate({
                            userId: user.id,
                            role: event.target.value as 'admin' | 'manager' | 'employee',
                          })
                        }
                        className="min-w-[11rem]"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </SelectInput>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </>
      )}
    </div>
  );
}
