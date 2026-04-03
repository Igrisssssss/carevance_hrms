import EmployeeSelect from '@/components/ui/EmployeeSelect';

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
  return <EmployeeSelect employees={employees} value={value} onChange={onChange} disabled={disabled} />;
}
