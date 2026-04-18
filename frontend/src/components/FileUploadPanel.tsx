import { useRef, useState } from 'react';
import { useFiles, useUploadFile, useDeleteFile } from '../hooks/useFiles';
import { useAuth } from '../hooks/useAuth';
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

const TYPE_BADGE: Record<FileType, { cls: string; label: string }> = {
  deliverable: {
    cls:   'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    label: 'Deliverable',
  },
  reference: {
    cls:   'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200',
    label: 'Reference',
  },
  brand_guideline: {
    cls:   'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    label: 'Brand Guideline',
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
    <div className="space-y-4">
      {/* Upload controls */}
      <div className="flex justify-end gap-3 mb-4">
        {allowedTypes.length > 1 && (
          <select
            value={fileType}
            onChange={e => setFileType(e.target.value as FileType)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-colors hover:bg-slate-50"
          >
            {allowedTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        )}

        <label className="inline-flex items-center cursor-pointer bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors">
          {uploadFile.isPending ? 'Uploading…' : '+ Upload file'}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadFile.isPending}
          />
        </label>

        {uploadFile.isError && (
          <span className="text-sm text-rose-600">Upload failed.</span>
        )}
      </div>

      {/* File table */}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading files…</p>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center">
          <p className="text-sm text-slate-400">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Filename', 'Type', 'Uploaded by', 'Size', 'Date'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map(f => {
                const badge = TYPE_BADGE[f.file_type];
                // Manager can delete any file.
                // Designer and Client can only delete files they uploaded themselves.
                const canDelete = isManager || f.uploaded_by === Number(user?.user_id);
                return (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors group">

                    <td className="px-4 py-3.5 max-w-[240px]">
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline transition-colors truncate block"
                        title={f.file_name}
                      >
                        {f.file_name}
                      </a>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {f.uploaded_by_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-sm text-slate-900 whitespace-nowrap">
                      {formatBytes(f.file_size)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {fmt(f.uploaded_at)}
                    </td>

                    <td className="px-1 py-3.5 text-left">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(f.id, f.file_name)}
                          className="text-xs font-medium text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}