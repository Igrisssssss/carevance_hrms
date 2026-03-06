import { useEffect, useMemo, useState } from 'react';
import { attendanceApi, attendanceTimeEditApi, leaveApi, reportApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatMonth = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const parseTimeToMinutes = (time: string) => {
  // expected "HH:mm:ss" (from backend env ATTENDANCE_LATE_AFTER)
  const [hh, mm] = time.split(':').map((v) => Number(v));
  const h = Number.isFinite(hh) ? hh : 0;
  const m = Number.isFinite(mm) ? mm : 0;
  return h * 60 + m;
};

const getDateOnly = (iso?: string | null) => (iso ? iso.split('T')[0] : null);

const buildMonthGrid = (month: string) => {
  // month: YYYY-MM
  const [y, m] = month.split('-').map((v) => Number(v));
  const first = new Date(y, (m || 1) - 1, 1);
  const start = new Date(first);
  // Monday-based grid
  const day = start.getDay(); // 0 Sun ... 6 Sat
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);

  const weeks: Date[][] = [];
  const cursor = new Date(start);

  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return { first, weeks };
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

  const [todayRecord, setTodayRecord] = useState<null | {
    id: number;
    attendance_date: string;
    check_in_at?: string | null;
    check_out_at?: string | null;
    worked_seconds: number;
    manual_adjustment_seconds: number;
    late_minutes: number;
    status: string;
    is_checked_in: boolean;
    total_break_seconds: number;
    shift_target_seconds: number;
    remaining_shift_seconds: number;
    completed_shift: boolean;
    punches: Array<{
      id: number;
      punch_in_at: string;
      punch_out_at?: string | null;
      worked_seconds: number;
    }>;
  }>(null);
  const [hasApprovedLeaveToday, setHasApprovedLeaveToday] = useState(false);
  const [lateAfter, setLateAfter] = useState('09:30:00');
  const [isPunchLoading, setIsPunchLoading] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(formatMonth(new Date()));
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [calendarSummary, setCalendarSummary] = useState<any | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);
  const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [timeEditRequests, setTimeEditRequests] = useState<any[]>([]);
  const [isTimeEditLoading, setIsTimeEditLoading] = useState(false);
  const [isTimeEditSubmitting, setIsTimeEditSubmitting] = useState(false);
  const [timeEditDate, setTimeEditDate] = useState(new Date().toISOString().split('T')[0]);
  const [extraMinutes, setExtraMinutes] = useState(60);
  const [timeEditMessage, setTimeEditMessage] = useState('');

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

  const fetchToday = async () => {
    try {
      const res = await attendanceApi.today();
      setTodayRecord(res.data.record);
      setLateAfter(res.data.late_after || '09:30:00');
      setHasApprovedLeaveToday(Boolean((res.data as any).has_approved_leave_today));
    } catch (e) {
      console.error('Attendance today fetch failed:', e);
    }
  };

  const doCheckIn = async () => {
    setIsPunchLoading(true);
    try {
      const res = await attendanceApi.checkIn();
      const payload = res.data as any;
      if (payload?.record) setTodayRecord(payload.record);
      await Promise.all([fetchAttendance(), fetchCalendar(), fetchToday()]);
    } catch (e) {
      console.error('Check-in failed:', e);
      alert((e as any)?.response?.data?.message || 'Check-in failed');
    } finally {
      setIsPunchLoading(false);
    }
  };

  const doCheckOut = async () => {
    setIsPunchLoading(true);
    try {
      const res = await attendanceApi.checkOut();
      const payload = res.data as any;
      if (payload?.record) setTodayRecord(payload.record);
      await Promise.all([fetchAttendance(), fetchCalendar(), fetchToday()]);
    } catch (e) {
      console.error('Check-out failed:', e);
      alert((e as any)?.response?.data?.message || 'Check-out failed');
    } finally {
      setIsPunchLoading(false);
    }
  };

  const fetchCalendar = async () => {
    setIsCalendarLoading(true);
    try {
      const res = await attendanceApi.calendar({
        month: calendarMonth,
        user_id: isAdmin ? selectedUserId || undefined : undefined,
      });

      setCalendarDays(res.data.days || []);
      setCalendarSummary(res.data.summary || null);
    } catch (e) {
      console.error('Attendance calendar fetch failed:', e);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    setIsLeaveLoading(true);
    try {
      const res = await leaveApi.list();
      setLeaveRequests((res.data as any).data || []);
    } catch (e) {
      console.error('Leave requests fetch failed:', e);
    } finally {
      setIsLeaveLoading(false);
    }
  };

  const submitLeaveRequest = async () => {
    if (!leaveStartDate || !leaveEndDate) {
      alert('Please select start and end date');
      return;
    }

    setIsLeaveSubmitting(true);
    try {
      await leaveApi.create({
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason || undefined,
      });
      setLeaveReason('');
      await fetchLeaveRequests();
      alert('Leave request submitted');
    } catch (e) {
      console.error('Leave request submit failed:', e);
      alert((e as any)?.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setIsLeaveSubmitting(false);
    }
  };

  const approveLeave = async (id: number) => {
    try {
      await leaveApi.approve(id);
      await Promise.all([fetchLeaveRequests(), fetchAttendance(), fetchCalendar(), fetchToday()]);
    } catch (e) {
      console.error('Approve leave failed:', e);
      alert((e as any)?.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const rejectLeave = async (id: number) => {
    try {
      await leaveApi.reject(id);
      await fetchLeaveRequests();
    } catch (e) {
      console.error('Reject leave failed:', e);
      alert((e as any)?.response?.data?.message || 'Failed to reject leave request');
    }
  };

  const fetchTimeEditRequests = async () => {
    setIsTimeEditLoading(true);
    try {
      const res = await attendanceTimeEditApi.list();
      setTimeEditRequests((res.data as any).data || []);
    } catch (e) {
      console.error('Time edit requests fetch failed:', e);
    } finally {
      setIsTimeEditLoading(false);
    }
  };

  const submitTimeEditRequest = async () => {
    if (!timeEditDate || !extraMinutes || extraMinutes <= 0) {
      alert('Please enter a valid date and extra minutes');
      return;
    }

    setIsTimeEditSubmitting(true);
    try {
      await attendanceTimeEditApi.create({
        attendance_date: timeEditDate,
        extra_minutes: extraMinutes,
        message: timeEditMessage || undefined,
      });
      setTimeEditMessage('');
      await fetchTimeEditRequests();
      alert('Time edit request submitted');
    } catch (e) {
      console.error('Time edit request submit failed:', e);
      alert((e as any)?.response?.data?.message || 'Failed to submit time edit request');
    } finally {
      setIsTimeEditSubmitting(false);
    }
  };

  const approveTimeEdit = async (id: number) => {
    try {
      await attendanceTimeEditApi.approve(id);
      await Promise.all([fetchTimeEditRequests(), fetchAttendance(), fetchCalendar(), fetchToday()]);
    } catch (e) {
      console.error('Approve time edit failed:', e);
      alert((e as any)?.response?.data?.message || 'Failed to approve time edit request');
    }
  };

  const rejectTimeEdit = async (id: number) => {
    try {
      await attendanceTimeEditApi.reject(id);
      await fetchTimeEditRequests();
    } catch (e) {
      console.error('Reject time edit failed:', e);
      alert((e as any)?.response?.data?.message || 'Failed to reject time edit request');
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchToday();
    fetchLeaveRequests();
    fetchTimeEditRequests();
  }, []);

  useEffect(() => {
    if (selectedUserId || !isAdmin) {
      fetchCalendar();
    }
  }, [calendarMonth, selectedUserId]);

  const selectedRow = rows.find((row) => row.user.id === selectedUserId) || rows[0];
  const pendingLeaveRequests = useMemo(
    () => leaveRequests.filter((item) => item.status === 'pending'),
    [leaveRequests]
  );
  const pendingTimeEditRequests = useMemo(
    () => timeEditRequests.filter((item) => item.status === 'pending'),
    [timeEditRequests]
  );

  const lateLabel = useMemo(() => {
    if (!todayRecord?.check_in_at) return null;
    const checkIn = new Date(todayRecord.check_in_at);
    const mins = checkIn.getHours() * 60 + checkIn.getMinutes();
    const lateMins = Math.max(0, mins - parseTimeToMinutes(lateAfter));
    if (lateMins <= 0) return null;
    return `${lateMins} min late`;
  }, [todayRecord?.check_in_at, lateAfter]);

  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);
  const calendarMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of calendarDays) map.set(d.date, d);
    return map;
  }, [calendarDays]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Today</p>
              <p className="text-xs text-gray-500">
                {todayRecord?.attendance_date || new Date().toISOString().split('T')[0]}
                {lateLabel ? <span className="ml-2 text-red-600 font-medium">({lateLabel})</span> : null}
              </p>
              {hasApprovedLeaveToday ? (
                <p className="text-xs text-red-600 mt-1">Approved leave for today. Punch-in is disabled.</p>
              ) : null}
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">First Punch In</p>
                  <p className="text-sm font-semibold text-gray-900">{todayRecord?.check_in_at ? new Date(todayRecord.check_in_at).toLocaleTimeString() : '--'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Last Punch Out</p>
                  <p className="text-sm font-semibold text-gray-900">{todayRecord?.check_out_at ? new Date(todayRecord.check_out_at).toLocaleTimeString() : '--'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Working Hours</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDuration(todayRecord?.worked_seconds || 0)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Approved Extra Time</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDuration(todayRecord?.manual_adjustment_seconds || 0)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Break Time</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDuration(todayRecord?.total_break_seconds || 0)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Remaining Shift</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDuration(todayRecord?.remaining_shift_seconds || 0)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Shift Target</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDuration(todayRecord?.shift_target_seconds || 8 * 3600)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={doCheckIn}
                disabled={isPunchLoading || !!todayRecord?.is_checked_in || hasApprovedLeaveToday}
                className="px-4 py-2 rounded-lg text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
              >
                Punch In
              </button>
              <button
                onClick={doCheckOut}
                disabled={isPunchLoading || !todayRecord?.is_checked_in}
                className="px-4 py-2 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                Punch Out
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Late threshold: {lateAfter}
          </p>
          {todayRecord?.punches?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {todayRecord.punches.map((punch) => (
                <span key={punch.id} className="text-xs px-2 py-1 border border-gray-200 rounded-md text-gray-700 bg-gray-50">
                  {new Date(punch.punch_in_at).toLocaleTimeString()} - {punch.punch_out_at ? new Date(punch.punch_out_at).toLocaleTimeString() : 'Active'}
                </span>
              ))}
            </div>
          ) : null}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Attendance Calendar</h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const [y, m] = calendarMonth.split('-').map((v) => Number(v));
                  const d = new Date(y, (m || 1) - 2, 1);
                  setCalendarMonth(formatMonth(d));
                }}
                className="px-3 py-2 rounded-lg text-sm border border-gray-300 bg-white hover:bg-gray-50"
              >
                Prev
              </button>
              <input
                type="month"
                value={calendarMonth}
                onChange={(e) => setCalendarMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  const [y, m] = calendarMonth.split('-').map((v) => Number(v));
                  const d = new Date(y, (m || 1), 1);
                  setCalendarMonth(formatMonth(d));
                }}
                className="px-3 py-2 rounded-lg text-sm border border-gray-300 bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>

          {isCalendarLoading ? (
            <div className="py-10 text-sm text-gray-500">Loading calendar...</div>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-7 text-xs text-gray-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="px-2 py-2 font-medium">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthGrid.weeks.flat().map((d) => {
                  const ds = d.toISOString().split('T')[0];
                  const inMonth = ds.startsWith(calendarMonth);
                  const item = calendarMap.get(ds);
                  const status = item?.status || (d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : 'absent');

                  const color =
                    status === 'present'
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : status === 'checked_in'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : status === 'weekend'
                          ? 'bg-gray-50 border-gray-200 text-gray-700'
                          : 'bg-red-50 border-red-200 text-red-900';

                  return (
                    <div
                      key={ds}
                      className={`min-h-[68px] rounded-lg border px-2 py-2 ${color} ${inMonth ? '' : 'opacity-40'}`}
                      title={
                        item
                          ? `${item.date} • ${status} • worked ${formatDuration(item.worked_seconds)} • late ${item.late_minutes}m`
                          : ds
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-semibold">{d.getDate()}</div>
                        {item?.late_minutes > 0 ? <div className="text-[10px] font-semibold text-red-700">Late</div> : null}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide">{status.replace('_', ' ')}</div>
                      {item?.worked_seconds ? (
                        <div className="mt-1 text-[11px] font-medium">{formatDuration(item.worked_seconds)}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Monthly Summary</h2>
          {calendarSummary ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Present Days</span>
                <span className="font-semibold text-gray-900">{calendarSummary.present_days}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Absent Days</span>
                <span className="font-semibold text-gray-900">{calendarSummary.absent_days}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Weekend Days</span>
                <span className="font-semibold text-gray-900">{calendarSummary.weekend_days}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Late Days</span>
                <span className="font-semibold text-gray-900">{calendarSummary.late_days}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="text-gray-600">Total Worked</span>
                <span className="font-semibold text-gray-900">{formatDuration(calendarSummary.total_worked_seconds)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No summary available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Request Leave</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason (Optional)</label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Leave reason..."
            />
          </div>
          <div className="mt-3">
            <button
              onClick={submitLeaveRequest}
              disabled={isLeaveSubmitting}
              className="px-4 py-2 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isLeaveSubmitting ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Leave Requests</h2>
            <button onClick={fetchLeaveRequests} className="text-sm text-primary-700 hover:underline">Refresh</button>
          </div>
          {isLeaveLoading ? (
            <p className="text-sm text-gray-500 mt-3">Loading...</p>
          ) : leaveRequests.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">No leave requests found.</p>
          ) : (
            <div className="mt-3 space-y-2 max-h-72 overflow-auto">
              {leaveRequests.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {item.user?.name || 'You'}: {item.start_date} to {item.end_date}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.reason ? <p className="text-xs text-gray-600 mt-1">{item.reason}</p> : null}
                  {isAdmin && item.status === 'pending' ? (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => approveLeave(item.id)} className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700">Approve</button>
                      <button onClick={() => rejectLeave(item.id)} className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700">Reject</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {isAdmin && pendingLeaveRequests.length > 0 ? (
            <p className="text-xs text-gray-500 mt-2">Pending approvals: {pendingLeaveRequests.length}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Request Time Edit / Overtime</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Attendance Date</label>
              <input type="date" value={timeEditDate} onChange={(e) => setTimeEditDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Extra Minutes</label>
              <input
                type="number"
                min={1}
                max={600}
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Message to Admin</label>
            <textarea
              value={timeEditMessage}
              onChange={(e) => setTimeEditMessage(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Example: I worked 1 hour extra after shift due to release deployment."
            />
          </div>
          <div className="mt-3">
            <button
              onClick={submitTimeEditRequest}
              disabled={isTimeEditSubmitting}
              className="px-4 py-2 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isTimeEditSubmitting ? 'Submitting...' : 'Submit Time Edit Request'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Time Edit Requests</h2>
            <button onClick={fetchTimeEditRequests} className="text-sm text-primary-700 hover:underline">Refresh</button>
          </div>
          {isTimeEditLoading ? (
            <p className="text-sm text-gray-500 mt-3">Loading...</p>
          ) : timeEditRequests.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">No time edit requests found.</p>
          ) : (
            <div className="mt-3 space-y-2 max-h-72 overflow-auto">
              {timeEditRequests.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {item.user?.name || 'You'}: {item.attendance_date} (+{formatDuration(item.extra_seconds)})
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.message ? <p className="text-xs text-gray-600 mt-1">{item.message}</p> : null}
                  {isAdmin && item.status === 'pending' ? (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => approveTimeEdit(item.id)} className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700">Approve</button>
                      <button onClick={() => rejectTimeEdit(item.id)} className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700">Reject</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {isAdmin && pendingTimeEditRequests.length > 0 ? (
            <p className="text-xs text-gray-500 mt-2">Pending approvals: {pendingTimeEditRequests.length}</p>
          ) : null}
        </div>
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
