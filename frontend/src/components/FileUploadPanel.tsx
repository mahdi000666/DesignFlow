import { useRef, useState } from 'react';
import { useFiles, useUploadFile, useDeleteFile } from '../hooks/useFiles';
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

const TYPE_BADGE: Record<FileType, string> = {
  deliverable:     'bg-blue-50 text-blue-700',
  reference:       'bg-slate-100 text-slate-600',
  brand_guideline: 'bg-teal-50 text-teal-700',
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
  const { data: files = [], isLoading } = useFiles(projectId);
  const uploadFile  = useUploadFile(projectId);
  const deleteFile  = useDeleteFile(projectId);

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

  return (
    <div className="space-y-4">
      {/* Upload controls */}
      <div className="flex items-center gap-3">
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
                {/* Download + optional delete */}
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map(f => (
                <tr
                  key={f.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm text-slate-900 max-w-[240px] truncate">
                    {f.file_name}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TYPE_BADGE[f.file_type]}`}>
                      {f.file_type}
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
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-700 hover:text-blue-800 transition-colors whitespace-nowrap font-medium"
                      >
                        ↓ Download
                      </a>
                      {isManager && (
                        <button
                          onClick={() => deleteFile.mutate(f.id)}
                          className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}