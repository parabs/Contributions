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
import { TRUST_CONFIG, INITIAL_DONATIONS, INITIAL_VOLUNTEERS } from './data/mockData';
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
import { syncDonationToGoogleSheet, fetchDonationsFromGoogleSheet, TARGET_SPREADSHEET_ID } from './services/googleSheetsService';
import { uploadReceiptToGoogleDrive } from './services/googleDriveService';

export default function App() {
  const [trustConfig, setTrustConfig] = useState<TrustConfig>(() => {
    const saved = localStorage.getItem('sjst_trust_config');
    return saved ? JSON.parse(saved) : TRUST_CONFIG;
  });

  const [donations, setDonations] = useState<DonationRecord[]>(() => {
    const saved = localStorage.getItem('sjst_donations');
    return saved ? JSON.parse(saved) : INITIAL_DONATIONS;
  });

  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>(() => {
    const saved = localStorage.getItem('sjst_volunteers');
    return saved ? JSON.parse(saved) : INITIAL_VOLUNTEERS;
  });

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

  React.useEffect(() => {
    localStorage.setItem('sjst_volunteers', JSON.stringify(volunteers));
  }, [volunteers]);

  React.useEffect(() => {
    localStorage.setItem('sjst_trust_config', JSON.stringify(trustConfig));
  }, [trustConfig]);
  
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
  // DEVOTEE / DONOR SUBMISSION HANDLER
  // ----------------------------------------------------
  const handleDonorSubmit = async (formData: {
    donorName: string;
    email: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI';
    sevaCategory: string;
    sevaHead: string;
  }): Promise<DonationRecord> => {
    // Generate IDs: SJST-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(donations.length + 1).padStart(4, '0');
    const donationId = `SJST-${dateStr}-${seq}`;
    
    // 6-digit confirmation code generated for both Cash and UPI
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
    // Trigger Google Sheets sync in background (dispatches to Google Apps Script Webhook + Sheets API)
    syncDonationToGoogleSheet(newRecord, googleAccessToken).catch(err => {
      console.warn('Initial Google Sheet sync warning:', err);
    });
    return newRecord;
  };

  // ----------------------------------------------------
  // VOLUNTEER DIRECT DONATION ENTRY (OVER-THE-COUNTER / INSTANT PAID)
  // ----------------------------------------------------
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

    // Google Drive upload if OAuth available
    if (googleAccessToken) {
      try {
        const driveRes = await uploadReceiptToGoogleDrive(newRecord, trustConfig, googleAccessToken);
        if (driveRes.success && driveRes.webViewLink) {
          newRecord.receiptUrl = driveRes.webViewLink;
        }
      } catch (driveErr) {
        console.warn('Google Drive receipt upload warning:', driveErr);
      }
    }

    // Direct Gmail dispatch if connected and devotee has email
    if (formData.email && isGmailAuthenticated) {
      try {
        const sendResult = await sendDonationReceipt(newRecord, trustConfig);
        if (sendResult.success) {
          newRecord.emailStatus = 'Sent';
          newRecord.emailMessageId = sendResult.messageId || '';
        }
      } catch (emailErr) {
        console.warn('Direct entry email dispatch warning:', emailErr);
      }
    }

    setDonations(prev => [newRecord, ...prev]);

    // Sync immediately to Google Sheet (marked Paid with volunteer details)
    syncDonationToGoogleSheet(newRecord, googleAccessToken).catch(err => {
      console.warn('Direct Volunteer Entry Google Sheet sync warning:', err);
    });

    return newRecord;
  };

  // ----------------------------------------------------
  // VOLUNTEER VERIFICATION HANDLER (BY PIN / CODE FOR CASH & UPI)
  // ----------------------------------------------------
  const handleVolunteerVerify = async (
    confirmationCode: string,
    volunteerName: string
  ): Promise<{ success: boolean; donation?: DonationRecord; error?: string }> => {
    const cleanCode = confirmationCode.trim().toUpperCase().replace(/\s+/g, '');

    // 1. Search pending donations first by 6-digit confirmation code OR donationId
    let target = donations.find(
      d => (d.paymentStatus !== 'Paid') && (
        (d.confirmationCode && d.confirmationCode.trim().toUpperCase() === cleanCode) ||
        (d.donationId && d.donationId.trim().toUpperCase() === cleanCode) ||
        (d.donationId && d.donationId.endsWith(cleanCode))
      )
    );

    // 2. If not found in pending, check all donations in state
    if (!target) {
      target = donations.find(
        d => (d.confirmationCode && d.confirmationCode.trim().toUpperCase() === cleanCode) ||
             (d.donationId && d.donationId.trim().toUpperCase() === cleanCode) ||
             (d.donationId && d.donationId.endsWith(cleanCode))
      );
    }

    // 3. Fallback: check localStorage
    if (!target) {
      try {
        const saved = localStorage.getItem('sjst_donations');
        if (saved) {
          const list: DonationRecord[] = JSON.parse(saved);
          target = list.find(
            d => (d.paymentStatus !== 'Paid') && (
              (d.confirmationCode && d.confirmationCode.trim().toUpperCase() === cleanCode) ||
              (d.donationId && d.donationId.trim().toUpperCase() === cleanCode) ||
              (d.donationId && d.donationId.endsWith(cleanCode))
            )
          ) || list.find(
            d => (d.confirmationCode && d.confirmationCode.trim().toUpperCase() === cleanCode) ||
                 (d.donationId && d.donationId.trim().toUpperCase() === cleanCode) ||
                 (d.donationId && d.donationId.endsWith(cleanCode))
          );
        }
      } catch (e) {}
    }

    if (!target) {
      return {
        success: false,
        error: `PIN or ID "${confirmationCode}" not found in records. Please check the 6-digit PIN on the devotee's screen or select from Pending Queue.`
      };
    }

    if (target.paymentStatus === 'Paid') {
      return {
        success: true,
        donation: target,
        error: `Notice: This ${target.paymentMode} offering (${target.donationId}) was already verified by ${target.confirmedBy || 'Volunteer'}. Receipt is active below.`
      };
    }

    let emailStatus: 'Pending' | 'Sent' | 'Not Required' | 'Failed' = target.email ? 'Pending' : 'Not Required';
    let emailMessageId = '';
    let driveReceiptUrl = target.receiptUrl || `https://drive.google.com/file/d/receipt-${target.donationId}/view`;

    // 1. First, upload receipt to Google Drive if Google OAuth token is available
    if (googleAccessToken) {
      try {
        const driveRes = await uploadReceiptToGoogleDrive(target, trustConfig, googleAccessToken);
        if (driveRes.success && driveRes.webViewLink) {
          driveReceiptUrl = driveRes.webViewLink;
        }
      } catch (driveErr) {
        console.warn('Google Drive receipt upload warning:', driveErr);
      }
    }

    // 2. If target has email and Gmail is authenticated, dispatch real receipt immediately
    if (target.email && isGmailAuthenticated) {
      const candidate: DonationRecord = {
        ...target,
        paymentStatus: 'Paid',
        confirmedBy: volunteerName,
        paymentReference: target.paymentMode === 'Cash' ? 'CASH-COUNTER-VERIFIED' : (target.paymentReference || 'UPI-VERIFIED'),
        receiptUrl: driveReceiptUrl,
        updatedAt: new Date().toISOString()
      };

      try {
        const sendResult = await sendDonationReceipt(candidate, trustConfig);
        if (sendResult.success) {
          emailStatus = 'Sent';
          emailMessageId = sendResult.messageId || `msg-${Date.now()}`;
        } else {
          console.warn('Gmail API dispatch reported error:', sendResult.error);
          emailStatus = 'Failed';
        }
      } catch (e) {
        console.error('Error dispatching receipt during volunteer verification:', e);
        emailStatus = 'Failed';
      }
    } else if (target.email) {
      emailStatus = 'Pending';
    }

    // Process update to Paid & record email receipt status
    const updatedRecord: DonationRecord = {
      ...target,
      paymentStatus: 'Paid',
      confirmedBy: volunteerName,
      paymentReference: target.paymentMode === 'Cash' ? 'CASH-COUNTER-VERIFIED' : (target.paymentReference || 'UPI-VERIFIED'),
      receiptUrl: driveReceiptUrl,
      emailStatus,
      emailMessageId,
      updatedAt: new Date().toISOString()
    };

    setDonations(prev => {
      const updated = prev.map(d => (d.donationId === target.donationId ? updatedRecord : d));
      try {
        localStorage.setItem('sjst_donations', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Broadcast across windows/tabs and local component listeners
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('sjst_donations_channel');
        bc.postMessage({ type: 'DONATION_VERIFIED', donation: updatedRecord });
        bc.close();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sjst_donation_verified', { detail: updatedRecord }));
      }
    } catch (e) {}

    // Auto-sync verified confirmation to Google Sheet
    syncDonationToGoogleSheet(updatedRecord, googleAccessToken).catch(err => {
      console.warn('Google Sheet verification sync warning:', err);
    });

    return {
      success: true,
      donation: updatedRecord
    };
  };

  // ----------------------------------------------------
  // REFRESH / SYNC FROM GOOGLE SHEET
  // ----------------------------------------------------
  const handleRefreshDonationsFromGoogleSheet = async (): Promise<{ count: number; error?: string }> => {
    if (!googleAccessToken) {
      return { count: 0, error: 'Please connect Google account in the top bar to fetch directly from Google Sheet.' };
    }

    try {
      // 1. Fetch Form Responses 1 (Raw Devotee Submissions)
      const formRes = await fetchDonationsFromGoogleSheet(googleAccessToken, TARGET_SPREADSHEET_ID, 'Form Responses 1');
      // 2. Fetch Donations (Master Ledger)
      const donRes = await fetchDonationsFromGoogleSheet(googleAccessToken, TARGET_SPREADSHEET_ID, 'Donations');

      const incomingDonations = donRes.donations || [];
      const incomingFormSubmissions = formRes.donations || [];

      // Authoritative State Update:
      // Construct master records directly from live Google Sheet tabs.
      const map = new Map<string, DonationRecord>();

      // 1. Add all records from Donations master tab (authoritative master ledger)
      incomingDonations.forEach(d => map.set(d.donationId, d));

      // 2. Add pending submissions from Form Responses 1 that have an active confirmation code and are not yet marked Paid in master
      incomingFormSubmissions.forEach(f => {
        const alreadyPaid = Array.from(map.values()).some(
          d => d.paymentStatus === 'Paid' && (
            (f.confirmationCode && (d.confirmationCode === f.confirmationCode || (d.paymentReference && d.paymentReference.includes(f.confirmationCode)))) ||
            d.donationId === f.donationId
          )
        );
        if (!alreadyPaid && !map.has(f.donationId)) {
          map.set(f.donationId, f);
        }
      });

      const freshList = Array.from(map.values()).sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      setDonations(freshList);
      try {
        localStorage.setItem('sjst_donations', JSON.stringify(freshList));
      } catch (e) {}

      // Broadcast update across tabs
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('sjst_donations_channel');
          bc.postMessage({ type: 'DONATIONS_UPDATED' });
          bc.close();
        }
      } catch (e) {}

      return { 
        count: freshList.length 
      };
    } catch (e: any) {
      return { count: 0, error: e.message || 'Failed to refresh from Google Sheet' };
    }
  };

  // ----------------------------------------------------
  // LIVESHEET DIRECT PAYMENT CONFIRMATION HANDLER
  // ----------------------------------------------------
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
      } catch (driveErr) {
        console.warn('Google Drive receipt upload warning:', driveErr);
      }
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
      } catch (e) {
        console.error('Error dispatching receipt from sheet confirm:', e);
      }
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

    // Auto-sync to Google Sheet
    syncDonationToGoogleSheet(updatedRecord, googleAccessToken).catch(err => {
      console.warn('Google Sheet live sync warning:', err);
    });
  };

  // ----------------------------------------------------
  // VOLUNTEER MANAGEMENT HANDLERS (ADD, EDIT, RESET PIN)
  // ----------------------------------------------------
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

  return (
    <div className="min-h-screen bg-amber-50/30 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Sacred Divine Maa Durga Watermark behind the entire page */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
        <MaaDurgaWatermark opacity={0.06} size="full" />
      </div>
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-amber-200/60 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          
          {/* Logo & Trust Title */}
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

          {/* Navigation Tabs */}
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
              title="High-level Collection Dashboard for Public Display & Mandap screens"
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
              title="Volunteer & Management Portal (Verification, Detailed Dashboard, Live Sheet, Email Config)"
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
              title="Configure Gmail sender, OAuth credentials, and test end-to-end receipt delivery"
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
              {pendingUpiCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
            {/* Google Sheets Live Auth Status */}
            {isGmailAuthenticated ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Sheet: <strong>Connected</strong></span>
              </div>
            ) : (
              <button
                onClick={() => setActiveView('emailConfig')}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-300 font-mono text-[11px] transition cursor-pointer"
                title="Connect your Google Account to enable direct live sync to Google Sheets"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Google Sheet: <strong>Connect Account</strong></span>
              </button>
            )}

            <button
              onClick={() => setActiveView('volunteer')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] border border-slate-700 transition cursor-pointer"
              title="Access Volunteer Portal & Email Config"
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
        
        {/* VIEW 1: DEVOTEE FORM (index.html) */}
        {activeView === 'donor' && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <strong>Devotee View Simulation:</strong> Select specific Seva Head, submit <strong>Cash</strong> (immediate verified receipt) or <strong>UPI</strong> (generates 6-digit confirmation code for volunteer verification). Official receipt is delivered to devotee email.
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

        {/* VIEW 2: PUBLIC DISPLAY DASHBOARD */}
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

        {/* VIEW 3: VOLUNTEER & MANAGEMENT PORTAL (AUTHENTICATED) */}
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
              onRefreshFromGoogleSheet={handleRefreshDonationsFromGoogleSheet}
              onUpdateTrustConfig={upd => setTrustConfig(prev => ({ ...prev, ...upd }))}
              onOpenVolunteerManagement={() => setIsVolunteerManagementOpen(true)}
            />
          </div>
        )}

        {/* VIEW 4: EMAIL DISPATCH & SENDER CONFIGURATION */}
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

        {/* VIEW 5: CODE & DEPLOY ARTIFACTS */}
        {activeView === 'code' && (
          <CodeArtifacts />
        )}

      </main>

      {/* FOOTNOTE AS REQUESTED */}
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

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Let’s not just build another website or software. <br className="hidden sm:inline" />
            Let’s build smarter processes, practical solutions and measurable business outcomes.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-bold text-amber-400">
            <a 
              href="tel:9892805337" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>📱 9892805337</span>
            </a>
            <a 
              href="https://wa.me/919892805337?text=Hi%20Sachin,%20I%20am%20interested%20in%20a%20digital%20donation%20solution%20for%20our%20organization." 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Us</span>
            </a>
          </div>

          <div className="pt-4 text-[11px] text-slate-500">
            © {new Date().getFullYear()} Shree Jagannath Seva Trust, Thane • Autonomous Live Integration
          </div>

        </div>
      </footer>

      {/* MODAL: OFFICIAL DIGITAL RECEIPT */}
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

      {/* MODAL: VOLUNTEER MANAGEMENT (ADD, EDIT, RESET PIN) */}
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
