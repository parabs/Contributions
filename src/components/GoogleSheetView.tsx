import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  ExternalLink, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Receipt,
  Users,
  Download,
  Mail,
  QrCode,
  Building2,
  Check,
  ShieldCheck,
  X,
  UserCheck,
  RefreshCw,
  Sparkles,
  LogIn,
  Settings,
  PlusCircle,
  Save,
  CheckCircle
} from 'lucide-react';
import { DonationRecord, VolunteerRecord } from '../types';
import { SEVA_CATEGORIES } from '../data/mockData';
import { useGmailAuth } from '../context/GmailAuthContext';
import { 
  TARGET_SPREADSHEET_URL, 
  TARGET_SPREADSHEET_ID, 
  batchSyncAllDonations,
  testAppendRowToGoogleSheet,
  repairAndAlignGoogleSheetHeaders,
  getSheetsConfig,
  saveSheetsConfig,
  GoogleSheetsSyncConfig
} from '../services/googleSheetsService';

interface GoogleSheetViewProps {
  donations: DonationRecord[];
  volunteers: VolunteerRecord[];
  onViewReceipt: (donation: DonationRecord) => void;
  onConfirmDonation?: (donationId: string, volunteerName: string) => void;
  onOpenVolunteerManagement?: () => void;
}

export function GoogleSheetView({
  donations,
  volunteers,
  onViewReceipt,
  onConfirmDonation,
  onOpenVolunteerManagement
}: GoogleSheetViewProps) {
  const { isAuthenticated, accessToken, userProfile, loginWithGoogle } = useGmailAuth();
  const [activeTab, setActiveTab] = useState<'donations' | 'formResponses' | 'volunteers' | 'config'>('donations');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Confirmation Pending'>('All');
  const [modeFilter, setModeFilter] = useState<'All' | 'Cash' | 'UPI'>('All');
  const [volunteerFilter, setVolunteerFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Push / Batch Sync State
  const [isPushingToSheets, setIsPushingToSheets] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sheets Configuration State
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsSyncConfig>(getSheetsConfig());
  const [configSavedMsg, setConfigSavedMsg] = useState(false);
  const [isTestingAppend, setIsTestingAppend] = useState(false);
  const [testAppendResult, setTestAppendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Confirmation Modal State
  const [confirmingDonation, setConfirmingDonation] = useState<DonationRecord | null>(null);
  const [selectedVolunteerForConfirm, setSelectedVolunteerForConfirm] = useState<string>(
    volunteers[0] ? `${volunteers[0].volunteerName} (${volunteers[0].volunteerCode})` : 'Trust Volunteer'
  );
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState('');

  const handleSaveConfig = () => {
    saveSheetsConfig(sheetsConfig);
    setConfigSavedMsg(true);
    setTimeout(() => setConfigSavedMsg(false), 3000);
  };

  const handleTestAppend = async () => {
    setIsTestingAppend(true);
    setTestAppendResult(null);
    try {
      const res = await testAppendRowToGoogleSheet(accessToken, sheetsConfig);
      setTestAppendResult(res);
    } catch (err: any) {
      setTestAppendResult({
        success: false,
        message: err.message || 'Failed to append test row'
      });
    } finally {
      setIsTestingAppend(false);
    }
  };

  const [isAligningHeaders, setIsAligningHeaders] = useState(false);

  const handleAlignHeaders = async () => {
    if (!isAuthenticated || !accessToken) {
      setPushStatusMessage({
        type: 'error',
        text: 'Please sign in with Google first to align sheet headers.'
      });
      return;
    }

    setIsAligningHeaders(true);
    setPushStatusMessage(null);

    const result = await repairAndAlignGoogleSheetHeaders(accessToken, sheetsConfig.spreadsheetId || TARGET_SPREADSHEET_ID);
    setIsAligningHeaders(false);

    if (result.success) {
      setPushStatusMessage({
        type: 'success',
        text: `✓ ${result.message}`
      });
    } else {
      setPushStatusMessage({
        type: 'error',
        text: `Header alignment note: ${result.message}`
      });
    }

    setTimeout(() => {
      setPushStatusMessage(null);
    }, 6000);
  };

  const handlePushAllToSheet = async () => {
    if (!isAuthenticated || !accessToken) {
      setPushStatusMessage({
        type: 'error',
        text: 'Please sign in with Google first to push records directly to your Google Sheet.'
      });
      return;
    }

    setIsPushingToSheets(true);
    setPushStatusMessage(null);

    const result = await batchSyncAllDonations(donations, accessToken, sheetsConfig.spreadsheetId || TARGET_SPREADSHEET_ID);
    setIsPushingToSheets(false);

    if (result.success) {
      setPushStatusMessage({
        type: 'success',
        text: `✓ ${result.message}`
      });
    } else {
      setPushStatusMessage({
        type: 'error',
        text: `Sync note: ${result.message}`
      });
    }

    setTimeout(() => {
      setPushStatusMessage(null);
    }, 6000);
  };

  // Filter donations
  const filteredDonations = donations.filter(d => {
    const matchesSearch = 
      d.donationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.sevaHead && d.sevaHead.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.sevaCategory && d.sevaCategory.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.confirmationCode && d.confirmationCode.includes(searchTerm));

    const matchesStatus = statusFilter === 'All' || d.paymentStatus === statusFilter;
    const matchesMode = modeFilter === 'All' || d.paymentMode === modeFilter;
    
    let matchesVolunteer = true;
    if (volunteerFilter !== 'All') {
      if (volunteerFilter === 'Cash Counter') {
        matchesVolunteer = d.paymentMode === 'Cash' || d.confirmedBy.includes('Cash Counter');
      } else {
        matchesVolunteer = d.confirmedBy.includes(volunteerFilter);
      }
    }

    let matchesCategory = true;
    if (categoryFilter !== 'All') {
      matchesCategory = d.sevaCategory === categoryFilter || (d.sevaHead ? d.sevaHead.includes(categoryFilter) : false);
    }

    return matchesSearch && matchesStatus && matchesMode && matchesVolunteer && matchesCategory;
  });

  const handleExecuteConfirm = () => {
    if (!confirmingDonation) return;
    setIsProcessingConfirm(true);

    if (onConfirmDonation) {
      onConfirmDonation(confirmingDonation.donationId, selectedVolunteerForConfirm);
    }

    setConfirmSuccessMsg(`Payment confirmed for ${confirmingDonation.donorName}! Official receipt generated.`);
    
    setTimeout(() => {
      setIsProcessingConfirm(false);
      setConfirmSuccessMsg('');
      setConfirmingDonation(null);
    }, 1200);
  };

  const exportCsv = () => {
    const headers = [
      'Donation ID', 'Submitted At', 'Towards (Seva Head)', 'Donor Name', 'Email ID',
      'Amount (INR)', 'Payment Mode', 'Payment Status', 'Reference', 'Receipt URL',
      'Email Status', 'Email Message ID', 'Created At', 'Updated At',
      'Confirmation Code', 'Confirmed By', 'Seva Category', 'Seva Head'
    ];
    
    const rows = filteredDonations.map(d => [
      d.donationId,
      d.submittedAt,
      `"${(d.sevaHead || d.sevaCategory || 'General Seva').replace(/"/g, '""')}"`,
      `"${d.donorName.replace(/"/g, '""')}"`,
      d.email,
      d.amount,
      d.paymentMode,
      d.paymentStatus,
      d.paymentReference,
      d.receiptUrl,
      d.emailStatus,
      d.emailMessageId,
      d.createdAt,
      d.updatedAt,
      d.confirmationCode,
      `"${(d.confirmedBy || '').replace(/"/g, '""')}"`,
      `"${(d.sevaCategory || '').replace(/"/g, '""')}"`,
      `"${(d.sevaHead || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SHREE_JAGANNATH_SEVA_TRUST_DONATIONS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tabs */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 font-serif">Google Sheet Database Explorer</h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Live Bi-Directional
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Shree Jagannath Seva Trust Central Master Ledger • Real-time Payment Confirmation &amp; Volunteer Filtering
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('donations')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'donations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sheet 1: Donations ({donations.length})
            </button>
            <button
              onClick={() => setActiveTab('formResponses')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'formResponses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Form Responses 1 (7 Cols A-G)
            </button>
            <button
              onClick={() => setActiveTab('volunteers')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'volunteers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sheet 2: Volunteers ({volunteers.length})
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'config' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Sheet Configuration</span>
            </button>
          </div>

          {onOpenVolunteerManagement && (
            <button
              onClick={onOpenVolunteerManagement}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-amber-800" />
              <span>Manage Volunteers</span>
            </button>
          )}

          <button
            onClick={exportCsv}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Live Google Spreadsheet Connection Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Directly Directed to Live Google Sheet
              </span>
              <span className="text-xs text-slate-300 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                gid: 1334305026 (Form Responses 1)
              </span>
            </div>
            <p className="text-sm font-bold text-white">
              Target Spreadsheet: <span className="font-mono text-emerald-300 text-xs break-all">{TARGET_SPREADSHEET_ID}</span>
            </p>
            <p className="text-xs text-slate-300">
              Devotee submissions from the form are directed to the <strong>Form Responses 1</strong> sheet tab. Volunteer payment verifications and 80G tax receipts are tracked on the <strong>Donations</strong> master sheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <a
              href={TARGET_SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {isAuthenticated ? (
              <>
                <button
                  onClick={handleAlignHeaders}
                  disabled={isAligningHeaders}
                  title="Corrects column headers on both sheets to match schema"
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Table className={`w-3.5 h-3.5 ${isAligningHeaders ? 'animate-spin' : ''}`} />
                  <span>{isAligningHeaders ? 'Fixing Headers...' : 'Align Sheet Headers'}</span>
                </button>

                <button
                  onClick={handlePushAllToSheet}
                  disabled={isPushingToSheets}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isPushingToSheets ? 'animate-spin' : ''}`} />
                  <span>{isPushingToSheets ? 'Syncing to Sheet...' : 'Push All Records to Sheet'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-emerald-600" />
                <span>Sign in with Google to Sync</span>
              </button>
            )}
          </div>
        </div>

        {pushStatusMessage && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            pushStatusMessage.type === 'success' 
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pushStatusMessage.text}</span>
          </div>
        )}
      </div>
      {activeTab === 'donations' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Multi-Filter Bar with Search, Status, Mode, Volunteer & Category Filter */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 space-y-3">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Devotee, Email, ID, Seva Head, or 6-digit Code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium self-center">
                Showing <strong className="text-slate-900 font-mono">{filteredDonations.length}</strong> of {donations.length} records
              </div>
            </div>

            {/* Structured Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid Only</option>
                  <option value="Confirmation Pending">Pending Confirmation Only</option>
                </select>
              </div>

              {/* Mode Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Mode</label>
                <select
                  value={modeFilter}
                  onChange={e => setModeFilter(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Modes</option>
                  <option value="UPI">UPI Direct Only</option>
                  <option value="Cash">Cash at Counter Only</option>
                </select>
              </div>

              {/* Volunteer Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Volunteer Filter</label>
                <select
                  value={volunteerFilter}
                  onChange={e => setVolunteerFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Volunteers</option>
                  <option value="Cash Counter">Cash Counter Staff</option>
                  {volunteers.map(v => (
                    <option key={v.volunteerCode} value={v.volunteerCode}>
                      {v.volunteerName} ({v.volunteerCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seva Category Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Seva Category</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="All">All Categories</option>
                  {SEVA_CATEGORIES.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                  <option value="Custom / Other Seva">Custom / Other Seva</option>
                </select>
              </div>

            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Col A: Donation ID</th>
                  <th className="py-3 px-3">Col B: Submitted At</th>
                  <th className="py-3 px-3">Col C: Towards (Seva Head)</th>
                  <th className="py-3 px-3">Col D: Donor Name</th>
                  <th className="py-3 px-3">Col E: Email</th>
                  <th className="py-3 px-3 text-right">Col F: Amount (₹)</th>
                  <th className="py-3 px-3">Col G: Mode</th>
                  <th className="py-3 px-3">Col H: Status</th>
                  <th className="py-3 px-3">Col I: Payment Reference</th>
                  <th className="py-3 px-3">Col J: Final Receipt URL</th>
                  <th className="py-3 px-3">Col K: WhatsApp Status</th>
                  <th className="py-3 px-3">Col L: WhatsApp Msg ID</th>
                  <th className="py-3 px-3">Col M: Created At</th>
                  <th className="py-3 px-3">Col N: Updated At</th>
                  <th className="py-3 px-3">Col O: Confirmed by</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-10 text-center text-slate-400 text-xs">
                      No donation records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map(row => (
                    <tr key={row.donationId} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {row.donationId}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]">
                          {row.sevaHead || row.sevaCategory || 'General Seva'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {row.donorName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {row.email || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-slate-900">
                        ₹{row.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          row.paymentMode === 'UPI' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {row.paymentStatus === 'Paid' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{row.paymentStatus}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {row.paymentReference || (row.paymentMode === 'Cash' ? 'CASH-COUNTER' : (row.confirmationCode ? `UPI-PIN-${row.confirmationCode}` : '—'))}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {row.receiptUrl ? (
                          <span className="text-amber-800 underline truncate max-w-[120px] inline-block" title={row.receiptUrl}>
                            {row.receiptUrl}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (row.whatsappStatus || (row.paymentStatus === 'Paid' ? 'Sent' : 'Pending')) === 'Sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.whatsappStatus || (row.paymentStatus === 'Paid' ? 'Sent' : 'Pending')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {row.whatsappMessageId || (row.paymentStatus === 'Paid' ? `WA-${row.donationId.split('-').pop()}` : '—')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {row.createdAt || row.submittedAt || new Date().toISOString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {row.updatedAt || row.submittedAt || new Date().toISOString()}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {row.confirmedBy ? (
                          <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200 font-bold text-[11px]">
                            {row.confirmedBy}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending Verification</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.paymentStatus === 'Paid' ? (
                          <button
                            onClick={() => onViewReceipt(row)}
                            className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        ) : (
                          /* INLINE OPTION TO CONFIRM PAYMENT DIRECT FROM LIVESHEET */
                          <button
                            onClick={() => setConfirmingDonation(row)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            title="Confirm Payment & Issue Receipt"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Showing {filteredDonations.length} of {donations.length} records</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Columns: A (Donation ID) → O (Confirmed by). Status (Col H: Pending / Paid), Confirmed by (Col O: filled only after verification)
            </span>
          </div>

        </div>
      )}

      {/* TAB 2: FORM RESPONSES 1 (RAW DEVOTEE SUBMISSIONS) */}
      {activeTab === 'formResponses' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Form Responses 1 (Raw Google Sheet Append Tab)</h3>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  7 Standard Columns (A to G)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Schema: <strong>A: Timestamp | B: Contributor Name | C: Email ID | D: Amount (₹) | E: Payment Mode | F: Towards (Seva Head / Category) | G: Confirmation Code</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTestAppend}
                disabled={isTestingAppend}
                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className={`w-3.5 h-3.5 ${isTestingAppend ? 'animate-spin' : ''}`} />
                <span>{isTestingAppend ? 'Appending...' : 'Test Append Row'}</span>
              </button>
              <div className="text-xs text-slate-500 font-medium">
                Responses: <strong className="text-slate-900 font-mono">{donations.length}</strong>
              </div>
            </div>
          </div>

          {testAppendResult && (
            <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 ${
              testAppendResult.success 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{testAppendResult.message}</span>
              </div>
              <button onClick={() => setTestAppendResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Raw Responses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">A: Timestamp</th>
                  <th className="py-3 px-4">B: Contributor Name</th>
                  <th className="py-3 px-4">C: Email ID</th>
                  <th className="py-3 px-4 text-right">D: Amount (₹)</th>
                  <th className="py-3 px-4">E: Payment Mode (Cash / UPI)</th>
                  <th className="py-3 px-4">F: Towards (Seva Head / Category)</th>
                  <th className="py-3 px-4 text-center">G: Confirmation Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {donations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No raw form submissions received yet.
                    </td>
                  </tr>
                ) : (
                  donations.map(row => (
                    <tr key={row.donationId} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.donorName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {row.email || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black font-mono text-slate-900">
                        ₹{row.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          row.paymentMode === 'UPI' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.paymentMode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200/70">
                          {row.sevaHead || row.sevaCategory || 'General Seva'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className="bg-slate-100 text-amber-950 px-2.5 py-0.5 rounded border border-slate-200 tracking-wider">
                          {row.confirmationCode || '482731'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Columns: A (Timestamp) → G (Confirmation Code)</span>
            <span className="text-[11px] text-amber-800 font-medium">
              Every devotee submission is automatically appended into Tab "Form Responses 1".
            </span>
          </div>

        </div>
      )}

      {/* TAB 3: VOLUNTEERS SHEET */}
      {activeTab === 'volunteers' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Volunteers Registry Sheet</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized verification personnel for Shree Jagannath Seva Trust.
              </p>
            </div>
            {onOpenVolunteerManagement && (
              <button
                onClick={onOpenVolunteerManagement}
                className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Add / Edit Volunteers</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Volunteer Code</th>
                  <th className="py-3 px-4">Volunteer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verified Transactions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {volunteers.map(vol => {
                  const verifiedCount = donations.filter(d => d.confirmedBy.includes(vol.volunteerCode)).length;
                  return (
                    <tr key={vol.volunteerCode} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-900">
                        {vol.volunteerCode}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {vol.volunteerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {vol.phone || vol.email ? (
                          <div className="space-y-0.5">
                            {vol.phone && <div>📱 {vol.phone}</div>}
                            {vol.email && <div>✉️ {vol.email}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          vol.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {vol.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {verifiedCount} contributions
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {onOpenVolunteerManagement && (
                          <button
                            onClick={onOpenVolunteerManagement}
                            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE SHEET CONFIGURATION & LIVE APPEND SETTINGS */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-800" />
                <h3 className="font-bold text-base text-slate-900">Google Sheet Connection &amp; Append Configuration</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage your Google Sheet ID, Form Responses tab destination, and Apps Script Webhook endpoint.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href={TARGET_SPREADSHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Open Current Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Save Notice */}
            {configSavedMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Google Sheet configuration saved successfully! Active for all new devotee submissions.</span>
              </div>
            )}

            {/* Test Append Feedback */}
            {testAppendResult && (
              <div className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 ${
                testAppendResult.success 
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="block font-bold">Append Test Result:</strong>
                    <span>{testAppendResult.message}</span>
                  </div>
                </div>
                <button onClick={() => setTestAppendResult(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Form 1: Settings inputs */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Spreadsheet Parameters
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Google Spreadsheet ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sheetsConfig.spreadsheetId}
                    onChange={e => setSheetsConfig(prev => ({ ...prev, spreadsheetId: e.target.value.trim() }))}
                    placeholder="1NA-Lj0fWSZYgmXDr-wNtZMAVhbnlo6MjlW1LuqJX3PE"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Found in the Google Sheet URL: docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Form Responses Tab Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sheetsConfig.formResponsesTabName}
                    onChange={e => setSheetsConfig(prev => ({ ...prev, formResponsesTabName: e.target.value.trim() }))}
                    placeholder="Form Responses 1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Exact name of the sheet tab for 7-column devotee submissions (A: Timestamp to G: Confirmation Code).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Google Apps Script Webhook URL (For Direct Background Append)
                  </label>
                  <input
                    type="text"
                    value={sheetsConfig.webhookUrl}
                    onChange={e => setSheetsConfig(prev => ({ ...prev, webhookUrl: e.target.value.trim() }))}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enables direct background append even when Google OAuth token is not active in the browser.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Configuration</span>
                  </button>

                  <button
                    onClick={handleTestAppend}
                    disabled={isTestingAppend}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <PlusCircle className={`w-3.5 h-3.5 ${isTestingAppend ? 'animate-spin' : ''}`} />
                    <span>{isTestingAppend ? 'Appending Test Row...' : 'Test Append to Sheet'}</span>
                  </button>
                </div>
              </div>

              {/* Column Mapping Reference */}
              <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-600" />
                  <span>Form Responses 1: 7-Column Schema</span>
                </h4>
                
                <p className="text-xs text-slate-600">
                  Every submission from the Devotee Form is appended into the active sheet matching this strict order:
                </p>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col A</span>
                    <span className="text-slate-800">Timestamp (e.g. {new Date().toLocaleString('en-IN')})</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col B</span>
                    <span className="text-slate-800">Contributor Name (e.g. Arun Kumar)</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col C</span>
                    <span className="text-slate-800">Email ID (e.g. devotee@gmail.com)</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col D</span>
                    <span className="text-slate-800">Amount (₹) (e.g. 5001)</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col E</span>
                    <span className="text-slate-800">Payment Mode (Cash / UPI)</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col F</span>
                    <span className="text-slate-800">Towards (Seva Head / Category)</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between">
                    <span className="font-bold text-amber-900">Col G</span>
                    <span className="text-slate-800">Confirmation Code (6-Digit PIN e.g. 482731)</span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500">
                  ⚡ When Devotees submit, data is dispatched via Webhook / Google Sheets API without requiring manual copy-paste.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CONFIRM PAYMENT MODAL (DIRECT FROM LIVESHEET) */}
      {confirmingDonation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Confirm Payment in LiveSheet</span>
              </div>
              <button
                onClick={() => setConfirmingDonation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 text-center font-bold">
                {confirmSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Donation Details Preview */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Donation ID:</span>
                    <strong className="font-mono text-slate-900">{confirmingDonation.donationId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Devotee Name:</span>
                    <strong className="text-slate-900">{confirmingDonation.donorName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <strong className="font-mono text-slate-900">{confirmingDonation.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <strong className="text-base font-black text-amber-950">₹{confirmingDonation.amount.toLocaleString('en-IN')}</strong>
                  </div>
                  {confirmingDonation.confirmationCode && (
                    <div className="flex justify-between items-center pt-1 border-t border-amber-200/60">
                      <span className="text-slate-500">6-Digit Code:</span>
                      <strong className="font-mono text-sm tracking-widest text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {confirmingDonation.confirmationCode}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Confirming Volunteer Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Verifying Volunteer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedVolunteerForConfirm}
                    onChange={e => setSelectedVolunteerForConfirm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
                  >
                    {volunteers.map(v => (
                      <option key={v.volunteerCode} value={`${v.volunteerName} (${v.volunteerCode})`}>
                        {v.volunteerName} ({v.volunteerCode})
                      </option>
                    ))}
                    <option value="Cash Counter">Cash Counter Staff</option>
                  </select>
                </div>

                {/* Modal Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDonation(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingConfirm}
                    onClick={handleExecuteConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessingConfirm ? 'Confirming...' : 'Approve & Issue Receipt'}</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
