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
import { MaaDurgaWatermark } from './MaaDurgaWatermark';

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
    <div className={`space-y-6 relative transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 text-white p-6 sm:p-10 overflow-y-auto' : ''}`}>
      
      {/* Background Watermark for Temple Sanctity */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 z-0 overflow-hidden">
        <MaaDurgaWatermark opacity={0.07} size="full" />
      </div>

      <div className="relative z-10 space-y-6">

        {/* ========================================================================= */}
        {/* ROW 1: GRAND TOTAL (7 COLS) + DIRECT MANDAP QR SCAN & PAY (5 COLS)         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
                    {/* Main Grand Total Card (7 Cols) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 relative overflow-hidden min-h-[280px]">

            {/* Watermark */}
            <div className="absolute right-2 top-0 bottom-0 w-56 sm:w-64 pointer-events-none flex items-center justify-center opacity-25">
              <MaaDurgaWatermark opacity={0.10} size="full" />
            </div>

            {/* Soft background glow */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-amber-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 max-w-[65%]">

              <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-700" />
                Total Donations
              </span>

              <div className="mt-5">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
                  <span className="text-amber-800 text-3xl sm:text-4xl font-serif">
                    ₹
                  </span>

                  <span>
                    {grandTotalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <p className="text-base font-semibold text-slate-700 mt-1">
                  {grandTotalCount} Donations
                </p>

                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 max-w-xl">
                  Total collections across all Seva categories
                  (verified UPI &amp; Cash offerings).
                </p>
              </div>

            </div>

          </div>

          {/* Scan & Pay Direct QR Card (5 Cols) */}
          <div className="md:col-span-5 bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-800 flex flex-col items-center justify-between text-center space-y-4">
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
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-slate-900 rounded-2xl p-2.5 flex items-center justify-center shadow-inner relative">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* ========================================================================= */}
          {/* ROW 2: LAST 5 DAYS OFFERINGS                                             */}
          {/* ========================================================================= */}
          <div className="order-2 lg:order-2 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">

            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-800" />

                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                    Last 5 Days Offerings
                  </h3>

                  <p className="text-xs text-slate-500">
                    Total collections on last 5 available donation dates
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                Last 5 Available Dates
              </span>
            </div>

            {dayDashboardData.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />

                <p className="text-sm font-bold text-slate-700">
                  No recent collection data available
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Day-wise offerings will appear here once verified collections are available.
                </p>
              </div>
            ) : (
              <div className="relative">

                {(() => {
                  const chartData = [...dayDashboardData].reverse();

                  const maxAmount = Math.max(
                    ...chartData.map(item => item.amount),
                    0
                  );

                  const chartMax =
                    maxAmount > 0
                      ? Math.ceil(maxAmount / 10000) * 10000
                      : 10000;

                  const formatDate = (rawDate: string) => {
                    const date = new Date(`${rawDate}T00:00:00`);

                    if (Number.isNaN(date.getTime())) {
                      return rawDate;
                    }

                    return date.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short'
                    });
                  };

                  return (
                    <div className="relative">

                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 bottom-10 w-16 flex flex-col justify-between text-[11px] text-slate-500 font-mono">
                        <span>
                          ₹{chartMax.toLocaleString('en-IN')}
                        </span>

                        <span>
                          ₹{Math.round(chartMax * 0.75).toLocaleString('en-IN')}
                        </span>

                        <span>
                          ₹{Math.round(chartMax * 0.5).toLocaleString('en-IN')}
                        </span>

                        <span>
                          ₹{Math.round(chartMax * 0.25).toLocaleString('en-IN')}
                        </span>

                        <span>
                          ₹0
                        </span>
                      </div>

                      {/* Chart area */}
                      <div className="ml-16">

                        <div className="relative h-52 border-l border-b border-slate-300">

                          {/* Horizontal grid lines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">

                            <div className="border-t border-slate-100" />
                            <div className="border-t border-slate-100" />
                            <div className="border-t border-slate-100" />
                            <div className="border-t border-slate-100" />
                            <div className="border-t border-slate-200" />

                          </div>

                          {/* Bars */}
                          <div className="absolute inset-0 flex items-end justify-around gap-4 px-5">

                            {chartData.map((item, index) => {

                              const height =
                                chartMax > 0
                                  ? Math.max(
                                      4,
                                      (item.amount / chartMax) * 100
                                    )
                                  : 0;

                              return (
                                <div
                                  key={`${item.date}-${index}`}
                                  className="flex-1 h-full flex flex-col items-center justify-end min-w-0"
                                >

                                  {/* Amount */}
                                  <div className="mb-2 text-sm font-black text-slate-900 font-mono whitespace-nowrap">
                                    ₹{item.amount.toLocaleString('en-IN')}
                                  </div>

                                  {/* Bar */}
                                  <div
                                    className="w-full max-w-20 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg shadow-sm transition-all duration-500"
                                    style={{
                                      height: `${height}%`
                                    }}
                                    title={`${formatDate(item.date)} — ₹${item.amount.toLocaleString('en-IN')}`}
                                  />

                                  {/* Date */}
                                  <div className="mt-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                                    {formatDate(item.date)}
                                  </div>

                                </div>
                              );
                            })}

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                })()}

            </div>
          )}
        </div>



        {/* ========================================================================= */}
        {/* ROW 3: SEVA-WISE TOP 5 + OTHERS                                          */}
        {/* ========================================================================= */}
        <div className="order-1 lg:order-1 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">

          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-800" />

              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                  Seva-Wise Offerings
                </h3>

                <p className="text-xs text-slate-500">
                  How devotees are contributing across Seva categories
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
              Top 5 + Others
            </span>
          </div>

          {sevaDashboardData.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />

              <p className="text-sm font-bold text-slate-700">
                No Seva collection data available
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Seva-wise offerings will appear here once verified collections are available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* Donut Chart */}
              <div className="flex items-center justify-center">

                <div
                  className="relative w-40 h-40 rounded-full"
                  style={{
                    background: (() => {
                      let start = 0;

                      const segments = sevaDashboardData.map((item, index) => {
                        const colors = [
                          '#92400e',
                          '#b45309',
                          '#d97706',
                          '#f59e0b',
                          '#fbbf24',
                          '#94a3b8'
                        ];

                        const end = start + item.percent;
                        const segment = `${colors[index % colors.length]} ${start}% ${end}%`;

                        start = end;

                        return segment;
                      });

                      return `conic-gradient(${segments.join(', ')})`;
                    })()
                  }}
                >
                  <div className="absolute inset-6 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">

                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Total Seva
                    </span>

                    <span className="text-2xl font-black text-slate-900 font-mono">
                      ₹{sevaDashboardData
                        .reduce((sum, item) => sum + item.amount, 0)
                        .toLocaleString('en-IN')}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      Verified offerings
                    </span>

                  </div>
                </div>

              </div>

              {/* Seva Legend / Ranking */}
              <div className="space-y-2">

                {sevaDashboardData.map((item, index) => {
                  const colors = [
                    '#92400e',
                    '#b45309',
                    '#d97706',
                    '#f59e0b',
                    '#fbbf24',
                    '#94a3b8'
                  ];

                  return (
                    <div
                      key={`${item.category}-${index}`}
                      className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-amber-50/40 border border-amber-100"
                    >

                      <div className="flex items-center gap-3 min-w-0">

                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              colors[index % colors.length]
                          }}
                        />

                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {item.category}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            {item.count}{' '}
                            {item.count === 1
                              ? 'offering'
                              : 'offerings'}
                          </div>
                        </div>

                      </div>

                      <div className="text-right shrink-0">

                        <div className="font-mono font-black text-sm text-slate-900">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </div>

                        <div className="text-[11px] font-bold text-amber-800">
                          {item.percent.toFixed(1)}%
                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>

            </div>
          )}
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
