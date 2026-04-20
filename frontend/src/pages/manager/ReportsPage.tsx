import { useState } from 'react';
import AppShell from '../../components/AppShell';
import { exportPDF, exportExcel } from '../../api/analytics';
import { useProjects } from '../../hooks/useProjects';

type ExportState = 'idle' | 'loading' | 'error';

export default function ReportsPage() {
  const { data: projects = [] } = useProjects();
  const [selectedProject, setSelectedProject] = useState('');
  const [pdfState,   setPdfState]   = useState<ExportState>('idle');
  const [excelState, setExcelState] = useState<ExportState>('idle');
  const [errorMsg,   setErrorMsg]   = useState('');

  async function handleExport(format: 'pdf' | 'excel') {
    const setter = format === 'pdf' ? setPdfState : setExcelState;
    setter('loading');
    setErrorMsg('');
    try {
      if (format === 'pdf') {
        if (!selectedProject) {
          setErrorMsg('Select a project to export a PDF report.');
          setPdfState('error');
          return;
        }
        await exportPDF(Number(selectedProject));
      } else {
        await exportExcel(selectedProject ? Number(selectedProject) : undefined);
      }
      setter('idle');
    } catch {
      setter('error');
      setErrorMsg('Export failed. Please try again.');
    }
  }

  const selectCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-colors hover:bg-slate-50';

  return (
    <AppShell title="Reports" breadcrumb="Reports">

      {/* Project selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Project
        </p>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className={selectCls}
        >
          <option value="">All projects (Excel only)</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-2">
          PDF requires a project. Excel works with or without one.
        </p>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm mb-5 max-w-lg">
          {errorMsg}
        </div>
      )}

      {/* Export cards */}
      <div className="grid grid-cols-2 gap-4 max-w-lg">

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">PDF Report</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Single-project profitability summary — budget utilisation, EHR, scope creep, revision counts.
            </p>
          </div>
          <button
            onClick={() => handleExport('pdf')}
            disabled={pdfState === 'loading'}
            className="mt-auto bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfState === 'loading' ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Excel Workbook</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Two sheets: client profitability ranking and full budget data for all or selected projects.
            </p>
          </div>
          <button
            onClick={() => handleExport('excel')}
            disabled={excelState === 'loading'}
            className="mt-auto bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {excelState === 'loading' ? 'Generating…' : 'Download Excel'}
          </button>
        </div>

      </div>
    </AppShell>
  );
}
