import { useState, useEffect } from 'react';
import { reportApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Download, Calendar, Clock, TrendingUp, Users } from 'lucide-react';

export default function Reports() {
  const { user } = useAuth();
  const reportScope: 'self' | 'organization' = (user?.role === 'admin' || user?.role === 'manager') ? 'organization' : 'self';
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [overallData, setOverallData] = useState<any>(null);

  useEffect(() => { fetchReport(); }, [reportType, startDate, endDate]);
  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { fetchOverall(); }, [startDate, endDate, selectedUserIds]);

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAll({ period: 'all' });
      setAllUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate, scope: reportScope };
      let response;
      switch (reportType) {
        case 'weekly': response = await reportApi.weekly(params); break;
        case 'monthly': response = await reportApi.monthly(params); break;
        default: response = await reportApi.daily({ date: startDate, scope: reportScope });
      }
      setReportData(response.data);
    } catch (error) { console.error('Error:', error); }
    finally { setIsLoading(false); }
  };

  const fetchOverall = async () => {
    try {
      const params: any = { start_date: startDate, end_date: endDate };
      if (selectedUserIds.length > 0) params.user_ids = selectedUserIds;
      const response = await reportApi.overall(params);
      setOverallData(response.data);
    } catch (error) {
      console.error('Error loading overall report:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportApi.export({ start_date: startDate, end_date: endDate });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportType}-${startDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) { console.error('Error:', error); }
  };

  const formatDuration = (seconds: number) => {
    const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const pieSegments = (() => {
    const summary = overallData?.summary || {};
    const total = Number(summary.total_duration || 0);
    if (total <= 0) return [];
    const billable = Number(summary.billable_duration || 0);
    const nonBillable = Number(summary.non_billable_duration || 0);
    const idle = Number(summary.idle_duration || 0);
    const data = [
      { label: 'Billable', value: billable, color: '#10B981' },
      { label: 'Non-Billable', value: nonBillable, color: '#F59E0B' },
      { label: 'Idle', value: idle, color: '#EF4444' },
    ].filter((i) => i.value > 0);
    let acc = 0;
    return data.map((item) => {
      const pct = item.value / data.reduce((s, x) => s + x.value, 0);
      const start = acc;
      acc += pct;
      return { ...item, start, pct };
    });
  })();

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const piePath = (startFraction: number, fraction: number) => {
    const startAngle = startFraction * 360;
    const endAngle = (startFraction + fraction) * 360;
    const start = polarToCartesian(50, 50, 40, endAngle);
    const end = polarToCartesian(50, 50, 40, startAngle);
    const largeArcFlag = fraction > 0.5 ? 1 : 0;
    return `M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Reports</h1><p className="text-gray-500 mt-1">Analyze your time data</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Download className="h-5 w-5" />Export</button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {['daily', 'weekly', 'monthly'].map(type => <button key={type} onClick={() => setReportType(type)} className={`px-4 py-2 rounded-lg text-sm font-medium ${reportType === type ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <span className="text-gray-500">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
        </div>
      </div>

      {isLoading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Time</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(reportData?.total_time || 0)}</p></div><div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center"><Clock className="h-5 w-5 text-primary-600" /></div></div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Billable Time</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(reportData?.billable_time || 0)}</p></div><div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div></div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Entries</p><p className="text-2xl font-bold text-gray-900 mt-1">{reportData?.by_user?.reduce((acc: number, u: any) => acc + (u.entries?.length || 0), 0) || 0}</p></div><div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-blue-600" /></div></div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Productivity</p><p className="text-2xl font-bold text-gray-900 mt-1">87%</p></div><div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-purple-600" /></div></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Overall Team Report</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Employees</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-36 overflow-auto">
                {allUsers.map((u) => {
                  const checked = selectedUserIds.includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedUserIds((prev) =>
                            e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                          );
                        }}
                      />
                      {u.name} ({u.email})
                    </label>
                  );
                })}
              </div>
              <button onClick={() => setSelectedUserIds([])} className="mt-2 text-xs text-primary-600">Clear selection (all users)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Users</p><p className="text-xl font-bold">{overallData?.summary?.users_count || 0}</p></div>
              <div className="border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Active Users</p><p className="text-xl font-bold">{overallData?.summary?.active_users || 0}</p></div>
              <div className="border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Total Work</p><p className="text-xl font-bold">{formatDuration(overallData?.summary?.total_duration || 0)}</p></div>
              <div className="border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-500">Total Idle</p><p className="text-xl font-bold">{formatDuration(overallData?.summary?.idle_duration || 0)}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2">Bar Graph - Work by Employee</h3>
                <div className="space-y-2">
                  {(overallData?.by_user || []).map((row: any) => {
                    const max = Math.max(...(overallData?.by_user || []).map((r: any) => Number(r.total_duration || 0)), 1);
                    const widthPct = Math.max(3, Math.round((Number(row.total_duration || 0) / max) * 100));
                    return (
                      <div key={row.user.id}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{row.user.name}</span>
                          <span>{formatDuration(row.total_duration || 0)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded">
                          <div className="h-2 bg-primary-600 rounded" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2">Pie Chart - Billable / Non-Billable / Idle</h3>
                <div className="flex items-center gap-4">
                  <svg viewBox="0 0 100 100" className="h-40 w-40">
                    {pieSegments.length === 0 ? (
                      <circle cx="50" cy="50" r="40" fill="#E5E7EB" />
                    ) : pieSegments.map((segment: any) => (
                      <path key={segment.label} d={piePath(segment.start, segment.pct)} fill={segment.color} />
                    ))}
                  </svg>
                  <div className="space-y-2 text-sm">
                    {pieSegments.map((segment: any) => (
                      <div key={segment.label} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                        <span>{segment.label}: {formatDuration(segment.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">Full Working Details</div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2">Employee</th>
                    <th className="text-left px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Billable</th>
                    <th className="text-left px-3 py-2">Idle Avg</th>
                    <th className="text-left px-3 py-2">Working Now</th>
                  </tr>
                </thead>
                <tbody>
                  {(overallData?.by_user || []).map((row: any) => (
                    <tr key={row.user.id} className="border-b border-gray-100">
                      <td className="px-3 py-2">{row.user.name}</td>
                      <td className="px-3 py-2">{formatDuration(row.total_duration || 0)}</td>
                      <td className="px-3 py-2">{formatDuration(row.billable_duration || 0)}</td>
                      <td className="px-3 py-2">{Math.round((row.idle_duration || 0) / Math.max(1, row.entries_count || 1))}s</td>
                      <td className="px-3 py-2">{row.is_working ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Time by Project</h2></div>
            <div className="p-5">
              {reportData?.by_project?.length > 0 ? reportData.by_project.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.project?.color || '#6B7280' }} /><span className="font-medium text-gray-900">{item.project?.name || 'No Project'}</span></div>
                  <span className="text-gray-600">{formatDuration(item.total_time)}</span>
                </div>
              )) : <p className="text-gray-500 text-center py-4">No data available</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Time by User</h2></div>
            <div className="p-5">
              {reportData?.by_user?.length > 0 ? reportData.by_user.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">{item.user?.name?.charAt(0)}</div><span className="font-medium text-gray-900">{item.user?.name}</span></div>
                  <span className="text-gray-600">{formatDuration(item.total_time)}</span>
                </div>
              )) : <p className="text-gray-500 text-center py-4">No data available</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
