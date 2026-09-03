import React, { useState } from 'react';
import { 
  Users, 
  HandHeart, 
  Table, 
  Code2, 
  ShieldCheck, 
  Sparkles, 
  Info,
  ExternalLink,
  ChevronRight,
  Receipt,
  Building2,
  Mail,
  BarChart3,
  Phone,
  MessageSquare
} from 'lucide-react';

import { DonationRecord, VolunteerRecord, TrustConfig } from './types';
import { TRUST_CONFIG, INITIAL_VOLUNTEERS } from './data/mockData';
import { DonorForm } from './components/DonorForm';
import { VolunteerPortal } from './components/VolunteerPortal';
import { GoogleSheetView } from './components/GoogleSheetView';
import { CollectionsDashboard } from './components/CollectionsDashboard';
import { VolunteerManagementModal } from './components/VolunteerManagementModal';
import { CodeArtifacts } from './components/CodeArtifacts';
import { ReceiptModal } from './components/ReceiptModal';
import { EmailConfigView } from './components/EmailConfigView';
import { PublicDisplayDashboard } from './components/PublicDisplayDashboard';
import { TrustLogo } from './components/TrustLogo';
import { MaaDurgaWatermark } from './components/MaaDurgaWatermark';
import { useGmailAuth } from './context/GmailAuthContext';
import { syncDonationToGoogleSheet, fetchDonationsFromGoogleSheet, TARGET_SPREADSHEET_ID, TARGET_WEBHOOK_URL } from './services/googleSheetsService';
import { uploadReceiptToGoogleDrive } from './services/googleDriveService';
export default function App() {
const [trustConfig, setTrustConfig] = useState<TrustConfig>(() => {
      const saved = localStorage.getItem('sjst_trust_config');
      return saved ? JSON.parse(saved) : {
        name: 'Shree Jagannath Seva Trust',
        tagline: 'Devotion & Service',
        email: 'info@sjst.org',
        phone: '',
        address: '',
        upiId: '',
        gstin: '',
        trustRegNo: ''
      };
    });


  const [donations, setDonations] = useState<DonationRecord[]>(() => {
    // Return empty array to prevent loading old test cache
    return [];
  });

  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>(() => {
    const saved = localStorage.getItem('sjst_volunteers');
    return saved ? JSON.parse(saved) : INITIAL_VOLUNTEERS;
  });

  // Real Google & Gmail Auth Context
  const { isAuthenticated: isGmailAuthenticated, accessToken: googleAccessToken, sendDonationReceipt } = useGmailAuth();

  // Navigation: Public Devotee Form, Public Display Dashboard, Authenticated Volunteer/Admin Portal, Email & Receipts Setup, Code & Setup
  const [activeView, setActiveView] = useState<'donor' | 'publicDashboard' | 'volunteer' | 'emailConfig' | 'code'>('donor');

  // Modals
  const [modalReceiptDonation, setModalReceiptDonation] = useState<DonationRecord | null>(null);
  const [isVolunteerManagementOpen, setIsVolunteerManagementOpen] = useState(false);

  // Quick statistics
  const pendingUpiCount = donations.filter(d => d.paymentMode === 'UPI' && d.paymentStatus === 'Confirmation Pending').length;
  const totalPaidCount = donations.filter(d => d.paymentStatus === 'Paid').length;
  const totalCollection = donations
    .filter(d => d.paymentStatus === 'Paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // ----------------------------------------------------
  // REFRESH / SYNC FROM GOOGLE SHEET
  // ----------------------------------------------------
  async function handleRefreshFromGoogleSheet(): Promise<{ count: number; error?: string }> {
    if (!googleAccessToken) {
      return { count: 0, error: 'Please connect Google account in the top bar to fetch directly from Google Sheet.' };
    }

    try {
      const donRes = await fetchDonationsFromGoogleSheet(googleAccessToken, TARGET_SPREADSHEET_ID, 'Donations');
      const freshList = donRes.donations || [];

      setDonations(freshList);
      try {
        localStorage.setItem('sjst_donations', JSON.stringify(freshList));
      } catch (e) {}

      return { count: freshList.length };
    } catch (e: any) {
      return { count: 0, error: e.message || 'Failed to refresh from Google Sheet' };
    }
  }

  // Cross-tab real-time sync with BroadcastChannel and storage events
  React.useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('sjst_donations_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'DONATIONS_UPDATED' || event.data?.type === 'DONATION_VERIFIED' || event.data?.type === 'DONATION_SUBMITTED') {
            const saved = localStorage.getItem('sjst_donations');
            if (saved) {
              try {
                setDonations(JSON.parse(saved));
              } catch (e) {}
            }
          }
        };
      }
    } catch (e) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sjst_donations' && e.newValue) {
        try {
          setDonations(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  // Persist state changes to localStorage and broadcast
  React.useEffect(() => {
    localStorage.setItem('sjst_donations', JSON.stringify(donations));
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('sjst_donations_channel');
        channel.postMessage({ type: 'DONATIONS_UPDATED', count: donations.length, timestamp: Date.now() });
        channel.close();
      }
    } catch (e) {}
  }, [donations]);

  // Automatically pull live rows from the single master Donations sheet on load if authenticated
  React.useEffect(() => {
    if (googleAccessToken) {
      handleRefreshFromGoogleSheet();
    }
  }, [googleAccessToken]);
  

  React.useEffect(() => {
    localStorage.setItem('sjst_volunteers', JSON.stringify(volunteers));
  }, [volunteers]);

  React.useEffect(() => {
    localStorage.setItem('sjst_trust_config', JSON.stringify(trustConfig));
  }, [trustConfig]);

  // DEVOTEE / DONOR SUBMISSION HANDLER
  const handleDonorSubmit = async (formData: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
  }): Promise<DonationRecord> => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(donations.length + 1).padStart(4, '0');
    const donationId = `SJST-${dateStr}-${seq}`;
    
    const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
    const paymentStatus: 'Paid' | 'Confirmation Pending' = 'Confirmation Pending';
    const confirmedBy = '';
    const receiptUrl = '';
    const emailStatus: 'Pending' | 'Sent' | 'Not Required' | 'Failed' = formData.email ? 'Pending' : 'Not Required';
    const emailMessageId = '';

    const newRecord: DonationRecord = {
      donationId,
      submittedAt: new Date().toISOString(),
      donorName: formData.donorName,
      mobile: '',
      phone: '',
      email: formData.email,
      amount: formData.amount,
      paymentMode: formData.paymentMode,
      paymentStatus,
      paymentReference: formData.paymentMode === 'Cash' ? 'CASH-PENDING-VERIFY' : '',
      receiptUrl,
      emailStatus,
      emailMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationCode,
      confirmedBy,
      sevaCategory: formData.sevaCategory,
      sevaHead: formData.sevaHead
    };

    setDonations(prev => [newRecord, ...prev]);
    syncDonationToGoogleSheet(newRecord, googleAccessToken).catch(err => {
      console.warn('Initial Google Sheet sync warning:', err);
    });
    return newRecord;
  };

  const handleVolunteerDirectDonation = async (formData: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
    volunteerName: string;
    volunteerCode: string;
  }): Promise<DonationRecord> => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(donations.length + 1).padStart(4, '0');
    const donationId = `SJST-${dateStr}-${seq}`;
    const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
    const confirmedBy = `${formData.volunteerName} (${formData.volunteerCode})`;
    const paymentStatus = 'Paid';
    const paymentReference = formData.paymentMode === 'Cash' ? 'CASH-COUNTER-DIRECT' : 'UPI-COUNTER-DIRECT';
    let driveReceiptUrl = `https://drive.google.com/file/d/receipt-${donationId}/view`;
    let emailStatus: 'Pending' | 'Sent' | 'Not Required' | 'Failed' = formData.email ? 'Pending' : 'Not Required';
    let emailMessageId = '';

    const newRecord: DonationRecord = {
      donationId,
      submittedAt: new Date().toISOString(),
      donorName: formData.donorName || 'Devotee',
      mobile: '',
      phone: '',
      email: formData.email || '',
      amount: formData.amount,
      paymentMode: formData.paymentMode,
      paymentStatus,
      paymentReference,
      receiptUrl: driveReceiptUrl,
      emailStatus,
      emailMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationCode,
      confirmedBy,
      sevaCategory: formData.sevaCategory,
      sevaHead: formData.sevaHead
    };

    if (googleAccessToken) {
      try {
        const driveRes = await uploadReceiptToGoogleDrive(newRecord, trustConfig, googleAccessToken);
        if (driveRes.success && driveRes.webViewLink) {
          newRecord.receiptUrl = driveRes.webViewLink;
        }
      } catch (driveErr) {}
    }

    if (formData.email && isGmailAuthenticated) {
      try {
        const sendResult = await sendDonationReceipt(newRecord, trustConfig);
        if (sendResult.success) {
          newRecord.emailStatus = 'Sent';
          newRecord.emailMessageId = sendResult.messageId || '';
        }
      } catch (emailErr) {}
    }

    setDonations(prev => [newRecord, ...prev]);
    syncDonationToGoogleSheet(newRecord, googleAccessToken).catch(err => {});
    return newRecord;
  };

    const handleVolunteerVerify = async (
    confirmationCode: string,
    volunteerName: string
  ): Promise<{ success: boolean; donation?: DonationRecord; error?: string }> => {
    const cleanCode = confirmationCode.trim();

    try {
      const webhookUrl = "https://script.google.com/macros/s/AKfycbwo2HwQRNS8R5Vm81jHn87QFU75_xt64hdaTJecvQfU84VAVchMwL7_JIP9EcNU2-w/exec";
      
      const response = await fetch(`https://script.google.com/macros/s/AKfycbwo2HwQRNS8R5Vm81jHn87QFU75_xt64hdaTJecvQfU84VAVchMwL7_JIP9EcNU2-w/exec?action=verifyDonation&confirmationCode=${encodeURIComponent(cleanCode)}&confirmedBy=${encodeURIComponent(volunteerName)}`, {
        method: "GET"
      });
const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || `PIN or ID "${confirmationCode}" not found in records.`
        };
      }

      const updatedRecord: DonationRecord = result.donation;

      setDonations(prev => {
        const updated = prev.some(d => d.donationId === updatedRecord.donationId)
          ? prev.map(d => (d.donationId === updatedRecord.donationId ? updatedRecord : d))
          : [updatedRecord, ...prev];
        
        try {
          localStorage.setItem("sjst_donations", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      return {
        success: true,
        donation: updatedRecord
      };

    } catch (err: any) {
      return {
        success: false,
        error: `Verification failed: ${err.message || "Server error"}`
      };
    }
    const handleVolunteerVerify = async (
    confirmationCode: string,
    volunteerName: string
  ): Promise<{ success: boolean; donation?: DonationRecord; error?: string }> => {
    const cleanCode = confirmationCode.trim();

    try {
      // Hardcoded absolute URL to prevent any undefined variable concatenation bugs
      const webhookUrl = 'https://script.google.com/macros/s/AKfycbwo2HwQRNS8R5Vm81jHn87QFU75_xt64hdaTJecvQfU84VAVchMwL7_JIP9EcNU2-w/exec';
      
      const response = await fetch(`https://script.google.com/macros/s/AKfycbwo2HwQRNS8R5Vm81jHn87QFU75_xt64hdaTJecvQfU84VAVchMwL7_JIP9EcNU2-w/exec?action=verifyDonation&confirmationCode=${encodeURIComponent(cleanCode)}&confirmedBy=${encodeURIComponent(volunteerName)}`, {
        method: 'GET'
      });
      
      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || `PIN or ID "${confirmationCode}" not found in records.`
        };
      }

      const updatedRecord: DonationRecord = result.donation;

      setDonations(prev => {
        const updated = prev.some(d => d.donationId === updatedRecord.donationId)
          ? prev.map(d => (d.donationId === updatedRecord.donationId ? updatedRecord : d))
          : [updatedRecord, ...prev];
        
        try {
          localStorage.setItem('sjst_donations', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (updatedRecord.email && isGmailAuthenticated) {
        try {
          await sendDonationReceipt(updatedRecord, trustConfig);
        } catch (e) {}
      }

      return {
        success: true,
        donation: updatedRecord
      };

    } catch (err: any) {
      return {
        success: false,
        error: `Verification failed: ${err.message || 'Server error'}`
      };
    }
  };


  const handleAddVolunteer = (newVolunteer: VolunteerRecord) => {
    setVolunteers(prev => [...prev, newVolunteer]);
  };

  const handleEditVolunteer = (updatedVolunteer: VolunteerRecord) => {
    setVolunteers(prev => prev.map(v => 
      v.volunteerCode === updatedVolunteer.volunteerCode ? updatedVolunteer : v
    ));
  };

  const handleResetPassword = (volunteerCode: string, newAuthCode: string) => {
    setVolunteers(prev => prev.map(v => {
      if (v.volunteerCode === volunteerCode) {
        return { ...v, authCode: newAuthCode };
      }
      return v;
    }));
  };

  const handleConfirmDonationFromSheet = async (donationId: string, volunteerName: string) => {
    const target = donations.find(d => d.donationId === donationId);
    if (!target) return;

    let emailStatus: 'Pending' | 'Sent' | 'Not Required' | 'Failed' = target.email ? 'Pending' : 'Not Required';
    let emailMessageId = '';
    let driveReceiptUrl = target.receiptUrl || `https://drive.google.com/file/d/receipt-${target.donationId}/view`;

    if (googleAccessToken) {
      try {
        const driveRes = await uploadReceiptToGoogleDrive(target, trustConfig, googleAccessToken);
        if (driveRes.success && driveRes.webViewLink) {
          driveReceiptUrl = driveRes.webViewLink;
        }
      } catch (driveErr) {}
    }

    if (target.email && isGmailAuthenticated) {
      const candidate: DonationRecord = {
        ...target,
        paymentStatus: 'Paid',
        confirmedBy: volunteerName,
        receiptUrl: driveReceiptUrl,
        updatedAt: new Date().toISOString()
      };

      try {
        const sendResult = await sendDonationReceipt(candidate, trustConfig);
        if (sendResult.success) {
          emailStatus = 'Sent';
          emailMessageId = sendResult.messageId || `msg-${Date.now()}`;
        }
      } catch (e) {}
    }

    const updatedRecord: DonationRecord = {
      ...target,
      paymentStatus: 'Paid',
      confirmedBy: volunteerName,
      receiptUrl: driveReceiptUrl,
      emailStatus,
      emailMessageId,
      updatedAt: new Date().toISOString()
    };

    setDonations(prev => prev.map(d => (d.donationId === donationId ? updatedRecord : d)));
    syncDonationToGoogleSheet(updatedRecord, googleAccessToken).catch(err => {});
  };

  return (
    <div className="min-h-screen bg-amber-50/30 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
        <MaaDurgaWatermark opacity={0.06} size="full" />
      </div>
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-amber-200/60 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <TrustLogo className="w-11 h-11" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base leading-none font-serif">
                  {trustConfig.name}
                </span>
                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  Regd: {trustConfig.regdNo}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Direct UPI &amp; Cash Seva Collection</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline font-mono font-semibold text-amber-900">UPI: {trustConfig.upiId}</span>
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveView('donor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                activeView === 'donor'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HandHeart className="w-4 h-4" />
              <span className="hidden sm:inline">Devotee Form</span>
              <span className="sm:hidden">Devotee</span>
            </button>

            <button
              onClick={() => setActiveView('publicDashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                activeView === 'publicDashboard'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-amber-900 bg-amber-100/70 hover:bg-amber-100 border border-amber-300/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Public Display Dashboard</span>
              <span className="sm:hidden">Public Display</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveView('volunteer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition relative shrink-0 cursor-pointer ${
                activeView === 'volunteer'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Volunteer &amp; Management Portal</span>
              <span className="sm:hidden">Volunteer Portal</span>
              {pendingUpiCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {pendingUpiCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView('emailConfig')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                activeView === 'emailConfig'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email &amp; Receipts</span>
              <span className="sm:hidden">Email</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <button
              onClick={() => setActiveView('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                activeView === 'code'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span className="hidden sm:inline">Code &amp; Setup</span>
              <span className="sm:hidden">Code</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Real-time metrics strip */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setActiveView('publicDashboard')}
              className="hover:text-amber-300 transition cursor-pointer text-left"
            >
              💰 Total Seva Collection: <strong className="text-amber-400 font-mono">₹{totalCollection.toLocaleString('en-IN')}</strong>
            </button>
            <span className="text-slate-600">|</span>
            <span>
              🧾 Receipts Issued: <strong className="text-white font-mono">{totalPaidCount}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setActiveView('volunteer')}
              className="hover:text-amber-300 transition cursor-pointer flex items-center gap-1"
            >
              <span>⏳ Pending UPI:</span>
              <strong className="text-amber-400 font-mono">{pendingUpiCount}</strong>
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
            {isGmailAuthenticated ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Sheet: <strong>Connected</strong></span>
              </div>
            ) : (
              <button
                onClick={() => setActiveView('emailConfig')}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-300 font-mono text-[11px] transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Google Sheet: <strong>Connect Account</strong></span>
              </button>
            )}

            <button
              onClick={() => setActiveView('volunteer')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] border border-slate-700 transition cursor-pointer"
            >
              <Mail className="w-3 h-3 text-amber-400" />
              <span>Sender: <strong>{trustConfig.email}</strong></span>
              <span className="text-[10px] text-emerald-400 font-sans font-bold uppercase underline ml-1">Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'donor' && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <strong>Devotee View Simulation:</strong> Select specific Seva Head, submit <strong>Cash</strong> (immediate verified receipt) or <strong>UPI</strong> (generates 6-digit confirmation code for volunteer verification).
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setActiveView('publicDashboard')}
                  className="font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                >
                  Public Display →
                </button>
                <button
                  onClick={() => setActiveView('volunteer')}
                  className="font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                >
                  Volunteer Portal →
                </button>
              </div>
            </div>

            <DonorForm
              trustConfig={trustConfig}
              donations={donations}
              volunteers={volunteers}
              onSubmitDonation={handleDonorSubmit}
              onViewReceipt={d => setModalReceiptDonation(d)}
              onVerifyDonation={async (code, volName) => {
                const res = await handleVolunteerVerify(code, volName);
                if (res.success && res.donation) {
                  setModalReceiptDonation(res.donation);
                }
                return res;
              }}
            />
          </div>
        )}

        {activeView === 'publicDashboard' && (
          <div className="space-y-6">
            <PublicDisplayDashboard
              donations={donations}
              trustConfig={trustConfig}
              onOpenDonorForm={() => setActiveView('donor')}
              onOpenVolunteerLogin={() => setActiveView('volunteer')}
            />
          </div>
        )}

        {activeView === 'volunteer' && (
          <div className="space-y-6">
            <VolunteerPortal
              volunteers={volunteers}
              donations={donations}
              trustConfig={trustConfig}
              onVerifyDonation={handleVolunteerVerify}
              onDirectDonationSubmit={handleVolunteerDirectDonation}
              onViewReceipt={d => setModalReceiptDonation(d)}
              onConfirmDonationFromSheet={handleConfirmDonationFromSheet}
              onRefreshFromGoogleSheet={handleRefreshFromGoogleSheet}
              onUpdateTrustConfig={upd => setTrustConfig(prev => ({ ...prev, ...upd }))}
              onOpenVolunteerManagement={() => setIsVolunteerManagementOpen(true)}
            />
          </div>
        )}

        {activeView === 'emailConfig' && (
          <div className="space-y-6">
            <EmailConfigView
              trustConfig={trustConfig}
              onUpdateTrustConfig={upd => setTrustConfig(prev => ({ ...prev, ...upd }))}
              recentDonations={donations}
              onViewReceipt={d => setModalReceiptDonation(d)}
            />
          </div>
        )}

        {activeView === 'code' && (
          <CodeArtifacts />
        )}
      </main>

      <footer className="mt-auto bg-slate-900 text-slate-300 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Donation Solution</span>
          </div>
          <div className="text-sm sm:text-base font-semibold text-slate-100 font-serif">
            Designed &amp; developed by <strong className="text-amber-400">Sachin Parab</strong>
          </div>
          <div className="text-sm sm:text-base font-bold text-amber-300 font-serif">
            Your Challenge. My Solution.
          </div>
          <div className="pt-4 text-[11px] text-slate-500">
            © {new Date().getFullYear()} Shree Jagannath Seva Trust, Thane • Autonomous Live Integration
          </div>
        </div>
      </footer>

      {modalReceiptDonation && (
        <ReceiptModal
          donation={modalReceiptDonation}
          trustConfig={trustConfig}
          volunteers={volunteers}
          onVerifyDonation={async (code, volName) => {
            const res = await handleVolunteerVerify(code, volName);
            if (res.success && res.donation) {
              setModalReceiptDonation(res.donation);
            }
            return res;
          }}
          onClose={() => setModalReceiptDonation(null)}
        />
      )}

      {isVolunteerManagementOpen && (
        <VolunteerManagementModal
          volunteers={volunteers}
          donations={donations}
          onAddVolunteer={handleAddVolunteer}
          onEditVolunteer={handleEditVolunteer}
          onResetPassword={handleResetPassword}
          onClose={() => setIsVolunteerManagementOpen(false)}
        />
      )}
    </div>
  );
}
}

;
