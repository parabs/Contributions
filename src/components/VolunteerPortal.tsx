import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  UserCheck, 
  Lock, 
  LogOut, 
  Receipt, 
  Mail, 
  History, 
  Sparkles, 
  Building2,
  Users,
  Filter,
  KeyRound,
  BarChart3,
  Table,
  Settings,
  ChevronRight,
  Bell,
  PlusCircle,
  IndianRupee,
  HandHeart,
  CreditCard,
  Banknote,
  Send,
  RefreshCw
} from 'lucide-react';
import { DonationRecord, VolunteerRecord, TrustConfig } from '../types';
import { SEVA_CATEGORIES } from '../data/mockData';
import { CollectionsDashboard } from './CollectionsDashboard';
import { GoogleSheetView } from './GoogleSheetView';
import { EmailConfigView } from './EmailConfigView';
import { verifyDonationByPin } from '../services/googleSheetsService';


interface VolunteerPortalProps {
  volunteers: VolunteerRecord[];
  donations: DonationRecord[];
  trustConfig: TrustConfig;
  onVerifyDonation: (
    confirmationCode: string,
    volunteerName: string
  ) => Promise<{ success: boolean; donation?: DonationRecord; error?: string }>;
  onDirectDonationSubmit?: (formData: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
    volunteerName: string;
    volunteerCode: string;
  }) => Promise<DonationRecord>;
  onViewReceipt: (donation: DonationRecord) => void;
  onConfirmDonationFromSheet?: (donationId: string, volunteerName: string) => void;
  onRefreshFromGoogleSheet?: () => Promise<{ count: number; error?: string }>;
  onUpdateTrustConfig?: (updated: Partial<TrustConfig>) => void;
  onOpenVolunteerManagement?: () => void;
}

