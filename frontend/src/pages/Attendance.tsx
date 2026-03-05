import { useEffect, useState } from 'react';
import { reportApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export default function Attendance() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [workingDays, setWorkingDays] = useState(0);
  const [weekendDays, setWeekendDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const response = await reportApi.attendance({
        start_date: startDate,
        end_date: endDate,
        q: isAdmin ? query || undefined : undefined,
      });
      const payload = response.data as any;
      const nextRows = payload?.data || [];
      setRows(nextRows);
      setWorkingDays(Number(payload?.working_days || 0));
      setWeekendDays(Number(payload?.weekend_days || 0));
      if (!selectedUserId && nextRows.length > 0) {
        setSelectedUserId(nextRows[0].user.id);
      }
    } catch (error) {
      console.error('Attendance fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate]);

  const selectedRow = rows.find((row) => row.user.id === selectedUserId) || rows[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 mt-1">{isAdmin ? 'Track attendance for all employees' : 'Your attendance records'}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee Name/Email</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
        <div className="flex items-end">
          <button onClick={fetchAttendance} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Apply</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Working Days (Excl. Weekend)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{workingDays}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Weekend Days</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{weekendDays}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Employees in View</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Present Days</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Leave Days</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Attendance %</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Worked</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>No attendance records</td></tr>
            ) : rows.map((row) => (
              <tr
                key={row.user.id}
                className={`border-b border-gray-100 cursor-pointer ${selectedRow?.user?.id === row.user.id ? 'bg-primary-50' : ''}`}
                onClick={() => setSelectedUserId(row.user.id)}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{row.user.name}</p>
                  <p className="text-xs text-gray-500">{row.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{row.days_present} / {row.working_days_in_range}</td>
                <td className="px-4 py-3 text-gray-700">{row.leave_days}</td>
                <td className="px-4 py-3 text-gray-700">{row.attendance_rate}%</td>
                <td className="px-4 py-3 text-gray-700">{formatDuration(row.worked_seconds)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${row.is_working ? 'text-green-600' : 'text-gray-500'}`}>
                    {row.is_working ? 'Working' : 'Not Working'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">
              {selectedRow.user.name} - Leave Dates (Weekend Excluded)
            </h2>
            <div className="max-h-72 overflow-auto flex flex-wrap gap-2">
              {(selectedRow.leave_dates || []).length === 0 ? (
                <p className="text-sm text-gray-500">No leave dates in selected range.</p>
              ) : (
                selectedRow.leave_dates.map((date: string) => (
                  <span key={date} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
                    {date}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">
              {selectedRow.user.name} - Present Dates
            </h2>
            <div className="max-h-72 overflow-auto flex flex-wrap gap-2">
              {(selectedRow.present_dates || []).length === 0 ? (
                <p className="text-sm text-gray-500">No present dates in selected range.</p>
              ) : (
                selectedRow.present_dates.map((date: string) => (
                  <span key={date} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md border border-green-100">
                    {date}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
