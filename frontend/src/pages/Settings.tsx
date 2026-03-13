import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess, isEmployeeUser } from '@/lib/permissions';
import { settingsApi } from '@/services/api';
import { User, Bell, Lock, CreditCard, Building } from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput, ToggleInput } from '@/components/ui/FormField';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SettingsPage() {
  const { user, organization, updateUser, updateOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [canManageOrg, setCanManageOrg] = useState(false);
  const [billingPlan, setBillingPlan] = useState<{ name: string; status: string; renewal_date?: string | null } | null>(null);

  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar || '');

  const [orgName, setOrgName] = useState(organization?.name || '');
  const [orgSlug, setOrgSlug] = useState(organization?.slug || '');

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyProject, setNotifyProject] = useState(true);
  const [notifyTask, setNotifyTask] = useState(true);
  const [timezone, setTimezone] = useState('UTC');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isEmployee = isEmployeeUser(user);
  const isOrgEditable = canManageOrg && hasAdminAccess(user) && !isEmployee;

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'organization', name: 'Organization', icon: Building },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ];

  const timezoneOptions = useMemo(
    () => ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'],
    []
  );

  useEffect(() => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setProfileAvatar(user?.avatar || '');
  }, [user]);

  useEffect(() => {
    setOrgName(organization?.name || '');
    setOrgSlug(organization?.slug || '');
  }, [organization]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [meResult, billingResult] = await Promise.allSettled([settingsApi.me(), settingsApi.billing()]);

        if (meResult.status === 'fulfilled') {
          const payload = meResult.value.data;
          const fetchedUser = payload.user;
          const fetchedOrg = payload.organization;
          const settings = fetchedUser?.settings || {};
          const notifications = settings.notifications || {};

          setCanManageOrg(Boolean(payload.can_manage_org));
          setProfileName(fetchedUser?.name || '');
          setProfileEmail(fetchedUser?.email || '');
          setProfileAvatar(fetchedUser?.avatar || '');
          setOrgName(fetchedOrg?.name || '');
          setOrgSlug(fetchedOrg?.slug || '');
          setTimezone(settings.timezone || 'UTC');
          setNotifyEmail(notifications.email ?? true);
          setNotifyWeekly(notifications.weekly_summary ?? true);
          setNotifyProject(notifications.project_updates ?? true);
          setNotifyTask(notifications.task_assignments ?? true);
        } else {
          setCanManageOrg(Boolean(hasAdminAccess(user) && !isEmployee));
        }

        if (billingResult.status === 'fulfilled') {
          setBillingPlan((billingResult.value.data as any)?.plan || null);
        } else {
          setBillingPlan(null);
        }

        if (meResult.status === 'rejected' && billingResult.status === 'rejected') {
          const meError = meResult.reason as any;
          setError(meError?.response?.data?.message || 'Failed to load settings');
        } else if (meResult.status === 'rejected') {
          const meError = meResult.reason as any;
          setError(meError?.response?.data?.message || 'Some settings could not be refreshed');
        } else if (billingResult.status === 'rejected') {
          setError('Billing details are temporarily unavailable');
        }
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isEmployee, user]);

  const saveProfile = async () => {
    setError('');
    setMessage('');
    try {
      const res = await settingsApi.updateProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
        avatar: profileAvatar.trim() || null,
      });
      const updated = (res.data as any)?.user;
      if (updated) updateUser(updated);
      setMessage((res.data as any)?.message || 'Profile updated');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update profile');
    }
  };

  const saveOrganization = async () => {
    setError('');
    setMessage('');
    try {
      const res = await settingsApi.updateOrganization({
        name: orgName.trim(),
        slug: orgSlug.trim(),
      });
      const updatedOrg = (res.data as any)?.organization || null;
      updateOrganization(updatedOrg);
      setMessage((res.data as any)?.message || 'Organization updated');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update organization');
    }
  };

  const savePreferences = async () => {
    setError('');
    setMessage('');
    try {
      const res = await settingsApi.updatePreferences({
        timezone,
        notifications: {
          email: notifyEmail,
          weekly_summary: notifyWeekly,
          project_updates: notifyProject,
          task_assignments: notifyTask,
        },
      });
      setMessage((res.data as any)?.message || 'Preferences updated');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update preferences');
    }
  };

  const updatePassword = async () => {
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    try {
      const res = await settingsApi.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage((res.data as any)?.message || 'Password updated');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update password');
    }
  };

  if (isLoading) {
    return <PageLoadingState label="Loading settings..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Account controls"
        title="Settings"
        description="Manage your profile, organization preferences, notifications, security, and billing details."
      />

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <SurfaceCard className="p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition ${activeTab === tab.id ? 'bg-sky-50 text-sky-700 shadow-[0_16px_34px_-26px_rgba(14,165,233,0.45)]' : 'text-gray-600 hover:bg-slate-50'}`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </SurfaceCard>
        </div>

        <SurfaceCard className="flex-1 p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
                  {user?.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <FieldLabel>Avatar URL</FieldLabel>
                  <TextInput
                    type="text"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="Avatar URL (optional)"
                  />
                  <p className="text-sm text-gray-500 mt-2">Paste image URL for avatar</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <TextInput
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <TextInput type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Role</FieldLabel>
                  <div className="flex min-h-11 items-center rounded-[20px] border border-slate-200 bg-slate-50 px-3.5">
                    <StatusBadge tone="info">{user?.role || 'Unknown'}</StatusBadge>
                  </div>
                </div>
              </div>
              <Button onClick={saveProfile}>Save Changes</Button>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Organization Name</FieldLabel>
                  <TextInput type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={!isOrgEditable} className={!isOrgEditable ? 'bg-slate-50 text-slate-500' : ''} />
                </div>
                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <TextInput type="text" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} disabled={!isOrgEditable} className={!isOrgEditable ? 'bg-slate-50 text-slate-500' : ''} />
                </div>
              </div>
              {isOrgEditable ? (
                <Button onClick={saveOrganization}>Save Changes</Button>
              ) : (
                <p className="text-sm text-gray-500">Only admin/manager can update organization settings.</p>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              <div>
                <FieldLabel>Timezone</FieldLabel>
                <SelectInput value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full md:w-72">
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </SelectInput>
              </div>
              {[
                { label: 'Email notifications', value: notifyEmail, set: setNotifyEmail },
                { label: 'Weekly summary', value: notifyWeekly, set: setNotifyWeekly },
                { label: 'Project updates', value: notifyProject, set: setNotifyProject },
                { label: 'Task assignments', value: notifyTask, set: setNotifyTask },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-slate-50/65 px-4 py-3">
                  <span className="text-gray-700">{item.label}</span>
                  <ToggleInput checked={item.value} onChange={item.set} />
                </div>
              ))}
              <Button onClick={savePreferences}>Save Preferences</Button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <div><FieldLabel>Current Password</FieldLabel><TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
              <div><FieldLabel>New Password</FieldLabel><TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              <div><FieldLabel>Confirm Password</FieldLabel><TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
              <Button onClick={updatePassword}>Update Password</Button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Billing & Subscription</h2>
              <div className="rounded-[24px] border border-sky-200/80 bg-sky-50/80 p-4">
                <p className="text-sm text-primary-600">Current Plan: <span className="font-semibold">{billingPlan?.name || 'Basic'}</span></p>
                <p className="text-xs text-primary-500 mt-1">
                  Status: {billingPlan?.status || 'N/A'}
                  {billingPlan?.renewal_date ? ` | Renewal: ${new Date(billingPlan.renewal_date).toLocaleDateString()}` : ''}
                </p>
              </div>
              <Button disabled variant="secondary">Manage Subscription (Coming soon)</Button>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
