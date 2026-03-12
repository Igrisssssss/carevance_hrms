import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DashboardEmployeeSelectorProps {
  employees: Array<{ id: number; name: string; email: string; role?: string }>;
  value: number | '';
  onChange: (value: number | '') => void;
  disabled?: boolean;
}

export default function DashboardEmployeeSelector({
  employees,
  value,
  onChange,
  disabled = false,
}: DashboardEmployeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedEmployee = employees.find((employee) => employee.id === value) || null;
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) =>
      `${employee.name} ${employee.email}`.toLowerCase().includes(term)
    );
  }, [employees, search]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center justify-between rounded-[20px] border border-slate-200/90 bg-white/85 px-3.5 py-2.5 text-left text-sm text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.25)] outline-none transition duration-300 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-300/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          open && 'border-sky-300 bg-white ring-2 ring-sky-300/25'
        )}
      >
        <span className={cn('truncate', !selectedEmployee && 'text-slate-400')}>
          {selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.email})` : 'Choose employee'}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]">
          <div className="border-b border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee"
                className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-auto py-2" role="listbox">
            {filteredEmployees.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No employee matched the current search.</div>
            ) : (
              filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  role="option"
                  aria-selected={value === employee.id}
                  onClick={() => {
                    onChange(employee.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-sky-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{employee.name}</p>
                    <p className="truncate text-xs text-slate-500">{employee.email}</p>
                  </div>
                  {value === employee.id ? <Check className="h-4 w-4 shrink-0 text-sky-600" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
