import { useEffect, useRef, useState } from 'react';
import { useFiles, useUploadFile, useDeleteFile } from '../hooks/useFiles';
import { useAuth } from '../hooks/useAuth';
import { SectionCard, EmptyState, DataTable } from './Ui';
import type { FileType } from '../types/file';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALLOWED_TYPES: Record<string, { value: FileType; label: string }[]> = {
  Manager:  [
    { value: 'deliverable',     label: 'Deliverable'     },
    { value: 'reference',       label: 'Reference'       },
    { value: 'brand_guideline', label: 'Brand Guideline' },
  ],
  Designer: [{ value: 'deliverable', label: 'Deliverable' }],
  Client:   [
    { value: 'reference',       label: 'Reference'       },
    { value: 'brand_guideline', label: 'Brand Guideline' },
  ],
};

const TYPE_BADGE: Record<FileType, { cls: string; label: string; dot: string }> = {
  deliverable: {
    cls:   'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    label: 'Deliverable',
    dot:   'bg-sky-400',
  },
  reference: {
    cls:   'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200',
    label: 'Reference',
    dot:   'bg-zinc-400',
  },
  brand_guideline: {
    cls:   'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    label: 'Brand Guideline',
    dot:   'bg-violet-400',
  },
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  projectId: number;
  role:      string;
  isManager: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FileUploadPanel({ projectId, role, isManager }: Props) {
  const { user }                        = useAuth();
  const { data: files = [], isLoading } = useFiles(projectId);
  const uploadFile                      = useUploadFile(projectId);
  const deleteFile                      = useDeleteFile(projectId);

  const allowedTypes = ALLOWED_TYPES[role] ?? ALLOWED_TYPES['Manager'];
  const [fileType, setFileType] = useState<FileType>(allowedTypes[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate({ fileType, file }, {
      onSettled: () => { if (inputRef.current) inputRef.current.value = ''; },
    });
  };

  const handleDelete = (id: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    deleteFile.mutate(id);
  };

  return (
    <SectionCard title={<span className="opacity-0">Files</span>}
      action={
        <div className="flex items-center gap-3">
          {/* File-type pill selector */}
          <div className="relative" ref={typeRef}>
            <button
              type="button"
              onClick={() => setTypeOpen(v => !v)}
              className="flex items-center gap-2 pl-3 pr-3 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm h-9"
            >
              <span className={`w-2 h-2 rounded-full ${TYPE_BADGE[fileType].dot}`} />
              <span className="text-xs">{TYPE_BADGE[fileType].label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 transition-transform ${typeOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {typeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20 overflow-hidden">
                {allowedTypes.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setFileType(t.value); setTypeOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${fileType === t.value ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${TYPE_BADGE[t.value].dot}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload button */}
          <label className="inline-flex items-center justify-center cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors shadow-sm whitespace-nowrap h-9">
            {uploadFile.isPending ? 'Uploading…' : '+ Upload file'}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadFile.isPending}
            />
          </label>
        </div>
      }
    >
      {uploadFile.isError && (
        <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">
          Upload failed. Please try again.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading files…</p>
      ) : files.length === 0 ? (
        <EmptyState
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
          }
          message="No files uploaded yet. Upload your first deliverable or reference."
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              {['Filename', 'Type', 'Uploaded by', 'Size', 'Date'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {h}
                </th>
              ))}
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map(f => {
              const badge = TYPE_BADGE[f.file_type];
              const canDelete = isManager || f.uploaded_by === Number(user?.user_id);
              return (
                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors group">

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`file-dot ${badge.dot}`} />
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary hover:text-primary-700 hover:underline transition-colors truncate block max-w-[240px]"
                        title={f.file_name}
                      >
                        {f.file_name}
                      </a>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-sm font-medium text-slate-700">
                    {f.uploaded_by_name}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap font-medium">
                    {formatBytes(f.file_size)}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap font-medium">
                    {fmt(f.uploaded_at)}
                  </td>

                  <td className="px-5 py-3.5 text-left">
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(f.id, f.file_name)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </SectionCard>
  );
}