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
  Table,
  BarChart3
} from 'lucide-react';
import { DonationRecord, TrustConfig } from '../types';
import { SEVA_CATEGORIES } from '../data/mockData';
import { TrustLogo } from './TrustLogo';

interface PublicDisplayDashboardProps {
  donations: DonationRecord[];
  trustConfig: TrustConfig;
  dashboardCalculation: any[][];
  onOpenDonorForm: () => void;
  onOpenVolunteerLogin: () => void;
}

export function PublicDisplayDashboard({
  donations,
  trustConfig,
  dashboardCalculation,
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
  // 1. OVERALL METRICS - FROM CALCULATION SHEET
  // ---------------------------------------------------------------------------

  // Calculation!B4 = Total Donations
  // Calculation!B5 = Total Collection

  const grandTotalCount =
    Number(dashboardCalculation?.[3]?.[1]) || 0;

  const grandTotalAmount =
    Number(dashboardCalculation?.[4]?.[1]) || 0;

  // Keep paid donations available for legacy sections
  // until the remaining dashboard sections are migrated.
  const paidDonations = useMemo(() => {
    return donations.filter(d => d.paymentStatus === 'Paid');
  }, [donations]);
  
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

  // ---------------------------------------------------------------------------
  // DASHBOARD CALCULATION - SEVA-WISE DATA
  // ---------------------------------------------------------------------------
  const sevaDashboardData = useMemo(() => {
    if (!dashboardCalculation || dashboardCalculation.length < 16) {
      return [];
    }

    return dashboardCalculation
      .slice(10, 16)
      .filter(row => row && row[1])
      .map(row => ({
        rank: Number(row[0]) || 0,
        category: String(row[1] || ''),
        count: Number(row[2]) || 0,
        amount: Number(row[3]) || 0,
        percent: (Number(row[4]) || 0) * 100
      }));
  }, [dashboardCalculation]);

  // ---------------------------------------------------------------------------
  // DASHBOARD CALCULATION - LAST 5 AVAILABLE DONATION DATES
  // ---------------------------------------------------------------------------
  const dayDashboardData = useMemo(() => {
    if (!dashboardCalculation || dashboardCalculation.length < 27) {
      return [];
    }

    return dashboardCalculation
      .slice(22, 27)
      .filter(row => row && row[0])
      .map(row => ({
        date: String(row[0] || ''),
        amount: Number(row[1]) || 0
      }));
  }, [dashboardCalculation]);

  // Target Seva Goal for Mandap / Hall display (e.g. 5,00,000)
  const targetGoal = 500000;
  const goalPercentage = Math.min(100, Math.round((grandTotalAmount / targetGoal) * 100));

  return (
    <div className={`space-y-2 relative transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 text-white p-4 sm:p-6 overflow-y-auto' : ''}`}>

      <div className="relative z-10 space-y-2">

        {/* ========================================================================= */}
        {/* TOP ROW: TOTAL DONATIONS + DIRECT MANDAP UPI QR                           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">

          {/* ----------------------------------------------------------------------- */}
          {/* TOTAL DONATIONS                                                         */}
          {/* ----------------------------------------------------------------------- */}
          <div className="md:col-span-6 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 relative overflow-hidden h-auto md:h-[285px]">

            {/* Soft devotional glow */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-amber-100/60 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

            {/* Temple line-art watermark */}
            <div className="absolute right-3 top-3 bottom-3 w-[38%] flex items-center justify-center pointer-events-none opacity-45">
              <svg viewBox="0 0 220 320" className="w-full h-full" aria-hidden="true">
                <g fill="none" stroke="#b78a4f" strokeWidth="2">
                  <path d="M110 18 L110 4 M104 8 L116 8 M106 18 L114 18" />
                  <path d="M110 18 L86 48 L86 64 L74 82 L74 110 L58 132 L58 290 L162 290 L162 132 L146 110 L146 82 L134 64 L134 48 Z" />
                  <path d="M86 48 L134 48 M74 82 L146 82 M58 132 L162 132" />
                  <path d="M98 64 L98 290 M122 64 L122 290 M82 110 L82 290 M138 110 L138 290" />
                  <path d="M110 30 L96 54 L110 78 L124 54 Z" />
                  <path d="M92 92 L110 72 L128 92 L110 112 Z" />
                  <path d="M72 146 L88 126 L104 146 L88 166 Z M116 146 L132 126 L148 146 L132 166 Z" />
                  <path d="M70 182 L90 162 L110 182 L90 202 Z M110 182 L130 162 L150 182 L130 202 Z" />
                  <path d="M70 220 L90 200 L110 220 L90 240 Z M110 220 L130 200 L150 220 L130 240 Z" />
                  <path d="M70 258 L90 238 L110 258 L90 278 Z M110 258 L130 238 L150 258 L130 278 Z" />
                  <path d="M96 290 L96 252 L124 252 L124 290 Z" />
                  <path d="M110 4 L110 0" />
                </g>
                <path d="M84 236 Q110 216 136 236" fill="none" stroke="#b78a4f" strokeWidth="2" />
              </svg>
            </div>

            <div className="relative z-10 max-w-[62%] h-full flex flex-col justify-start">

              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 w-fit">
                <Flame className="w-4 h-4 text-amber-700" />
                Total Donations
              </span>

              <div className="mt-3">
                <div className="text-4xl sm:text-7xl lg:text-5xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
                  <span className="text-amber-800 text-4xl sm:text-5xl font-serif">₹</span>
                  <span>{grandTotalAmount.toLocaleString('en-IN')}</span>
                </div>

                <p className="text-base sm:text-xl font-bold text-slate-800 mt-1">
                  {grandTotalCount} Donations
                </p>

                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1.5 max-w-lg leading-relaxed">
                  Total collections across all Seva categories<br className="hidden sm:block" />
                  (verified UPI &amp; Cash offerings).
                </p>
              </div>

            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* DIRECT MANDAP UPI QR                                                    */}
          {/* ----------------------------------------------------------------------- */}
          <div className="md:col-span-6 bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-800 h-auto md:h-[285px]">

            <div className="h-full grid grid-cols-1 sm:grid-cols-[1fr_0.72fr] gap-4 items-center">

              {/* QR content */}
              <div className="flex flex-col items-center justify-center text-center min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold mb-2">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan &amp; Offer Your Seva</span>
                </div>

                <h3 className="text-lg sm:text-xl font-black font-serif text-white leading-tight">
                  Direct Mandap UPI QR
                </h3>

                <p className="text-[11px] sm:text-xs text-amber-200/80 mt-1">
                  Scan with GPay, PhonePe, Paytm, BHIM
                </p>

                <div className="mt-1.5 p-1.5 bg-white rounded-xl shadow-xl border-2 border-amber-200/40 text-slate-900 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 sm:w-24 sm:h-24 bg-slate-900 rounded-xl p-2.5 flex items-center justify-center shadow-inner relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current" aria-label="SJST UPI QR">
                      <path d="M0 0h30v30H0zm5 5v20h20V5zm5 5h10v10H10zM70 0h30v30H70zm5 5v20h20V5zm5 5h10v10H80zM0 70h30v30H0zm5 5v20h20V5zm5 5h10v10H10zM40 10h10v10H40zm10 10h10v10H50zm-10 10h10v10H40zm30 10h10v10H70zm10 10h10v10H80zm-40 20h10v10H40zm10 10h10v10H50zm10-10h10v10H60zm10 10h10v10H70zm10 0h10v10H80zm0 10h10v10H80zm-10 10h10v10H70z" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-amber-800 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md">
                        SJST
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 text-center">
                    <span className="font-mono font-bold text-[10px] text-amber-950 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      {trustConfig.upiId}
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-amber-200/80 space-y-0.5 mt-1.5 leading-tight">
                  <div>Beneficiary: <strong>{trustConfig.name}</strong></div>
                  <div className="font-mono">SBI A/c: {trustConfig.accountNo} • IFSC: {trustConfig.ifsc}</div>
                </div>
              </div>

              {/* Devotional message panel */}
              <div className="hidden sm:flex h-full border-l border-amber-200/20 pl-3 flex-col justify-start pt-2 gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
                  <span className="text-sm font-semibold text-amber-100 leading-snug">
                    Seva<br />Today
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <HandHeart className="w-6 h-6 text-amber-300 shrink-0" />
                  <span className="text-sm font-semibold text-amber-100 leading-snug">
                    Blessings<br />Always
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-amber-300 shrink-0" />
                  <span className="text-sm font-semibold text-amber-100 leading-snug">
                    A Stronger<br />Community<br />Together
                  </span>
                </div>

                <div className="border border-amber-300/40 rounded-xl px-2.5 py-2.5 text-center text-xs font-bold text-white leading-relaxed">
                  Every Offering<br />Matters 🙏
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ROW: TOP 5 SEVA + LAST 5 DAYS                                      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">

          {/* ----------------------------------------------------------------------- */}
          {/* TOP 5 SEVA CATEGORIES                                                   */}
          {/* ----------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 h-auto lg:h-[245px]">

            <div className="flex items-center pb-2 border-b border-slate-100 bg-amber-50/70 rounded-xl px-3 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">◕</span>
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    Top 5 Seva Categories
                  </h3>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 ml-6">
                  Share of total collections (Top 5 shown, others combined)
                </p>
              </div>
            </div>

            {sevaDashboardData.length === 0 ? (
              <div className="h-[165px] flex items-center justify-center text-center text-slate-500">
                No Seva collection data available
              </div>
            ) : (
              <div className="grid grid-cols-[40%_60%] gap-2 items-center h-[165px]">

                {/* Donut */}
                <div className="flex items-center justify-center">
                  <div
                    className="relative w-32 h-32 rounded-full"
                    style={{
                      background: (() => {
                        let start = 0;
                        const colors = ['#7c431e','#a85b25','#cf7d27','#4d8b45','#4c74d9','#8b45c8','#9ca3af'];
                        const segments = sevaDashboardData.map((item, index) => {
                          const end = start + item.percent;
                          const segment = `${colors[index % colors.length]} ${start}% ${end}%`;
                          start = end;
                          return segment;
                        });
                        return `conic-gradient(${segments.join(', ')})`;
                      })()
                    }}
                  >
                    <div className="absolute inset-7 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-slate-500">₹{grandTotalAmount.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-slate-500">Total</span>
                    </div>
                  </div>
                </div>

                {/* Ranking */}
                <div className="space-y-0.5 pr-1">
                  {sevaDashboardData.map((item, index) => {
                    const rankColors = ['#8a4b20','#f2b72e','#4f8f4b','#4b72d6','#8b45c8','#9ca3af'];
                    const isOthers = item.category.toLowerCase() === 'others';

                    return (
                      <div
                        key={`${item.category}-${index}`}
                        className="flex items-center justify-between gap-2 px-2 py-0.5 rounded-lg bg-slate-50/70 border border-slate-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black text-white"
                            style={{ backgroundColor: rankColors[index % rankColors.length] }}
                          >
                            {isOthers ? '' : item.rank || index + 1}
                          </span>

                          <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-[11px] sm:text-xs text-slate-800">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="font-bold text-[11px] sm:text-xs text-amber-800 w-10 text-right">
                            {item.percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* LAST 5 DAYS OFFERINGS                                                   */}
          {/* ----------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 h-auto lg:h-[245px]">

            <div className="flex items-center pb-2 border-b border-slate-100 bg-amber-50/70 rounded-xl px-3 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-800" />
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    Last 5 Days Offerings
                  </h3>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 ml-6">
                  Total collections on last 5 available donation dates
                </p>
              </div>
            </div>

            {dayDashboardData.length === 0 ? (
              <div className="h-[165px] flex items-center justify-center text-center text-slate-500">
                No recent collection data available
              </div>
            ) : (
              <div className="relative h-[165px] pt-1">
                {(() => {
                  const chartData = [...dayDashboardData].reverse();
                  const maxAmount = Math.max(...chartData.map(item => item.amount), 0);
                  const chartMax = maxAmount > 0 ? Math.ceil(maxAmount / 10000) * 10000 : 10000;

                  const formatDate = (rawDate: string) => {
                    const date = new Date(`${rawDate}T00:00:00`);
                    if (Number.isNaN(date.getTime())) return rawDate;
                    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                  };

                  return (
                    <div className="relative h-full pl-11 pr-1">
                      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[10px] text-slate-500 font-mono">
                        <span>₹{chartMax.toLocaleString('en-IN')}</span>
                        <span>₹{Math.round(chartMax * 0.66).toLocaleString('en-IN')}</span>
                        <span>₹{Math.round(chartMax * 0.33).toLocaleString('en-IN')}</span>
                        <span>₹0</span>
                      </div>

                      <div className="relative h-full border-l border-b border-slate-300">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                          <div className="border-t border-slate-100" />
                          <div className="border-t border-slate-100" />
                          <div className="border-t border-slate-100" />
                          <div className="border-t border-slate-200" />
                        </div>

                        <div className="absolute inset-0 flex items-end justify-around gap-2 px-2">
                          {chartData.map((item, index) => {
                            const height = chartMax > 0 ? Math.max(4, (item.amount / chartMax) * 100) : 0;

                            return (
                              <div key={`${item.date}-${index}`} className="flex-1 h-full flex flex-col items-center justify-end min-w-0">
                                <div className="mb-1 text-[9px] sm:text-[10px] font-black text-slate-900 font-mono whitespace-nowrap">
                                  ₹{item.amount.toLocaleString('en-IN')}
                                </div>
                                <div
                                  className="w-full max-w-14 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg shadow-sm"
                                  style={{ height: `${height}%` }}
                                  title={`${formatDate(item.date)} — ₹${item.amount.toLocaleString('en-IN')}`}
                                />
                                <div className="mt-1 text-[9px] sm:text-[10px] font-medium text-slate-500 whitespace-nowrap">
                                  {formatDate(item.date)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* FOOTER                                                                    */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 pt-0 text-amber-950">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold">
            <span className="text-xl">ॐ</span>
            <span>Gratitude to all our devotees, donors and volunteers.</span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-base font-serif italic font-semibold">
            <span className="text-amber-500">◆</span>
            <span>Seva</span>
            <span>•</span>
            <span>Samarpan</span>
            <span>•</span>
            <span>Samruddhi</span>
            <span className="text-amber-500">◆</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold">
            <span>Jai Jagannath</span>
            <span className="text-lg">🙏</span>
          </div>
        </div>

      </div>
    </div>
  );
}
