import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Tv, 
  Maximize2, 
  Minimize2, 
  HandHeart, 
  Building2, 
  QrCode, 
  ShieldCheck, 
  Flame, 
  Award, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Activity, 
  Layers, 
  TrendingUp,
  Table
} from 'lucide-react';
import { DonationRecord, TrustConfig } from '../types';
import { SEVA_CATEGORIES } from '../data/mockData';
import { TrustLogo } from './TrustLogo';
import { MaaDurgaWatermark } from './MaaDurgaWatermark';

interface PublicDisplayDashboardProps {
  donations: DonationRecord[];
  trustConfig: TrustConfig;
  onOpenDonorForm: () => void;
  onOpenVolunteerLogin: () => void;
}

export function PublicDisplayDashboard({
  donations,
  trustConfig,
  onOpenDonorForm,
  onOpenVolunteerLogin
}: PublicDisplayDashboardProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock ticker for live public display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen toggle handler
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullScreen(false);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 1. OVERALL METRICS & TYPE-WISE COLLECTIONS (PAID ONLY)
  // ---------------------------------------------------------------------------
  const paidDonations = useMemo(() => {
    return donations.filter(d => d.paymentStatus === 'Paid');
  }, [donations]);

  const grandTotalAmount = paidDonations.reduce((sum, d) => sum + d.amount, 0);
  const grandTotalCount = paidDonations.length;

  // Payment Type Breakdown (UPI vs Cash vs NEFT/Other)
  const paymentTypeStats = useMemo(() => {
    const upiDonations = paidDonations.filter(d => d.paymentMode?.toUpperCase() === 'UPI');
    const cashDonations = paidDonations.filter(d => d.paymentMode?.toUpperCase() === 'CASH');
    const otherDonations = paidDonations.filter(
      d => d.paymentMode?.toUpperCase() !== 'UPI' && d.paymentMode?.toUpperCase() !== 'CASH'
    );

    const upiTotal = upiDonations.reduce((sum, d) => sum + d.amount, 0);
    const cashTotal = cashDonations.reduce((sum, d) => sum + d.amount, 0);
    const otherTotal = otherDonations.reduce((sum, d) => sum + d.amount, 0);

    return [
      {
        type: 'UPI (Online / QR)',
        amount: upiTotal,
        count: upiDonations.length,
        percent: grandTotalAmount > 0 ? Math.round((upiTotal / grandTotalAmount) * 100) : 0,
        color: '#d97706', // amber
        icon: CreditCard
      },
      {
        type: 'Cash Counter',
        amount: cashTotal,
        count: cashDonations.length,
        percent: grandTotalAmount > 0 ? Math.round((cashTotal / grandTotalAmount) * 100) : 0,
        color: '#059669', // emerald
        icon: Banknote
      },
      ...(otherTotal > 0 ? [{
        type: 'Bank Transfer / NEFT',
        amount: otherTotal,
        count: otherDonations.length,
        percent: grandTotalAmount > 0 ? Math.round((otherTotal / grandTotalAmount) * 100) : 0,
        color: '#4f46e5', // indigo
        icon: Building2
      }] : [])
    ];
  }, [paidDonations, grandTotalAmount]);

  // ---------------------------------------------------------------------------
  // 2. DAY-WISE CONSOLIDATED COLLECTIONS SUMMARY (STRICTLY AGGREGATE - NO NAMES)
  // ---------------------------------------------------------------------------
  const dayWiseCollections = useMemo(() => {
    // Map grouped by Date string YYYY-MM-DD
    const dateMap = new Map<string, {
      dateKey: string;
      dateFormatted: string;
      dayName: string;
      count: number;
      totalAmount: number;
      upiAmount: number;
      cashAmount: number;
      otherAmount: number;
    }>();

    paidDonations.forEach(d => {
      const rawDate = d.submittedAt || d.createdAt || new Date().toISOString();
      const dateKey = rawDate.slice(0, 10);
      const dateObj = new Date(rawDate);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey,
          dateFormatted: dateObj.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          dayName: dateObj.toLocaleDateString('en-IN', { weekday: 'short' }),
          count: 0,
          totalAmount: 0,
          upiAmount: 0,
          cashAmount: 0,
          otherAmount: 0
        });
      }

      const entry = dateMap.get(dateKey)!;
      entry.count += 1;
      entry.totalAmount += d.amount;

      if (d.paymentMode?.toUpperCase() === 'UPI') {
        entry.upiAmount += d.amount;
      } else if (d.paymentMode?.toUpperCase() === 'CASH') {
        entry.cashAmount += d.amount;
      } else {
        entry.otherAmount += d.amount;
      }
    });

    // Sort descending by date
    return Array.from(dateMap.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [paidDonations]);

  // Overall Seva Categories Distribution
  const categoryStats = useMemo(() => {
    return SEVA_CATEGORIES.map(cat => {
      const matching = paidDonations.filter(
        d => d.sevaCategory === cat.category || (d.sevaHead && d.sevaHead.includes(cat.category))
      );
      const amount = matching.reduce((sum, d) => sum + d.amount, 0);
      const count = matching.length;
      return {
        category: cat.category,
        amount,
        count,
        percent: grandTotalAmount > 0 ? Math.round((amount / grandTotalAmount) * 100) : 0
      };
    });
  }, [paidDonations, grandTotalAmount]);

  // Target Seva Goal for Mandap / Hall display (e.g. 5,00,000)
  const targetGoal = 500000;
  const goalPercentage = Math.min(100, Math.round((grandTotalAmount / targetGoal) * 100));

  return (
    <div className={`space-y-6 relative transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 text-white p-6 sm:p-10 overflow-y-auto' : ''}`}>
      
      {/* Background Watermark for Temple Sanctity */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 z-0 overflow-hidden">
        <MaaDurgaWatermark opacity={0.07} size="full" />
      </div>

      <div className="relative z-10 space-y-6">

        {/* Top Header Strip with Live Clock & Public Kiosk Mode Button */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white rounded-3xl p-6 shadow-xl border border-amber-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white p-1 shadow-md border-2 border-amber-400 shrink-0">
              <TrustLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Public Display Board</span>
                </span>
                <span className="text-amber-200/80 text-xs font-mono">
                  Regd: {trustConfig.regdNo}
                </span>
                <span className="text-emerald-300 text-xs font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Privacy-Safe (No Names Displayed)</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white mt-0.5">
                {trustConfig.name}
              </h1>
              <p className="text-xs text-amber-200/90 font-medium">
                Consolidated Puja Seva Collections, Payment Types &amp; Day-Wise Summary
              </p>
            </div>
          </div>

          {/* Action Controls & Live Clock */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase font-bold text-amber-300/80">Live Mandap Clock</div>
              <div className="font-mono font-bold text-sm text-white">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            <button
              onClick={toggleFullScreen}
              className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Toggle TV / Kiosk Fullscreen Mode"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-300" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-amber-300" />
                  <span>Kiosk / TV Mode</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenDonorForm}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-950/40"
            >
              <HandHeart className="w-4 h-4" />
              <span>Donate Online</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 1: GRAND TOTAL (7 COLS) + DIRECT MANDAP QR SCAN & PAY (5 COLS)         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Grand Total Card (7 Cols) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-700" />
                  <span>Total Cumulative Seva Collections</span>
                </span>
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live Automated Ledger</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
                  <span className="text-amber-800 text-3xl sm:text-4xl font-serif">₹</span>
                  <span>{grandTotalAmount.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Consolidated total collections across verified UPI QR &amp; Cash Counter offerings.
                </p>
              </div>
            </div>

            {/* Campaign Target Progress Bar */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 relative z-10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-800" />
                  <span>Puja, Anna Dana &amp; Mandap Seva Target</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{grandTotalAmount.toLocaleString('en-IN')} / ₹{targetGoal.toLocaleString('en-IN')} ({goalPercentage}%)
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 h-full rounded-full transition-all duration-1000 shadow-xs"
                  style={{ width: `${goalPercentage}%` }}
                />
              </div>
            </div>

            {/* Type-wise Stats Row (UPI vs Cash vs Total Count) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 relative z-10">
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-900 uppercase">Total Offerings</span>
                  <Activity className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                  {grandTotalCount}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Receipts issued</div>
              </div>

              {paymentTypeStats.map((p, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{p.type}</span>
                    <p.icon className="w-3.5 h-3.5 text-amber-800" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">{p.count} offerings ({p.percent}%)</div>
                </div>
              ))}
            </div>

          </div>

          {/* Scan & Pay Direct QR Card (5 Cols) */}
          <div className="md:col-span-5 bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-amber-800 flex flex-col items-center justify-between text-center space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>Devotee Scan &amp; Pay</span>
              </div>
              <h3 className="text-lg font-black font-serif text-white">Direct Mandap UPI QR</h3>
              <p className="text-xs text-amber-200/80">Scan with GPay, PhonePe, Paytm, BHIM</p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-amber-200/40 text-slate-900 flex flex-col items-center justify-center">
              <div className="w-36 h-36 sm:w-40 sm:h-40 bg-slate-900 rounded-2xl p-2.5 flex items-center justify-center shadow-inner relative">
                <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                  <path d="M0 0h30v30H0zm5 5v20h20V5zm5 5h10v10H10zM70 0h30v30H70zm5 5v20h20V5zm5 5h10v10H80zM0 70h30v30H0zm5 5v20h20V5zm5 5h10v10H10zM40 10h10v10H40zm10 10h10v10H50zm-10 10h10v10H40zm30 10h10v10H70zm10 10h10v10H80zm-40 20h10v10H40zm10 10h10v10H50zm10-10h10v10H60zm10 10h10v10H70zm10 0h10v10H80zm0 10h10v10H80zm-10 10h10v10H70z" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-800 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md">
                    SJST
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="font-mono font-bold text-xs text-amber-950 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  {trustConfig.upiId}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-amber-200/80 space-y-1">
              <div>Beneficiary: <strong>{trustConfig.name}</strong></div>
              <div className="font-mono text-[10px]">SBI A/c: {trustConfig.accountNo} • IFSC: {trustConfig.ifsc}</div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ROW 2: DAY-WISE COLLECTIONS SUMMARY (AGGREGATE TABLE - ZERO NAMES)         */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-800" />
                  <span>Day-Wise Collections Ledger</span>
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Anonymous Aggregate Metrics</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-serif">
                Day-Wise &amp; Type-Wise Collections Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Daily summary of total devotee offerings, UPI collections, and cash receipts. No donor names displayed.
              </p>
            </div>

            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 shrink-0">
              Total Recorded Days: <span className="font-mono text-slate-900">{dayWiseCollections.length}</span>
            </div>
          </div>

          {/* Day-Wise Summary Table */}
          {dayWiseCollections.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Activity className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No verified offerings recorded yet</p>
              <p className="text-xs text-slate-500">Offerings will automatically populate here as receipts are issued.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-950 text-white font-serif text-[11px] uppercase tracking-wider">
                    <th className="p-3.5 rounded-l-xl">Date / Day</th>
                    <th className="p-3.5 text-center">Offerings Count</th>
                    <th className="p-3.5 text-right">UPI Collections (₹)</th>
                    <th className="p-3.5 text-right">Cash Collections (₹)</th>
                    <th className="p-3.5 text-right rounded-r-xl font-black">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayWiseCollections.map((day, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-amber-50/50 transition font-sans"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm">
                          {day.dateFormatted}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {day.dayName}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {day.count} {day.count === 1 ? 'offering' : 'offerings'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-900">
                        ₹{day.upiAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                        ₹{day.cashAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-950 text-sm bg-amber-50/40">
                        ₹{day.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-100/80 font-bold border-t-2 border-amber-900/30 text-amber-950">
                    <td className="p-3.5 rounded-l-xl font-serif text-sm">
                      Consolidated Total
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {grandTotalCount} offerings
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">
                      ₹{dayWiseCollections.reduce((sum, d) => sum + d.upiAmount, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">
                      ₹{dayWiseCollections.reduce((sum, d) => sum + d.cashAmount, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-base rounded-r-xl text-amber-950">
                      ₹{grandTotalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: CUMULATIVE SEVA CATEGORIES ALLOCATION BREAKDOWN                     */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-800" />
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                  Cumulative Seva Head Allocation Breakdown
                </h3>
                <p className="text-xs text-slate-500">Transparent distribution across all Puja &amp; Seva categories</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
              {categoryStats.length} Seva Categories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryStats.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900 text-sm">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-950 text-sm">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                      {item.percent}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-800 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, item.percent)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex justify-between">
                  <span>{item.count} devotee offerings</span>
                  <span>Category Target Allocation</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparency & Bank Footnote */}
        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              <strong>100% Temple Transparency:</strong> All devotee contributions are strictly categorized by Seva Head and account-credited with instant 80G tax exemption receipts.
            </span>
          </div>
          <div className="font-mono text-[11px] text-amber-900 shrink-0">
            SBI Thane A/c: {trustConfig.accountNo} • IFSC: {trustConfig.ifsc}
          </div>
        </div>

      </div>

    </div>
  );
}
