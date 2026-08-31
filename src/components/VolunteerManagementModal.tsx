import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  KeyRound, 
  Edit3, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Search,
  Phone,
  Mail,
  UserX,
  UserCheck,
  Shield
} from 'lucide-react';
import { VolunteerRecord, DonationRecord } from '../types';

interface VolunteerManagementModalProps {
  volunteers: VolunteerRecord[];
  donations: DonationRecord[];
  onAddVolunteer: (volunteer: VolunteerRecord) => void;
  onEditVolunteer: (volunteer: VolunteerRecord) => void;
  onResetPassword: (volunteerCode: string, newAuthCode: string) => void;
  onClose: () => void;
}

export function VolunteerManagementModal({
  volunteers,
  donations,
  onAddVolunteer,
  onEditVolunteer,
  onResetPassword,
  onClose
}: VolunteerManagementModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingVolunteer, setEditingVolunteer] = useState<VolunteerRecord | null>(null);
  const [resettingVolunteer, setResettingVolunteer] = useState<VolunteerRecord | null>(null);
  
  // New Volunteer Form State
  const nextVolunteerCode = `VOL${String(volunteers.length + 1).padStart(3, '0')}`;
  const [newCode, setNewCode] = useState(nextVolunteerCode);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAuthCode, setNewAuthCode] = useState('');
  const [newStatus, setNewStatus] = useState<'Active' | 'Closed'>('Active');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Reset PIN Form State
  const [resetAuthCode, setResetAuthCode] = useState('');
  const [resetConfirmCode, setResetConfirmCode] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Filter volunteers
  const filteredVolunteers = volunteers.filter(v => 
    v.volunteerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.volunteerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.phone && v.phone.includes(searchTerm)) ||
    (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newCode.trim() || !newName.trim() || !newAuthCode.trim()) {
      setFormError('Volunteer Code, Name, and Security PIN are required.');
      return;
    }

    if (volunteers.some(v => v.volunteerCode.toUpperCase() === newCode.trim().toUpperCase())) {
      setFormError(`Volunteer Code ${newCode.trim().toUpperCase()} already exists. Please choose a unique code.`);
      return;
    }

    if (newAuthCode.trim().length < 4) {
      setFormError('Security PIN / Password must be at least 4 digits.');
      return;
    }

    const newVolunteer: VolunteerRecord = {
      volunteerCode: newCode.trim().toUpperCase(),
      volunteerName: newName.trim(),
      authCode: newAuthCode.trim(),
      status: newStatus,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined
    };

    onAddVolunteer(newVolunteer);
    setFormSuccess(`Volunteer ${newName.trim()} (${newCode.trim().toUpperCase()}) added successfully!`);
    
    // Reset form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAuthCode('');
    setNewCode(`VOL${String(volunteers.length + 2).padStart(3, '0')}`);
    
    setTimeout(() => {
      setFormSuccess('');
      setActiveTab('list');
    }, 1500);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolunteer) return;

    if (!editingVolunteer.volunteerName.trim()) {
      alert('Volunteer name cannot be empty.');
      return;
    }

    onEditVolunteer(editingVolunteer);
    setEditingVolunteer(null);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resettingVolunteer) return;

    if (!resetAuthCode.trim() || resetAuthCode.trim().length < 4) {
      setResetError('PIN must be at least 4 digits/characters.');
      return;
    }

    if (resetAuthCode !== resetConfirmCode) {
      setResetError('PIN and Confirmation PIN do not match.');
      return;
    }

    onResetPassword(resettingVolunteer.volunteerCode, resetAuthCode.trim());
    setResetSuccess(`Security PIN for ${resettingVolunteer.volunteerName} updated successfully!`);
    
    setTimeout(() => {
      setResetSuccess('');
      setResettingVolunteer(null);
      setResetAuthCode('');
      setResetConfirmCode('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 to-amber-950 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/15">
              <Shield className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-serif">Volunteer Management</h2>
              <p className="text-xs text-amber-200/90">
                Add, edit details, and reset authentication PIN for authorized mandal volunteers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => { setActiveTab('list'); setEditingVolunteer(null); setResettingVolunteer(null); }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'list'
                ? 'border-amber-800 text-amber-950'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Volunteers ({volunteers.length})
          </button>
          <button
            onClick={() => { setActiveTab('add'); setEditingVolunteer(null); setResettingVolunteer(null); }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'border-amber-800 text-amber-950'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Volunteer</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {/* TAB: LIST VOLUNTEERS */}
          {activeTab === 'list' && !editingVolunteer && !resettingVolunteer && (
            <div className="space-y-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search volunteer by code, name, phone or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                />
              </div>

              {/* Volunteers Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Volunteer Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Verified Seva</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {filteredVolunteers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No volunteers found matching &quot;{searchTerm}&quot;
                          </td>
                        </tr>
                      ) : (
                        filteredVolunteers.map(vol => {
                          const verifiedCount = donations.filter(d => d.confirmedBy.includes(vol.volunteerCode)).length;
                          return (
                            <tr key={vol.volunteerCode} className="hover:bg-amber-50/40 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-950">
                                {vol.volunteerCode}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">{vol.volunteerName}</div>
                                {(vol.phone || vol.email) && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                    {vol.phone && <span>📱 {vol.phone}</span>}
                                    {vol.email && <span>✉️ {vol.email}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  vol.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {vol.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                                {verifiedCount} verified
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingVolunteer({ ...vol })}
                                    title="Edit Volunteer Details"
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setResettingVolunteer(vol);
                                      setResetAuthCode('');
                                      setResetConfirmCode('');
                                      setResetError('');
                                    }}
                                    title="Reset Security PIN / Password"
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-right">
                Authorized volunteers can login to the Volunteer App to confirm UPI contributions.
              </div>

            </div>
          )}

          {/* TAB: ADD NEW VOLUNTEER */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  Enter the volunteer profile details. They will use their <strong>Volunteer Code</strong> and <strong>Security PIN</strong> to sign in and confirm UPI contributions in the Mandap.
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Volunteer Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VOL003"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyabrata Mohanty"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="e.g. 9892805337"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="e.g. volunteer@gmail.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Security Auth PIN / Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="6-digit PIN (e.g. 123456)"
                      value={newAuthCode}
                      onChange={e => setNewAuthCode(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  >
                    <option value="Active">Active (Can verify payments)</option>
                    <option value="Closed">Closed / Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Save Volunteer</span>
                </button>
              </div>
            </form>
          )}

          {/* EDIT VOLUNTEER SUB-VIEW */}
          {editingVolunteer && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">
                  Edit Volunteer: <span className="font-mono text-amber-900">{editingVolunteer.volunteerCode}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingVolunteer(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Volunteer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingVolunteer.volunteerName}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, volunteerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editingVolunteer.status}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed / Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9892805337"
                    value={editingVolunteer.phone || ''}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. volunteer@gmail.com"
                    value={editingVolunteer.email || ''}
                    onChange={e => setEditingVolunteer({ ...editingVolunteer, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVolunteer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Volunteer</span>
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD / PIN SUB-VIEW */}
          {resettingVolunteer && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Reset Security PIN for {resettingVolunteer.volunteerName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Code: {resettingVolunteer.volunteerCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResettingVolunteer(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Back to List
                </button>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Security PIN / Auth Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new PIN (e.g. 6-digits)"
                    value={resetAuthCode}
                    onChange={e => setResetAuthCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Security PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new PIN"
                    value={resetConfirmCode}
                    onChange={e => setResetConfirmCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingVolunteer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Update Security PIN</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
