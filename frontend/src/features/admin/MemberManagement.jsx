import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import { usePopup } from '../../components/PopupModal.jsx';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';

export default function MemberManagement() {
  const { showConfirm, showError } = usePopup();
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);

  // Form Fields
  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [actionError, setActionError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // { validMembers, duplicates }
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMembers();
  }, [search]);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await api.get(`/api/members?search=${encodeURIComponent(search)}`);
      setMembers(data.members || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMember(e) {
    e.preventDefault();
    setActionError('');
    try {
      if (editMember) {
        await api.put(`/api/members/${editMember.id}`, { memberCode, fullName, isActive });
      } else {
        await api.post('/api/members', { memberCode, fullName, isActive });
      }
      setIsAddOpen(false);
      setEditMember(null);
      setMemberCode('');
      setFullName('');
      loadMembers();
    } catch (err) {
      setActionError(err.message || 'Operation failed');
    }
  }

  async function handleDeleteMember(m) {
    let confirmed = false;
    if (showConfirm) {
      confirmed = await showConfirm(
        `Are you sure you want to permanently delete member "${m.full_name}" (${m.member_code})? Any historical nomination and ballot links will be permanently removed.`,
        {
          title: 'Delete Member',
          confirmText: 'Delete Permanently',
          cancelText: 'Keep Member',
        }
      );
    } else {
      confirmed = window.confirm(`Permanently delete member "${m.full_name}" (${m.member_code})?`);
    }

    if (!confirmed) return;

    try {
      await api.delete(`/api/members/${m.id}`);
      if (isAddOpen && editMember?.id === m.id) {
        setIsAddOpen(false);
        setEditMember(null);
      }
      loadMembers();
    } catch (err) {
      if (showError) showError(err.message || 'Failed to delete member');
      else alert(err.message || 'Failed to delete member');
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionError('');
    setImportResult(null);
    setPendingImport(null);
    setUploadingExcel(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rows || rows.length === 0) {
        throw new Error('Excel sheet is completely empty');
      }

      // Check header or parse rows
      let startIndex = 0;
      const firstRowStr = (rows[0] || []).join(' ').toLowerCase();
      if (firstRowStr.includes('code') || firstRowStr.includes('name')) {
        startIndex = 1;
      }

      const fileRows = [];
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const codeVal = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';
        const nameVal = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';

        if (codeVal && nameVal) {
          fileRows.push({ memberCode: codeVal, fullName: nameVal, rowNum: i + 1 });
        }
      }

      if (fileRows.length === 0) {
        throw new Error('No valid member records found. Please ensure Column A is Member Code and Column B is Name.');
      }

      // Fetch all existing members from DB to compare duplicates
      const existingData = await api.get('/api/members/all-codes-and-names');
      const existingCodes = new Set((existingData.members || []).map(m => m.member_code.toUpperCase()));
      const existingNames = new Set((existingData.members || []).map(m => m.full_name.trim().toLowerCase()));

      const duplicates = [];
      const validMembers = [];
      const seenInFileCodes = new Set();

      for (const item of fileRows) {
        const codeUpper = item.memberCode.toUpperCase();
        const nameLower = item.fullName.trim().toLowerCase();

        let dupReason = '';
        if (existingCodes.has(codeUpper)) {
          dupReason = `Member code "${item.memberCode}" already exists in directory`;
        } else if (existingNames.has(nameLower)) {
          dupReason = `Member name "${item.fullName}" already exists in directory`;
        } else if (seenInFileCodes.has(codeUpper)) {
          dupReason = `Duplicate member code "${item.memberCode}" repeated inside this Excel file`;
        }

        if (dupReason) {
          duplicates.push({ ...item, reason: dupReason });
        } else {
          validMembers.push({ memberCode: item.memberCode, fullName: item.fullName });
          seenInFileCodes.add(codeUpper);
        }
      }

      setPendingImport({
        totalInFile: fileRows.length,
        validMembers,
        duplicates,
      });
    } catch (err) {
      setActionError(err.message || 'Failed to process Excel file');
    } finally {
      setUploadingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport || pendingImport.validMembers.length === 0) return;
    setUploadingExcel(true);
    setActionError('');
    try {
      const res = await api.post('/api/members/import-csv', { members: pendingImport.validMembers });
      setImportResult(res);
      setPendingImport(null);
      loadMembers();
    } catch (err) {
      setActionError(err.message || 'Import failed');
    } finally {
      setUploadingExcel(false);
    }
  }

  async function openAddModal() {
    setEditMember(null);
    setFullName('');
    setIsActive(true);
    setActionError('');
    try {
      const res = await api.get('/api/members/next-code');
      setMemberCode(res.nextCode || 'MEM-001');
    } catch {
      setMemberCode('MEM-001');
    }
    setIsAddOpen(true);
  }

  function openEdit(m) {
    setEditMember(m);
    setMemberCode(m.member_code);
    setFullName(m.full_name);
    setIsActive(m.is_active);
    setActionError('');
    setIsAddOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">Member Directory</h2>
          <p className="text-xs text-brand-secondary mt-0.5">
            Registered event attendees eligible for candidate nominations and ballots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Member
          </button>
          <button
            onClick={() => {
              setPendingImport(null);
              setImportResult(null);
              setActionError('');
              setIsImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-border hover:bg-white text-brand-charcoal text-xs font-medium transition-all"
          >
            <Upload className="w-4 h-4 text-brand-secondary" /> Upload Excel
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-brand-secondary absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or member code..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-brand-border bg-white text-xs focus:outline-none focus:border-brand-red transition-colors"
        />
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-canvas border-b border-brand-border text-brand-secondary uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3.5 px-6">Member Code</th>
                <th className="py-3.5 px-6">Full Name</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-brand-secondary">
                    Loading directory...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-brand-secondary">
                    No registered members found. Use "Add Member" or "Import CSV" to enroll attendees.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-brand-canvas/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-medium text-brand-charcoal">
                      {m.member_code}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-brand-charcoal">{m.full_name}</td>
                    <td className="py-3.5 px-6">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(m)}
                          title="Edit Member"
                          className="p-1.5 rounded-lg hover:bg-brand-canvas text-brand-secondary hover:text-brand-charcoal transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m)}
                          title="Delete Member"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-brand-secondary hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editMember ? 'Edit Member Details' : 'Add New Member'}
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary">
                Member Code (Auto-Generated)
              </label>
              {!editMember && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.get('/api/members/next-code');
                      setMemberCode(res.nextCode);
                    } catch {}
                  }}
                  className="text-[10px] text-brand-gold hover:underline font-semibold"
                >
                  Regenerate
                </button>
              )}
            </div>
            <input
              type="text"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. MEM-001 (auto-filled)"
              className="w-full px-3.5 py-2 rounded-xl border border-brand-border bg-brand-canvas/40 text-sm focus:outline-none focus:border-brand-red font-mono"
            />
            <p className="text-[10px] text-brand-secondary mt-1">
              Automatically sequentially generated. You can also customize it if needed.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Arthur Pendelton"
              className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:border-brand-red"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-brand-border text-brand-red focus:ring-brand-red"
            />
            <label htmlFor="isActiveCheck" className="text-xs text-brand-charcoal font-medium">
              Member is active and eligible to participate
            </label>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium transition-all shadow-sm"
            >
              {editMember ? 'Save Changes' : 'Create Member'}
            </button>
            {editMember && (
              <button
                type="button"
                onClick={() => handleDeleteMember(editMember)}
                className="py-2.5 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setPendingImport(null);
        }}
        title="Upload Members via Excel"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Successfully imported {importResult.importedCount} members into directory!
              </div>
            </div>
          )}

          {/* Step 1: File selector */}
          {!pendingImport && (
            <div className="p-5 rounded-2xl bg-brand-canvas/70 border border-brand-border space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-brand-border text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-brand-charcoal">Select Excel Spreadsheet</h4>
                <p className="text-[11px] text-brand-secondary mt-1">
                  Supports <strong>.xlsx</strong> and <strong>.xls</strong> formats.<br />
                  Column A: <strong>Member Code</strong> (e.g. MEM-001) • Column B: <strong>Full Name</strong>
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  disabled={uploadingExcel}
                  className="hidden"
                  id="excelFileInput"
                />
                <label
                  htmlFor="excelFileInput"
                  className={`w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.99] text-white flex items-center justify-center gap-2 text-xs font-bold cursor-pointer shadow-md transition-all ${
                    uploadingExcel ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-4 h-4 text-white" />
                  {uploadingExcel ? 'Reading & Checking Duplicates...' : 'Choose Excel File'}
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Duplicate Review & Confirmation */}
          {pendingImport && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-lg font-bold text-emerald-700">{pendingImport.validMembers.length}</div>
                  <div className="text-[10px] font-semibold uppercase text-emerald-600">New Members Ready</div>
                </div>
                <div className={`p-3 rounded-xl border ${pendingImport.duplicates.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-brand-canvas border-brand-border text-brand-secondary'}`}>
                  <div className="text-lg font-bold">{pendingImport.duplicates.length}</div>
                  <div className="text-[10px] font-semibold uppercase">Duplicates Found</div>
                </div>
              </div>

              {/* Duplicates Notice & List */}
              {pendingImport.duplicates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>The following {pendingImport.duplicates.length} duplicate(s) were found and will be skipped:</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/50 p-2 text-[11px] space-y-1.5 divide-y divide-amber-200/50">
                    {pendingImport.duplicates.map((dup, idx) => (
                      <div key={idx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-brand-charcoal">{dup.fullName}</strong>{' '}
                          <span className="font-mono text-[10px] text-brand-secondary">({dup.memberCode})</span>
                        </div>
                        <span className="text-[10px] font-medium text-amber-700 text-right">{dup.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-brand-border text-xs font-semibold text-brand-charcoal hover:bg-brand-canvas transition-colors"
                >
                  Choose Different File
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={uploadingExcel || pendingImport.validMembers.length === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {uploadingExcel ? 'Importing...' : `Confirm & Add ${pendingImport.validMembers.length} Members`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