export function VolunteerPortal({
  volunteers,
  donations,
  trustConfig,
  onVerifyDonation,
  onDirectDonationSubmit,
  onViewReceipt,
  onConfirmDonationFromSheet,
  onRefreshFromGoogleSheet,
  onUpdateTrustConfig,
  onOpenVolunteerManagement
}: VolunteerPortalProps) {
  // Authentication state with session persistence
  const [currentVolunteer, setCurrentVolunteer] = useState<VolunteerRecord | null>(() => {
    try {
      const saved = sessionStorage.getItem('sjst_active_volunteer');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify volunteer is still active in roster
        const found = volunteers.find(v => v.volunteerCode === parsed.volunteerCode && v.status === 'Active');
        if (found) return found;
      }
    } catch (e) {}
    return null;
  });

  const [loginVolunteerCode, setLoginVolunteerCode] = useState(volunteers[0]?.volunteerCode || 'VOL001');
  const [loginAuthCode, setLoginAuthCode] = useState(volunteers[0]?.authCode || '246810');
  const [loginError, setLoginError] = useState('');

  // Internal Authenticated Sub-view
  const [activeInternalTab, setActiveInternalTab] = useState<'verify' | 'directEntry' | 'detailedDashboard' | 'liveSheet' | 'emailConfig'>('verify');

  // Direct Counter Entry Form State
  const [directDonorName, setDirectDonorName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directSelectedCategory, setDirectSelectedCategory] = useState<string>(SEVA_CATEGORIES[0]?.category || 'General Seva');
  const [directSelectedSeva, setDirectSelectedSeva] = useState<string>(SEVA_CATEGORIES[0]?.items[0]?.id || 'murti-5001');
  const [directAmount, setDirectAmount] = useState<number>(SEVA_CATEGORIES[0]?.items[0]?.amount || 5001);
  const [directCustomHead, setDirectCustomHead] = useState('');
  const [directPaymentMode, setDirectPaymentMode] = useState<'Cash' | 'UPI'>('Cash');
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);
  const [directSuccessDonation, setDirectSuccessDonation] = useState<DonationRecord | null>(null);

  // Code verification state
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    donation?: DonationRecord;
    error?: string;
  } | null>(null);

  // Queue Search and Filter
  const [queueSearch, setQueueSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lastPendingCount, setLastPendingCount] = useState<number>(0);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(false);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);
  const [refreshQueueMsg, setRefreshQueueMsg] = useState<string | null>(null);

  const handleQueueRefresh = async () => {
    if (!onRefreshFromGoogleSheet) return;
    setIsRefreshingQueue(true);
    setRefreshQueueMsg(null);
    try {
      const res = await onRefreshFromGoogleSheet();
      if (res.error) {
        setRefreshQueueMsg(`Note: ${res.error}`);
      } else {
        setRefreshQueueMsg(`✓ Synced live with Google Sheet`);
      }
    } catch (e: any) {
      setRefreshQueueMsg(`Error: ${e.message}`);
    } finally {
      setIsRefreshingQueue(false);
      setTimeout(() => setRefreshQueueMsg(null), 3500);
    }
  };

  // Sync current volunteer to sessionStorage
  useEffect(() => {
    if (currentVolunteer) {
      sessionStorage.setItem('sjst_active_volunteer', JSON.stringify(currentVolunteer));
    } else {
      sessionStorage.removeItem('sjst_active_volunteer');
    }
  }, [currentVolunteer]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const volunteer = volunteers.find(
      v => v.volunteerCode.trim().toUpperCase() === loginVolunteerCode.trim().toUpperCase()
    );

    if (!volunteer) {
      setLoginError('Volunteer Code not recognized. Please check with administrator or add in Volunteer Management.');
      return;
    }

    if (volunteer.status !== 'Active') {
      setLoginError('This volunteer account is closed / inactive.');
      return;
    }

    if (volunteer.authCode !== loginAuthCode.trim()) {
      setLoginError('Incorrect Security PIN / Auth Code.');
      return;
    }

    setCurrentVolunteer(volunteer);
    sessionStorage.setItem('sjst_active_volunteer', JSON.stringify(volunteer));
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentVolunteer(null);
    sessionStorage.removeItem('sjst_active_volunteer');
    setInputCode('');
    setVerifyResult(null);
    setActiveInternalTab('verify');
  };

  // Handle Direct Volunteer Counter Donation Submission
  const handleDirectDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVolunteer) return;
    if (!directDonorName.trim()) {
      alert('Please enter devotee / contributor name.');
      return;
    }
    if (directAmount <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }

    setIsSubmittingDirect(true);
    setDirectSuccessDonation(null);

    // Compute Seva Head Name
    let sevaHeadName = directCustomHead.trim();
    if (!sevaHeadName) {
      const currentCat = SEVA_CATEGORIES.find(c => c.category === directSelectedCategory);
      const currentItem = currentCat?.items.find(i => i.id === directSelectedSeva);
      sevaHeadName = currentItem ? currentItem.name : directSelectedCategory;
    }

    try {
      if (onDirectDonationSubmit) {
        const record = await onDirectDonationSubmit({
          donorName: directDonorName.trim(),
          email: directEmail.trim(),
          amount: Number(directAmount),
          paymentMode: directPaymentMode,
          sevaCategory: directSelectedCategory,
          sevaHead: sevaHeadName,
          volunteerName: currentVolunteer.volunteerName,
          volunteerCode: currentVolunteer.volunteerCode
        });

        setDirectSuccessDonation(record);
        // Reset form for next devotee
        setDirectDonorName('');
        setDirectEmail('');
        setDirectCustomHead('');
      }
    } catch (err: any) {
      alert(`Error recording contribution: ${err.message || 'Please retry'}`);
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // Direct Category change
  const handleDirectCategoryChange = (catName: string) => {
    setDirectSelectedCategory(catName);
    const catObj = SEVA_CATEGORIES.find(c => c.category === catName);
    if (catObj && catObj.items.length > 0) {
      setDirectSelectedSeva(catObj.items[0].id);
      setDirectAmount(catObj.items[0].amount);
    }
  };

 // Reusable verification execution via Direct Webhook (Token-free & CORS safe)
  // Reusable verification execution via Direct Webhook (Token-free & CORS safe)
  const executeVerification = async (codeToVerify: string) => {
    if (!currentVolunteer) return;
    const clean = codeToVerify.trim();
    if (!clean || clean.length < 4) {
      alert('Please enter a valid confirmation PIN (e.g. 6-digit code or Donation ID).');
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      // 1. Fire direct webhook call to Apps Script backend (fire-and-forget for no-cors)
      await verifyDonationByPin(
        clean,
        `${currentVolunteer.volunteerName} (${currentVolunteer.volunteerCode})`
      );

      // 2. Immediately sync parent state and UI since the backend webhook executed
      if (onVerifyDonation) {
        const result = await onVerifyDonation(
          clean,
          `${currentVolunteer.volunteerName} (${currentVolunteer.volunteerCode})`
        );
        setVerifyResult(result);
        if (result.success) {
          setInputCode('');
        }
      } else {
        // Fallback if parent handler isn't bound
        setVerifyResult({
          success: true,
          donation: donations.find(d => d.confirmationCode === clean || d.donationId === clean)
        });
        setInputCode('');
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        error: err.message || 'Network or processing error. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };


  // Handle Code Verification Form Submit
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    executeVerification(inputCode);
  };

  // Play pleasant temple bell sound on new devotee arrival
  const playAlertChime = () => {
    if (!soundAlertEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // List of pending donations with filters (both UPI and Cash requiring volunteer verification)
  const pendingDonations = donations.filter(d => {
    const isPending = d.paymentStatus === 'Confirmation Pending' || d.paymentStatus === 'Pending';
    if (!isPending) return false;
    
    const matchesSearch = 
      d.donorName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      d.email.toLowerCase().includes(queueSearch.toLowerCase()) ||
      (d.sevaHead && d.sevaHead.toLowerCase().includes(queueSearch.toLowerCase())) ||
      d.confirmationCode.includes(queueSearch) ||
      d.donationId.toLowerCase().includes(queueSearch.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || d.sevaCategory === categoryFilter || (d.sevaHead ? d.sevaHead.includes(categoryFilter) : false);

    return matchesSearch && matchesCategory;
  });

  // Trigger alert if new pending offering arrives
  useEffect(() => {
    if (pendingDonations.length > lastPendingCount && lastPendingCount > 0) {
      playAlertChime();
    }
    setLastPendingCount(pendingDonations.length);
  }, [pendingDonations.length]);

  // Filtered donations for verification audit
  const verifiedByMe = donations.filter(
    d => currentVolunteer && d.confirmedBy.includes(currentVolunteer.volunteerCode)
  );

  // ----------------------------------------------------
  // RENDER: LOGIN FORM (IF NOT AUTHENTICATED)
  // ----------------------------------------------------
  if (!currentVolunteer) {
    const activeVolunteers = volunteers.filter(v => v.status === 'Active');
    return (
      <div className="max-w-md mx-auto py-8 space-y-4">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-800 text-white flex items-center justify-center mx-auto shadow-md shadow-amber-900/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 font-serif">Volunteer &amp; Management Portal</h2>
            <p className="text-xs text-slate-500">
              Authenticate using your Volunteer Code &amp; Security PIN to access UPI Verification, Detailed Dashboard, Live Sheet, and Email Config.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Volunteer Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VOL001"
                value={loginVolunteerCode}
                onChange={e => setLoginVolunteerCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-semibold text-slate-900 bg-slate-50 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Personal Security PIN / Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter PIN"
                  value={loginAuthCode}
                  onChange={e => setLoginAuthCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-semibold text-slate-900 bg-slate-50 font-mono"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-900/20 transition cursor-pointer"
            >
              Sign In to Volunteer Portal
            </button>
          </form>

          {/* Dynamic Active Volunteers Quick Selector */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>Active Volunteer Credentials ({activeVolunteers.length}):</span>
              </span>
              {onOpenVolunteerManagement && (
                <button
                  type="button"
                  onClick={onOpenVolunteerManagement}
                  className="text-[10px] text-amber-900 font-bold underline hover:text-amber-950 cursor-pointer"
                >
                  Manage
                </button>
              )}
            </div>
            <div className="space-y-1 pt-1">
              {activeVolunteers.map(v => (
                <button
                  key={v.volunteerCode}
                  type="button"
                  onClick={() => {
                    setLoginVolunteerCode(v.volunteerCode);
                    setLoginAuthCode(v.authCode);
                    setLoginError('');
                  }}
                  className="w-full text-left p-1.5 rounded-lg bg-white/70 hover:bg-white border border-amber-200/60 flex items-center justify-between text-[11px] transition cursor-pointer"
                >
                  <span className="font-bold text-slate-800">• <code>{v.volunteerCode}</code> ({v.volunteerName})</span>
                  <span className="text-[10px] font-mono text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded">
                    PIN: {v.authCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: AUTHENTICATED VOLUNTEER WORKBENCH WITH TABS
  // ----------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Volunteer Active Status Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-900 text-base sm:text-lg font-serif">
                {currentVolunteer.volunteerName}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                {currentVolunteer.volunteerCode} • Authorized Session
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Authorized Volunteer &amp; System Officer • {trustConfig.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div className="text-right text-xs">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Verified by You</div>
            <div className="font-black text-amber-900 font-mono">{verifiedByMe.length} Contributions</div>
          </div>

          {onRefreshFromGoogleSheet && (
            <button
              onClick={handleQueueRefresh}
              disabled={isRefreshingQueue}
              className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white border border-amber-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              title="Fetch live pending confirmation codes from Form Responses 1 & Donations sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQueue ? 'animate-spin' : ''}`} />
              <span>{isRefreshingQueue ? 'Fetching Sheet...' : 'Refresh Sheet Queue'}</span>
            </button>
          )}

          {onOpenVolunteerManagement && (
            <button
              onClick={onOpenVolunteerManagement}
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-800" />
              <span>Volunteers Roster</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* INTERNAL VOLUNTEER WORKBENCH NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200 flex items-center gap-1 overflow-x-auto">
        
        <button
          onClick={() => setActiveInternalTab('verify')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer ${
            activeInternalTab === 'verify'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>UPI Verification</span>
          {pendingDonations.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
              activeInternalTab === 'verify' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              {pendingDonations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveInternalTab('directEntry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer ${
            activeInternalTab === 'directEntry'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-amber-950 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 font-bold'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-amber-600" />
          <span>📝 Direct Counter Entry (Pre-Verified)</span>
        </button>

        <button
          onClick={() => setActiveInternalTab('detailedDashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer ${
            activeInternalTab === 'detailedDashboard'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Detailed Dashboard</span>
        </button>

        <button
          onClick={() => setActiveInternalTab('liveSheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer ${
            activeInternalTab === 'liveSheet'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Live Sheet</span>
        </button>

        <button
          onClick={() => setActiveInternalTab('emailConfig')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer ${
            activeInternalTab === 'emailConfig'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Config</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </button>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 0: DIRECT OVER-THE-COUNTER DONATION ENTRY (VOLUNTEER) */}
      {/* ------------------------------------------------------------- */}
      {activeInternalTab === 'directEntry' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 font-serif">
                    Direct Mandap Counter Donation Entry
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                    Instant Verified Receipt
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Recorded directly by volunteer <strong>{currentVolunteer.volunteerName} ({currentVolunteer.volunteerCode})</strong>. No secondary PIN authentication needed.
                </p>
              </div>

              <div className="text-xs px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
                <span>Auto-signed by: {currentVolunteer.volunteerCode}</span>
              </div>
            </div>

            {/* Success Message Banner */}
            {directSuccessDonation && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900">
                        Contribution Successfully Recorded &amp; Marked Paid!
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Receipt generated for <strong>{directSuccessDonation.donorName}</strong> (₹{directSuccessDonation.amount.toLocaleString('en-IN')}) • ID: <span className="font-mono font-bold">{directSuccessDonation.donationId}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDirectSuccessDonation(null)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => onViewReceipt(directSuccessDonation)}
                    className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>View / Print 80G Tax Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectSuccessDonation(null)}
                    className="px-4 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition cursor-pointer"
                  >
                    <span>+ Record Another Devotee</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleDirectDonationSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Devotee Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Devotee / Contributor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra Patel"
                    value={directDonorName}
                    onChange={e => setDirectDonorName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-semibold text-slate-900 bg-slate-50"
                  />
                </div>

                {/* Devotee Email ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Devotee Email ID (for 80G digital receipt)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. devotee@gmail.com"
                    value={directEmail}
                    onChange={e => setDirectEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-semibold text-slate-900 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Seva Category & Seva Head Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Puja / Seva Category
                  </label>
                  <select
                    value={directSelectedCategory}
                    onChange={e => handleDirectCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-bold text-slate-900 bg-slate-50"
                  >
                    {SEVA_CATEGORIES.map(cat => (
                      <option key={cat.category} value={cat.category}>
                        {cat.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Specific Seva Head
                  </label>
                  <select
                    value={directSelectedSeva}
                    onChange={e => {
                      setDirectSelectedSeva(e.target.value);
                      const currentCat = SEVA_CATEGORIES.find(c => c.category === directSelectedCategory);
                      const it = currentCat?.items.find(i => i.id === e.target.value);
                      if (it) setDirectAmount(it.amount);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-sm font-bold text-slate-900 bg-slate-50"
                  >
                    {SEVA_CATEGORIES.find(c => c.category === directSelectedCategory)?.items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name} (₹{it.amount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Seva Head optional override */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom Seva Head Name (Optional Override)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Mahaprasad Seva / Anna Dana"
                  value={directCustomHead}
                  onChange={e => setDirectCustomHead(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-xs font-medium text-slate-900 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Offering Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Offering Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                      ₹
                    </div>
                    <input
                      type="number"
                      min={1}
                      required
                      value={directAmount}
                      onChange={e => setDirectAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-lg font-black font-mono text-slate-900 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Payment Mode (Cash vs UPI) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Received As (Payment Mode)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectPaymentMode('Cash')}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        directPaymentMode === 'Cash'
                          ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash Received</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDirectPaymentMode('UPI')}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        directPaymentMode === 'UPI'
                          ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>UPI Received</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingDirect || !directDonorName.trim() || directAmount <= 0}
                  className="w-full py-4 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md shadow-amber-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDirect ? (
                    <span>Recording Contribution &amp; Generating Receipt...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Record {directPaymentMode} Offering (Instant 80G Receipt)</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 1: UPI CONFIRMATION & VERIFICATION WORKBENCH */}
      {/* ------------------------------------------------------------- */}
      {activeInternalTab === 'verify' && (
        <div className="space-y-6">
          {/* Real-time Live Alert Banner for Incoming Devotee Payments */}
          {pendingDonations.length > 0 && (
            <div className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-orange-950/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-white animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-md">
                      Live Offering Alert ({pendingDonations.length} Pending)
                    </span>
                    <button
                      onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                      className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
                    >
                      {soundAlertEnabled ? '🔔 Chime On' : '🔕 Chime Off'}
                    </button>
                  </div>
                  <div className="font-black text-base sm:text-lg mt-0.5">
                    {pendingDonations[0].donorName} • ₹{pendingDonations[0].amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-amber-100 font-medium">
                    {pendingDonations[0].sevaHead} ({pendingDonations[0].paymentMode}) • Verification PIN: <strong className="font-mono text-white tracking-wider text-sm bg-black/20 px-2 py-0.5 rounded">{pendingDonations[0].confirmationCode}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setInputCode(pendingDonations[0].confirmationCode);
                    executeVerification(pendingDonations[0].confirmationCode);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1-Click Verify Code ({pendingDonations[0].confirmationCode})</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Code Entry & Approval (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-serif">
                  Confirm Devotee Contribution (UPI / Cash)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit confirmation PIN provided by the devotee after receiving the cash offering or verifying UPI bank credit.
                </p>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Devotee 6-Digit Verification PIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 482731"
                      value={inputCode}
                      onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-amber-700 focus:outline-hidden text-2xl sm:text-3xl font-black font-mono tracking-widest text-center text-slate-900 bg-slate-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || inputCode.length !== 6}
                  className="w-full py-4 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md shadow-amber-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? (
                    <span>Verifying Code in Database...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Verify &amp; Issue Official Receipt</span>
                    </>
                  )}
                </button>
              </form>

              {/* Verification Result Notification */}
              {verifyResult && (
                <div className={`p-5 rounded-2xl border ${
                  verifyResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                } space-y-3`}>
                  <div className="flex items-start gap-2.5">
                    {verifyResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {verifyResult.success ? 'Payment Verified & Marked Paid!' : 'Verification Failed'}
                      </h4>
                      <p className="text-xs mt-0.5">
                        {verifyResult.success
                          ? `Donation record updated. Official digital receipt generated for ${verifyResult.donation?.donorName}.`
                          : verifyResult.error}
                      </p>
                    </div>
                  </div>

                  {verifyResult.success && verifyResult.donation && (
                    <div className="bg-white/80 rounded-xl p-3 text-xs space-y-1.5 border border-emerald-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Donation ID:</span>
                        <span className="font-mono font-bold text-slate-800">{verifyResult.donation.donationId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Devotee:</span>
                        <span className="font-bold text-slate-800">{verifyResult.donation.donorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Seva Head:</span>
                        <span className="font-bold text-slate-800">{verifyResult.donation.sevaHead}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-black text-amber-900">₹{verifyResult.donation.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Receipt Email:</span>
                        <span className="font-mono text-slate-700">{verifyResult.donation.email}</span>
                      </div>

                      <div className="pt-2 flex items-center justify-end">
                        <button
                          onClick={() => onViewReceipt(verifyResult.donation!)}
                          className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View / Print Receipt</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Quick Helper for Mandap testing */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                <span>Pending Devotee Codes in Queue:</span>
              </div>
              {pendingDonations.length === 0 ? (
                <p className="text-slate-400 italic">No pending UPI contributions waiting for verification.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pendingDonations.map(d => (
                    <button
                      key={d.donationId}
                      onClick={() => setInputCode(d.confirmationCode)}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-bold font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>{d.confirmationCode}</span>
                      <span className="text-[10px] text-slate-500 font-sans font-normal">({d.donorName.slice(0, 14)}...)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Pending Queue & Recent Activity (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Pending Queue List with Filter */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>Pending Verification Queue</span>
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black inline-flex items-center justify-center">
                      {pendingDonations.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">{pendingDonations.length} offerings awaiting confirmation</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {onRefreshFromGoogleSheet && (
                    <button
                      type="button"
                      onClick={handleQueueRefresh}
                      disabled={isRefreshingQueue}
                      title="Sync / Refresh pending codes from Google Sheet"
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingQueue ? 'animate-spin text-amber-800' : ''}`} />
                      <span>{isRefreshingQueue ? 'Syncing...' : 'Sync Sheet'}</span>
                    </button>
                  )}
                </div>
              </div>

              {refreshQueueMsg && (
                <div className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-medium animate-fadeIn">
                  {refreshQueueMsg}
                </div>
              )}

              {/* Filter Input for Queue */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name, email, or code..."
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-amber-700"
                />
              </div>

              {pendingDonations.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs space-y-1">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No matching pending donations in queue.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {pendingDonations.map(item => (
                    <div 
                      key={item.donationId}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/50 transition text-xs space-y-2 group shadow-2xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{item.donorName}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-bold uppercase ${
                              item.paymentMode === 'Cash' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {item.paymentMode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Towards: {item.sevaHead || 'General Seva'}
                          </div>
                        </div>
                        <span className="font-black text-amber-950 font-mono text-sm">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-mono text-[10px]">PIN:</span>
                          <span className="font-mono font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded tracking-widest text-xs">
                            {item.confirmationCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInputCode(item.confirmationCode)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-semibold transition cursor-pointer"
                          >
                            Fill PIN
                          </button>

                          <button
                            type="button"
                            onClick={() => executeVerification(item.confirmationCode)}
                            className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 text-amber-200" />
                            <span>Verify Now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Verifications */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Recent Verifications
                </h3>
              </div>

              <div className="space-y-2">
                {donations.filter(d => d.paymentStatus === 'Paid').slice(0, 4).map(d => (
                  <div key={d.donationId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800">{d.donorName}</div>
                      <div className="text-[10px] text-slate-400">{d.paymentMode} • {d.confirmedBy || 'Verified'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-700 font-mono">₹{d.amount.toLocaleString('en-IN')}</div>
                      <button
                        onClick={() => onViewReceipt(d)}
                        className="text-[10px] text-amber-800 hover:underline font-semibold cursor-pointer"
                      >
                        Receipt →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 2: DETAILED DASHBOARD (INSIDE VOLUNTEER AUTH) */}
      {/* ------------------------------------------------------------- */}
      {activeInternalTab === 'detailedDashboard' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                <strong>Detailed Collections &amp; Audit Analytics:</strong> Real-time breakdown by Cash vs UPI, volunteer collection performance, date intervals, and CSV exports.
              </span>
            </div>
            {onOpenVolunteerManagement && (
              <button
                onClick={onOpenVolunteerManagement}
                className="font-bold text-amber-900 hover:underline shrink-0 cursor-pointer"
              >
                Volunteer Roster →
              </button>
            )}
          </div>

          <CollectionsDashboard
            donations={donations}
            volunteers={volunteers}
            trustConfig={trustConfig}
            onViewReceipt={onViewReceipt}
            onOpenVolunteerManagement={onOpenVolunteerManagement || (() => {})}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 3: LIVE SHEET (INSIDE VOLUNTEER AUTH) */}
      {/* ------------------------------------------------------------- */}
      {activeInternalTab === 'liveSheet' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                <strong>Live Google Sheet Master Ledger:</strong> Direct inline payment confirmations, volunteer filtering, full transaction search, and receipt downloads.
              </span>
            </div>
          </div>

          <GoogleSheetView
            donations={donations}
            volunteers={volunteers}
            onViewReceipt={onViewReceipt}
            onConfirmDonation={onConfirmDonationFromSheet || (() => {})}
            onOpenVolunteerManagement={onOpenVolunteerManagement}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 4: EMAIL CONFIG (INSIDE VOLUNTEER AUTH) */}
      {/* ------------------------------------------------------------- */}
      {activeInternalTab === 'emailConfig' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                <strong>Gmail Sender &amp; Email Dispatch Configuration:</strong> Authenticate Google OAuth / App Password to dispatch all donor receipts from your configured Gmail address.
              </span>
            </div>
          </div>

          <EmailConfigView
            trustConfig={trustConfig}
            onUpdateTrustConfig={onUpdateTrustConfig || (() => {})}
            recentDonations={donations}
            onViewReceipt={onViewReceipt}
          />
        </div>
      )}

    </div>
  );
}
