import { useEffect, useMemo, useState } from 'react';
import { reportApi, reportGroupApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Calendar, Clock, Download, TrendingUp, Users } from 'lucide-react';

type OrgUser = { id: number; name: string; email: string; role: string };
type Group = { id: number; name: string; users: OrgUser[] };

const toDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${h}h ${m}m`;
};

const formatLastActivity = (value?: string | null) => {
  if (!value) return 'No activity';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity';
  return parsed.toLocaleString();
};

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [startDate, setStartDate] = useState(toDate(new Date(new Date().setDate(1))));
  const [endDate, setEndDate] = useState(toDate(new Date()));
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [filterMode, setFilterMode] = useState<'team' | 'user' | 'group'>(isAdmin ? 'team' : 'user');
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [overallData, setOverallData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reportScope: 'self' | 'organization' = isAdmin ? 'organization' : 'self';

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [uRes, gRes] = await Promise.all([
          userApi.getAll({ period: 'all' }),
          isAdmin ? reportGroupApi.list() : Promise.resolve({ data: { data: [] as any[] } }),
        ]);
        setUsers((uRes.data || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
        setGroups((gRes.data?.data || []).map((g: any) => ({ id: g.id, name: g.name, users: g.users || [] })));
      } catch (e) {
        console.error(e);
      }
    };
    loadFilters();
  }, [isAdmin]);

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, reportType, filterMode, JSON.stringify(selectedUserIds), JSON.stringify(selectedGroupIds)]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError('');
    try {
      const commonParams = { start_date: startDate, end_date: endDate, scope: reportScope };
      const reportPromise =
        reportType === 'daily'
          ? reportApi.daily({ date: startDate, scope: reportScope })
          : reportType === 'weekly'
            ? reportApi.weekly(commonParams)
            : reportApi.monthly(commonParams);

      const overallParams: any = { start_date: startDate, end_date: endDate };
      if (isAdmin) {
        if (filterMode === 'user' && selectedUserIds.length > 0) {
          overallParams.user_ids = selectedUserIds;
        }
        if (filterMode === 'group' && selectedGroupIds.length > 0) {
          overallParams.group_ids = selectedGroupIds;
        }
      }

      const [rRes, oRes] = await Promise.all([reportPromise, reportApi.overall(overallParams)]);
      setReportData(rRes.data);
      setOverallData(oRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportApi.export({ start_date: startDate, end_date: endDate });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLabel = useMemo(() => {
    if (!isAdmin) return 'My report';
    if (filterMode === 'user') return 'User report';
    if (filterMode === 'group') return 'Group report';
    return 'Team report';
  }, [isAdmin, filterMode]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Dashboard</h1>
          <p className="text-gray-500 mt-1">{filteredLabel}</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((type) => (
            <button key={type} onClick={() => setReportType(type)} className={`px-3 py-1.5 text-sm rounded-lg ${reportType === type ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {isAdmin ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
              <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as 'team' | 'user' | 'group')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="team">Team Report</option>
                <option value="user">User Report</option>
                <option value="group">Group Report</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <div className="text-sm text-gray-500">Employee view only shows your own data.</div>
            </div>
          )}
        </div>

        {isAdmin && filterMode === 'user' ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Users</label>
            <div className="max-h-36 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border border-gray-200 rounded-lg p-2">
              {users.map((u) => (
                <label key={u.id} className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={(e) => setSelectedUserIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))}
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {isAdmin && filterMode === 'group' ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Groups</label>
            <div className="max-h-36 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border border-gray-200 rounded-lg p-2">
              {groups.map((g) => (
                <label key={g.id} className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={(e) => setSelectedGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)))}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? <div className="text-sm text-gray-500">Loading reports...</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard label="Total Work" value={formatDuration(overallData?.summary?.total_duration || reportData?.total_duration || 0)} icon={<Calendar className="h-4 w-4 text-primary-600" />} />
            <StatCard label="Billable Work" value={formatDuration(overallData?.summary?.billable_duration || reportData?.billable_duration || 0)} icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
            <StatCard label="Idle Time" value={formatDuration(overallData?.summary?.idle_duration || 0)} icon={<Clock className="h-4 w-4 text-amber-600" />} />
            <StatCard label="Users" value={String(overallData?.summary?.users_count || 0)} icon={<Users className="h-4 w-4 text-blue-600" />} />
            <StatCard label="Active Users" value={String(overallData?.summary?.active_users || 0)} icon={<BarChart3 className="h-4 w-4 text-purple-600" />} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">Working Details</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2">User</th>
                  <th className="text-left px-4 py-2">Total</th>
                  <th className="text-left px-4 py-2">Billable</th>
                  <th className="text-left px-4 py-2">Idle</th>
                  <th className="text-left px-4 py-2">Idle %</th>
                  <th className="text-left px-4 py-2">Last Activity</th>
                  <th className="text-left px-4 py-2">Working</th>
                </tr>
              </thead>
              <tbody>
                {(overallData?.by_user || []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-4 text-gray-500">No report rows found.</td></tr>
                ) : (
                  (overallData?.by_user || []).map((row: any) => (
                    <tr key={row.user.id} className="border-b border-gray-100">
                      <td className="px-4 py-2">{row.user.name}</td>
                      <td className="px-4 py-2">{formatDuration(row.total_duration || 0)}</td>
                      <td className="px-4 py-2">{formatDuration(row.billable_duration || 0)}</td>
                      <td className="px-4 py-2">{formatDuration(row.idle_duration || 0)}</td>
                      <td className="px-4 py-2">{Number(row.idle_percentage || 0).toFixed(1)}%</td>
                      <td className="px-4 py-2">{formatLastActivity(row.last_activity_at)}</td>
                      <td className="px-4 py-2">{row.is_working ? 'Yes' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">{icon}</div>
      </div>
    </div>
  );
}
