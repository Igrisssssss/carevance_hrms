import { useEffect, useMemo, useState } from 'react';
import { reportGroupApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type OrgUser = { id: number; name: string; email: string; role: 'admin' | 'manager' | 'employee' };
type ReportGroup = { id: number; name: string; users: OrgUser[] };

export default function UserManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [userForm, setUserForm] = useState({ id: 0, name: '', email: '', role: 'employee' as OrgUser['role'], password: '' });
  const [groupForm, setGroupForm] = useState({ id: 0, name: '', user_ids: [] as number[] });

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupForm.id) || null, [groups, groupForm.id]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [uRes, gRes] = await Promise.all([userApi.getAll({ period: 'all' }), reportGroupApi.list()]);
      setUsers((uRes.data || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
      setGroups((gRes.data?.data || []).map((g: any) => ({ id: g.id, name: g.name, users: g.users || [] })));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load user management data');
    } finally {
      setIsLoading(false);
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
      await load();
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
      await load();
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
      await load();
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
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete group');
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

