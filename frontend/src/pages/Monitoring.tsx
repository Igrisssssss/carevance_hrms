import { useEffect, useState } from 'react';
import { reportApi, screenshotApi } from '@/services/api';
import { Activity, Camera, Search, Users } from 'lucide-react';

const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export default function Monitoring() {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (overrides?: { userId?: number }) => {
    setIsLoading(true);
    try {
      const response = await reportApi.employeeInsights({
        q: query || undefined,
        user_id: overrides?.userId ?? selectedUserId,
        start_date: startDate,
        end_date: endDate,
      });
      setData(response.data);
      if (!selectedUserId && response.data?.selected_user?.id) {
        setSelectedUserId(response.data.selected_user.id);
      }
    } catch (error) {
      console.error('Monitoring load failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const selectedUser = data?.selected_user;
  const stats = data?.stats;
  const screenshots = data?.recent_screenshots || [];
  const activityBreakdown = data?.activity_breakdown || [];

  const handleDeleteScreenshot = async (id: number) => {
    if (!confirm('Delete this screenshot?')) return;
    try {
      await screenshotApi.delete(id);
      setData((prev: any) => ({
        ...prev,
        recent_screenshots: (prev?.recent_screenshots || []).filter((s: any) => s.id !== id),
      }));
    } catch (error) {
      console.error('Delete screenshot failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-gray-500 mt-1">Admin-only employee stats, screenshots, and idle analysis</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Employee Name / Email</label>
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
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
          <button onClick={() => fetchData()} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            Apply
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
        <select
          value={selectedUserId ?? ''}
          onChange={(e) => {
            const nextId = e.target.value ? Number(e.target.value) : undefined;
            setSelectedUserId(nextId);
            fetchData({ userId: nextId });
          }}
          className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {(data?.matched_users || []).map((u: any) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : !selectedUser ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">No employee found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between"><p className="text-sm text-gray-500">Employee</p><Users className="h-5 w-5 text-gray-400" /></div>
              <p className="text-lg font-bold text-gray-900 mt-1">{selectedUser.name}</p>
              <p className="text-xs text-gray-500">{selectedUser.email}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between"><p className="text-sm text-gray-500">Total Worked</p><Activity className="h-5 w-5 text-green-500" /></div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(stats?.total_duration || 0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between"><p className="text-sm text-gray-500">Average Idle</p><Activity className="h-5 w-5 text-amber-500" /></div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(stats?.idle_avg_duration || 0)}s</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between"><p className="text-sm text-gray-500">Screenshots</p><Camera className="h-5 w-5 text-blue-500" /></div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{screenshots.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Activity Breakdown</h2>
              <div className="space-y-2">
                {activityBreakdown.length === 0 ? <p className="text-sm text-gray-500">No activity logs found.</p> : activityBreakdown.map((item: any) => (
                  <div key={item.type} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg">
                    <p className="text-sm text-gray-700 capitalize">{item.type}</p>
                    <p className="text-sm text-gray-900 font-medium">{item.count} events, {formatDuration(item.total_duration || 0)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Recent Screenshots</h2>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-auto">
                {screenshots.length === 0 ? <p className="text-sm text-gray-500 col-span-2">No screenshots found.</p> : screenshots.map((s: any) => (
                  <div key={s.id} className="relative border border-gray-100 rounded-lg overflow-hidden group">
                    <a href={s.path} target="_blank" rel="noreferrer" className="block">
                      <img src={s.path} alt={`Screenshot ${s.id}`} className="w-full h-24 object-cover" />
                    </a>
                    <button
                      onClick={() => handleDeleteScreenshot(s.id)}
                      className="absolute top-1 right-1 px-2 py-1 text-xs bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
