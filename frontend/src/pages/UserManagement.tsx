import { useEffect, useMemo, useState } from 'react';
import { reportGroupApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';

type OrgUser = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  is_working?: boolean;
  current_project?: string | null;
  total_duration?: number;
  total_elapsed_duration?: number;
};
type ReportGroup = { id: number; name: string; users: OrgUser[] };

const COUNTRY_TIMEZONES: Record<string, string[]> = {
  India: ['Asia/Kolkata'],
  USA: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  UK: ['Europe/London'],
  UAE: ['Asia/Dubai'],
  Australia: ['Australia/Sydney', 'Australia/Perth'],
};

export default function UserManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('all');
  const [country, setCountry] = useState('India');
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [userForm, setUserForm] = useState({ id: 0, name: '', email: '', role: 'employee' as OrgUser['role'], password: '' });
  const [groupForm, setGroupForm] = useState({ id: 0, name: '', user_ids: [] as number[] });

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupForm.id) || null, [groups, groupForm.id]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!COUNTRY_TIMEZONES[country]?.includes(timezone)) {
      setTimezone(COUNTRY_TIMEZONES[country][0]);
    }
  }, [country, timezone]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    const timer = setInterval(loadUsers, 15000);
    return () => clearInterval(timer);
  }, [period, country, timezone, startDate, endDate, isAdmin]);

  const loadInitial = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [uRes, gRes] = await Promise.all([
        userApi.getAll({
          period,
          country,
          timezone,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        reportGroupApi.list(),
      ]);
      setUsers((uRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_working: Boolean(u.is_working),
        current_project: u.current_project || null,
        total_duration: Number(u.total_duration || 0),
        total_elapsed_duration: Number(u.total_elapsed_duration || 0),
      })));
      setGroups((gRes.data?.data || []).map((g: any) => ({ id: g.id, name: g.name, users: g.users || [] })));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load user management data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const uRes = await userApi.getAll({
        period,
        country,
        timezone,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setUsers((uRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_working: Boolean(u.is_working),
        current_project: u.current_project || null,
        total_duration: Number(u.total_duration || 0),
        total_elapsed_duration: Number(u.total_elapsed_duration || 0),
      })));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load users');
    }
  };

  const loadGroups = async () => {
    try {
      const gRes = await reportGroupApi.list();
      setGroups((gRes.data?.data || []).map((g: any) => ({ id: g.id, name: g.name, users: g.users || [] })));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load groups');
    }
  };

  const saveUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    setError('');
    setMessage('');
    try {
      if (userForm.id) {
        await userApi.update(userForm.id, {
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
        });
        setMessage('User updated');
      } else {
        await userApi.create({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          password: userForm.password || undefined,
        });
        setMessage('User created');
      }
      setUserForm({ id: 0, name: '', email: '', role: 'employee', password: '' });
      await Promise.all([loadUsers(), loadGroups()]);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save user');
    }
  };

  const editUser = (u: OrgUser) => {
    setUserForm({ id: u.id, name: u.name, email: u.email, role: u.role, password: '' });
  };

  const removeUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    setMessage('');
    try {
      await userApi.delete(id);
      setMessage('User deleted');
      await Promise.all([loadUsers(), loadGroups()]);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete user');
    }
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) return;
    setError('');
    setMessage('');
    try {
      if (groupForm.id) {
        await reportGroupApi.update(groupForm.id, { name: groupForm.name.trim(), user_ids: groupForm.user_ids });
        setMessage('Group updated');
      } else {
        await reportGroupApi.create({ name: groupForm.name.trim(), user_ids: groupForm.user_ids });
        setMessage('Group created');
      }
      setGroupForm({ id: 0, name: '', user_ids: [] });
      await loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save group');
    }
  };

  const editGroup = (g: ReportGroup) => {
    setGroupForm({ id: g.id, name: g.name, user_ids: (g.users || []).map((u) => u.id) });
  };

  const removeGroup = async (id: number) => {
    if (!confirm('Delete this group?')) return;
    setError('');
    setMessage('');
    try {
      await reportGroupApi.delete(id);
      setMessage('Group deleted');
      if (groupForm.id === id) setGroupForm({ id: 0, name: '', user_ids: [] });
      await loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete group');
    }
  };

  const formatDuration = (seconds?: number) => {
    const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getRoleColor = (role: OrgUser['role']) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isAdmin) {
    return <div className="text-sm text-gray-500">Only admin or manager can access user management.</div>;
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Add/edit users and create groups for reports</p>
      </div>

      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="flex gap-2">
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'all', label: 'All Time' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setPeriod(option.id as 'today' | 'week' | 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${period === option.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {Object.keys(COUNTRY_TIMEZONES).map((countryName) => (
              <option key={countryName} value={countryName}>{countryName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {(COUNTRY_TIMEZONES[country] || []).map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setPeriod('all'); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No users found</p>
          </div>
        ) : users.map((u) => (
          <div key={`summary-${u.id}`} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{u.name}</h3>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>{u.role}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs ${u.is_working ? 'text-green-600' : 'text-gray-500'}`}>
                {u.is_working ? `Working${u.current_project ? ` on ${u.current_project}` : ''}` : 'Not working'}
              </span>
              <span className={`text-xs font-medium ${u.is_working ? 'text-green-600' : 'text-gray-500'}`}>
                {u.is_working ? 'Active now' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Attendance: <span className={u.is_working ? 'text-green-600' : 'text-gray-500'}>{u.is_working ? 'Present (Working)' : 'Not Working'}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              Total worked ({startDate || endDate ? 'Custom Range' : period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'All Time'} - {timezone}): {formatDuration(u.total_elapsed_duration ?? u.total_duration)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">{userForm.id ? 'Edit User' : 'Add User'}</h2>
          <input value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as OrgUser['role'] }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          {!userForm.id ? (
            <input type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} placeholder="Password (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          ) : null}
          <div className="flex gap-2">
            <button onClick={saveUser} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{userForm.id ? 'Update User' : 'Add User'}</button>
            {userForm.id ? <button onClick={() => setUserForm({ id: 0, name: '', email: '', role: 'employee', password: '' })} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button> : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">{groupForm.id ? 'Edit Group' : 'Create Group'}</h2>
          <input value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} placeholder="Group name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="max-h-44 overflow-auto border border-gray-200 rounded-lg p-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm py-1">
                <input
                  type="checkbox"
                  checked={groupForm.user_ids.includes(u.id)}
                  onChange={(e) => {
                    setGroupForm((prev) => ({
                      ...prev,
                      user_ids: e.target.checked ? [...prev.user_ids, u.id] : prev.user_ids.filter((id) => id !== u.id),
                    }));
                  }}
                />
                {u.name} ({u.email})
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveGroup} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{groupForm.id ? 'Update Group' : 'Create Group'}</button>
            {groupForm.id ? <button onClick={() => setGroupForm({ id: 0, name: '', user_ids: [] })} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button> : null}
          </div>
          {selectedGroup ? <p className="text-xs text-gray-500">Editing members for: {selectedGroup.name}</p> : null}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-2">Users</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
              <div className="text-sm">{u.name} ({u.email}) <span className="text-gray-500">[{u.role}]</span></div>
              <div className="flex gap-2">
                <button onClick={() => editUser(u)} className="px-2 py-1 text-xs border border-gray-300 rounded">Edit</button>
                <button onClick={() => removeUser(u.id)} className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-2">Groups</h2>
        <div className="space-y-2">
          {groups.length === 0 ? <p className="text-sm text-gray-500">No groups yet.</p> : groups.map((g) => (
            <div key={g.id} className="border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{g.name}</p>
                <div className="flex gap-2">
                  <button onClick={() => editGroup(g)} className="px-2 py-1 text-xs border border-gray-300 rounded">Edit</button>
                  <button onClick={() => removeGroup(g.id)} className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded">Delete</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Members: {(g.users || []).map((u) => u.name).join(', ') || 'None'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
