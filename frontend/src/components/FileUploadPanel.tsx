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
  deliverable:     'bg-info-light text-info',
  reference:       'bg-surface2 text-ink3',
  brand_guideline: 'bg-teal-light text-teal',
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
            className="px-[14px] py-[6px] border border-border-strong rounded bg-surface font-sans text-[13px] text-ink outline-none focus:border-amber transition-colors"
          >
            {allowedTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        )}

        <label className="inline-flex items-center cursor-pointer px-[14px] py-[6px] rounded bg-ink text-white font-sans text-[12px] font-medium border border-ink hover:bg-[#333] transition-colors">
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
          <span className="font-sans text-[12px] text-danger">Upload failed.</span>
        )}
      </div>

      {/* File table */}
      {isLoading ? (
        <p className="font-sans text-[13px] text-ink3">Loading files…</p>
      ) : files.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center">
          <p className="font-sans text-[13px] text-ink3">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface2 border-b border-border">
                {['Filename', 'Type', 'Uploaded by', 'Size', 'Date'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink3"
                  >
                    {h}
                  </th>
                ))}
                {/* Download + optional delete */}
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr
                  key={f.id}
                  className="border-b border-border last:border-b-0 hover:bg-bg transition-colors"
                >
                  <td className="px-4 py-[13px] font-sans text-[13px] text-ink max-w-[240px] truncate">
                    {f.file_name}
                  </td>
                  <td className="px-4 py-[13px]">
                    <span className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold ${TYPE_BADGE[f.file_type]}`}>
                      {f.file_type}
                    </span>
                  </td>
                  <td className="px-4 py-[13px] font-sans text-[13px] text-ink2">
                    {f.uploaded_by_name}
                  </td>
                  <td className="px-4 py-[13px] font-mono text-[13px] text-ink whitespace-nowrap">
                    {formatBytes(f.file_size)}
                  </td>
                  <td className="px-4 py-[13px] font-sans text-[13px] text-ink2 whitespace-nowrap">
                    {fmt(f.uploaded_at)}
                  </td>
                  <td className="px-4 py-[13px]">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-[13px] text-amber hover:text-amber-dark transition-colors whitespace-nowrap"
                      >
                        ↓ Download
                      </a>
                      {isManager && (
                        <button
                          onClick={() => deleteFile.mutate(f.id)}
                          className="font-sans text-[11px] text-danger/60 hover:text-danger transition-colors"
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