import { useMemo, useState } from 'react';
import { FolderKanban, Search } from 'lucide-react';
import { FieldLabel } from '@/components/ui/FormField';
import { InviteOption } from '@/services/addUser';
import { PageEmptyState } from '@/components/ui/PageState';

interface ProjectMultiSelectProps {
  options: InviteOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  isLoading?: boolean;
  errorMessage?: string;
}

export default function ProjectMultiSelect({
  options,
  selectedIds,
  onChange,
  isLoading = false,
  errorMessage,
}: ProjectMultiSelectProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(
    () => options.filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );

  return (
    <div>
      <FieldLabel hint={`${selectedIds.length} selected`}>Projects they can access</FieldLabel>
      <div className="rounded-[24px] border border-slate-200/90 bg-white/90 p-4 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.2)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
          />
        </div>
        {isLoading ? <p className="mt-3 text-sm text-slate-500">Loading available projects...</p> : null}
        {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        {!isLoading && !errorMessage && filteredOptions.length === 0 ? (
          <div className="mt-4">
            <PageEmptyState title="No projects available" description="Project data is connected; assignment remains mock-ready until backend access control is added." />
          </div>
        ) : (
          <div className="mt-4 max-h-52 space-y-2 overflow-auto pr-1">
            {filteredOptions.map((option) => {
              const checked = selectedIds.includes(option.id);

              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[20px] border px-3 py-3 transition ${
                    checked ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200/80 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selectedIds, option.id]
                          : selectedIds.filter((id) => id !== option.id)
                      )
                    }
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-950">{option.name}</p>
                      {option.isDefault ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Projects are loaded from the existing backend. Assignment permissions are staged for future API support.</p>
    </div>
  );
}
