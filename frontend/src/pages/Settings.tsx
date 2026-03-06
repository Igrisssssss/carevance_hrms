import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi } from '@/services/api';
import { User, Bell, Lock, CreditCard, Building } from 'lucide-react';

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

  const isEmployee = user?.role === 'employee';
  const isOrgEditable = canManageOrg && !isEmployee;

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
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [meRes, billRes] = await Promise.all([settingsApi.me(), settingsApi.billing()]);
        const payload = meRes.data;
        const fetchedUser = payload.user;
        const fetchedOrg = payload.organization;
        const settings = fetchedUser?.settings || {};
        const notifications = settings.notifications || {};

        setCanManageOrg(Boolean(payload.can_manage_org));
        setBillingPlan((billRes.data as any)?.plan || null);

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
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === tab.id ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <input
                    type="text"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="Avatar URL (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-2">Paste image URL for avatar</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input type="text" value={user?.role || ''} disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" />
                </div>
              </div>
              <button onClick={saveProfile} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Save Changes</button>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={!isOrgEditable} className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${!isOrgEditable ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} disabled={!isOrgEditable} className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${!isOrgEditable ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
              </div>
              {isOrgEditable ? (
                <button onClick={saveOrganization} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Save Changes</button>
              ) : (
                <p className="text-sm text-gray-500">Only admin/manager can update organization settings.</p>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full md:w-72 border border-gray-300 rounded-lg px-3 py-2">
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              {[
                { label: 'Email notifications', value: notifyEmail, set: setNotifyEmail },
                { label: 'Weekly summary', value: notifyWeekly, set: setNotifyWeekly },
                { label: 'Project updates', value: notifyProject, set: setNotifyProject },
                { label: 'Task assignments', value: notifyTask, set: setNotifyTask },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-700">{item.label}</span>
                  <input type="checkbox" checked={item.value} onChange={(e) => item.set(e.target.checked)} className="h-5 w-5 text-primary-600 rounded" />
                </div>
              ))}
              <button onClick={savePreferences} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Save Preferences</button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <button onClick={updatePassword} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Update Password</button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Billing & Subscription</h2>
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-sm text-primary-600">Current Plan: <span className="font-semibold">{billingPlan?.name || 'Basic'}</span></p>
                <p className="text-xs text-primary-500 mt-1">
                  Status: {billingPlan?.status || 'N/A'}
                  {billingPlan?.renewal_date ? ` | Renewal: ${new Date(billingPlan.renewal_date).toLocaleDateString()}` : ''}
                </p>
              </div>
              <button disabled className="px-4 py-2 border border-gray-300 rounded-lg font-medium bg-gray-50 text-gray-500">Manage Subscription (Coming soon)</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
