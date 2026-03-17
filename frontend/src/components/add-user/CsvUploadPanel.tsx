import { UploadCloud } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CsvUploadPanelProps {
  file: File | null;
  summary?: { parsedCount: number; successCount: number; errorCount: number } | null;
  errorMessage?: string | null;
  onSelectFile: (file: File | null) => void;
  onDownloadTemplate: () => void;
}

export default function CsvUploadPanel({
  file,
  summary,
  errorMessage,
  onSelectFile,
  onDownloadTemplate,
}: CsvUploadPanelProps) {
  return (
    <div className="space-y-4">
      <label className="block cursor-pointer rounded-[28px] border border-dashed border-slate-300 bg-white/85 p-8 text-center transition hover:border-sky-300 hover:bg-sky-50/30">
        <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-950">{file ? file.name : 'Drag and drop a CSV file or click to browse'}</p>
        <p className="mt-1 text-sm text-slate-500">Expected columns: email, name, role, groups, projects</p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => onSelectFile(event.target.files?.[0] || null)}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onDownloadTemplate}>Download CSV Template</Button>
        {file ? <Button variant="ghost" onClick={() => onSelectFile(null)}>Clear File</Button> : null}
      </div>

      {errorMessage ? (
        <div className="rounded-[22px] border border-rose-200/80 bg-rose-50/85 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
      ) : null}

      {summary ? (
        <div className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-700">
          Parsed {summary.parsedCount} row{summary.parsedCount === 1 ? '' : 's'}, added {summary.successCount}, errors {summary.errorCount}.
        </div>
      ) : (
        <p className="text-xs text-slate-500">If project IDs are listed in CSV, they are stored for future provisioning while project-access automation remains pending.</p>
      )}
    </div>
  );
}
