import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  AlertCircle,
} from 'lucide-react';

export default function MemberManagement() {
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
  const [csvContent, setCsvContent] = useState('');
  const [actionError, setActionError] = useState('');
  const [importResult, setImportResult] = useState(null);

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

  async function handleImportCsv(e) {
    e.preventDefault();
    setActionError('');
    setImportResult(null);
    try {
      const res = await api.post('/api/members/import-csv', { csvContent });
      setImportResult(res);
      loadMembers();
    } catch (err) {
      setActionError(err.message || 'CSV Import failed');
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
            Registered event attendees (~50 members) eligible for candidate nominations and ballots.
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
              setCsvContent('');
              setImportResult(null);
              setActionError('');
              setIsImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-border hover:bg-white text-brand-charcoal text-xs font-medium transition-all"
          >
            <Upload className="w-4 h-4 text-brand-secondary" /> Import CSV
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
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1 rounded-lg hover:bg-brand-canvas text-brand-secondary hover:text-brand-charcoal transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
          <button
            type="submit"
            className="w-full mt-4 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium transition-all shadow-sm"
          >
            {editMember ? 'Save Changes' : 'Create Member'}
          </button>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Members from CSV"
      >
        <form onSubmit={handleImportCsv} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {importResult && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs">
              Successfully imported {importResult.importedCount} members.
              {importResult.errors?.length > 0 && (
                <div className="mt-2 text-red-600">
                  {importResult.errors.length} rows skipped due to duplicate code or format errors.
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
              Paste CSV Data (memberCode, fullName)
            </label>
            <textarea
              rows="8"
              required
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={`MEM-001,Alexander Wright\nMEM-002,Beatrice Montgomery\nMEM-003,Charles Pemberton`}
              className="w-full p-3 rounded-xl border border-brand-border text-xs font-mono focus:outline-none focus:border-brand-red"
            />
          </div>
          <p className="text-[11px] text-brand-secondary">
            Header row is optional. Each line must be in comma-separated format.
          </p>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium transition-all shadow-sm"
          >
            Execute CSV Import
          </button>
        </form>
      </Modal>
    </div>
  );
}

