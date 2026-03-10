import { useState, useEffect } from 'react';
import { userApi } from '@/services/api';
import { Users, Trash2 } from 'lucide-react';
import type { User } from '@/types';

const COUNTRY_TIMEZONES: Record<string, string[]> = {
  India: ['Asia/Kolkata'],
  USA: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  UK: ['Europe/London'],
  UAE: ['Asia/Dubai'],
  Australia: ['Australia/Sydney', 'Australia/Perth'],
};

export default function Team() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('all');
  const [country, setCountry] = useState('India');
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!COUNTRY_TIMEZONES[country]?.includes(timezone)) {
      setTimezone(COUNTRY_TIMEZONES[country][0]);
    }
  }, [country, timezone]);

  useEffect(() => {
    fetchUsers();
    const timer = setInterval(fetchUsers, 15000);
    return () => clearInterval(timer);
  }, [period, timezone, startDate, endDate]);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll({
        period,
        country,
        timezone,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setUsers(res.data);
    }
    catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this team member?')) return;
    try { await userApi.delete(id); fetchUsers(); }
    catch (e) { console.error(e); }
  };

  const getRoleColor = (role: string) => {
    switch (role) { case 'admin': return 'bg-purple-100 text-purple-700'; case 'manager': return 'bg-blue-100 text-blue-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const formatDuration = (seconds?: number) => {
    const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Team</h1><p className="text-gray-500 mt-1">Manage your team members</p></div>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'all', label: 'All Time' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setPeriod(option.id as 'today' | 'week' | 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === option.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {Object.keys(COUNTRY_TIMEZONES).map((countryName) => (
              <option key={countryName} value={countryName}>
                {countryName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {(COUNTRY_TIMEZONES[country] || []).map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
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
        {users.length === 0 ? <div className="col-span-full text-center py-12 text-gray-500"><Users className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p>No team members yet</p></div> : users.map(user => (
          <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-lg font-bold">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>{user.role}</span>
              <span className={`text-xs ${(user as any).is_working ? 'text-green-600' : 'text-gray-500'}`}>
                {(user as any).is_working ? `Working${(user as any).current_project ? ` on ${(user as any).current_project}` : ''}` : 'Not working'}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Attendance: <span className={(user as any).is_working ? 'text-green-600' : 'text-gray-500'}>{(user as any).is_working ? 'Present (Working)' : 'Not Working'}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              Total worked ({startDate || endDate ? 'Custom Range' : period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'All Time'} - {timezone}): {formatDuration(user.total_elapsed_duration ?? user.total_duration)}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
