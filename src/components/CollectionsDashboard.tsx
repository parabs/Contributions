import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Banknote,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileText,
  HandCoins,
  Lock,
  PieChart,
  QrCode,
  RefreshCw,
  Receipt,
  Repeat2,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserCircle,
  WalletCards,
  XCircle,
  Zap,
  ChevronLeft
} from 'lucide-react';

import { DonationRecord, VolunteerRecord, TrustConfig } from '../types';
import * as googleSheetsService from '../services/googleSheetsService';

interface CollectionsDashboardProps {
  donations: DonationRecord[];
  volunteers: VolunteerRecord[];
  trustConfig: TrustConfig;
  onViewReceipt: (donation: DonationRecord) => void;
  onOpenVolunteerManagement: () => void;
  onBackToPortal?: () => void;
}

type CalcRow = any[];

interface DashboardData {
  paidAmount: number;
  paidCount: number;
  confirmationAmount: number;
  confirmationCount: number;
  recollectAmount: number;
  recollectCount: number;
  repaymentAmount: number;
  repaymentCount: number;
  disputeCount: number;
  notInterestedCount: number;
  activeVolunteers: number;
  totalCollections: number;
  workflow: {
    confirmation: { amount: number; count: number };
    recollect: { amount: number; count: number };
    repayment: { amount: number; count: number };
    paid: { amount: number; count: number };
    dispute: { amount: number; count: number };
    notInterested: { amount: number; count: number };
  };
  periods: {
    tillDate: { amount: number; count: number };
    thisYear: { amount: number; count: number };
    thisQuarter: { amount: number; count: number };
    thisMonth: { amount: number; count: number };
    thisWeek: { amount: number; count: number };
  };
  payment: {
    cash: { amount: number; count: number; share: number };
    upi: { amount: number; count: number; share: number };
  };
  grievance: {
    total: string | number;
    resolved: string | number;
    pending: string | number;
  };
}

const money = (value: number) =>
  `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const numberValue = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const percent = (value: number) =>
  `${Math.round((Number(value) || 0) * 100)}%`;

const safeText = (value: any, fallback = '—') =>
  value === undefined || value === null || value === '' ? fallback : String(value);

function getCalcValue(rows: CalcRow[], sheetRow: number, columnIndex: number): any {
  return rows[sheetRow - 1]?.[columnIndex];
}

function buildDashboardData(rows: CalcRow[]): DashboardData {
  const paidAmount = numberValue(getCalcValue(rows, 33, 1));
  const paidCount = numberValue(getCalcValue(rows, 33, 2));

  const confirmationAmount = numberValue(getCalcValue(rows, 34, 1));
  const confirmationCount = numberValue(getCalcValue(rows, 34, 2));

  const recollectAmount = numberValue(getCalcValue(rows, 49, 1));
  const recollectCount = numberValue(getCalcValue(rows, 49, 2));

  const repaymentAmount = numberValue(getCalcValue(rows, 50, 1));
  const repaymentCount = numberValue(getCalcValue(rows, 50, 2));

  const disputeAmount = numberValue(getCalcValue(rows, 51, 1));
  const disputeCount = numberValue(getCalcValue(rows, 51, 2));

  const notInterestedAmount = numberValue(getCalcValue(rows, 52, 1));
  const notInterestedCount = numberValue(getCalcValue(rows, 52, 2));

  const activeVolunteers = numberValue(getCalcValue(rows, 40, 2));

  const cashAmount = numberValue(getCalcValue(rows, 69, 2));
  const cashCount = numberValue(getCalcValue(rows, 69, 1));
  const upiAmount = numberValue(getCalcValue(rows, 70, 2));
  const upiCount = numberValue(getCalcValue(rows, 70, 1));

  const cashShare = numberValue(getCalcValue(rows, 69, 3));
  const upiShare = numberValue(getCalcValue(rows, 70, 3));

  return {
    paidAmount,
    paidCount,
    confirmationAmount,
    confirmationCount,
    recollectAmount,
    recollectCount,
    repaymentAmount,
    repaymentCount,
    disputeCount,
    notInterestedCount,
    activeVolunteers,
    totalCollections: paidAmount,
    workflow: {
      confirmation: {
        amount: numberValue(getCalcValue(rows, 48, 1)),
        count: numberValue(getCalcValue(rows, 48, 2))
      },
      recollect: {
        amount: numberValue(getCalcValue(rows, 49, 1)),
        count: numberValue(getCalcValue(rows, 49, 2))
      },
      repayment: {
        amount: numberValue(getCalcValue(rows, 50, 1)),
        count: numberValue(getCalcValue(rows, 50, 2))
      },
      paid: {
        amount: numberValue(getCalcValue(rows, 53, 1)),
        count: numberValue(getCalcValue(rows, 53, 2))
      },
      dispute: {
        amount: numberValue(getCalcValue(rows, 51, 1)),
        count: numberValue(getCalcValue(rows, 51, 2))
      },
      notInterested: {
        amount: numberValue(getCalcValue(rows, 52, 1)),
        count: numberValue(getCalcValue(rows, 52, 2))
      }
    },
    periods: {
      tillDate: {
        amount: numberValue(getCalcValue(rows, 59, 1)),
        count: numberValue(getCalcValue(rows, 59, 2))
      },
      thisYear: {
        amount: numberValue(getCalcValue(rows, 60, 1)),
        count: numberValue(getCalcValue(rows, 60, 2))
      },
      thisQuarter: {
        amount: numberValue(getCalcValue(rows, 61, 1)),
        count: numberValue(getCalcValue(rows, 61, 2))
      },
      thisMonth: {
        amount: numberValue(getCalcValue(rows, 62, 1)),
        count: numberValue(getCalcValue(rows, 62, 2))
      },
      thisWeek: {
        amount: numberValue(getCalcValue(rows, 63, 1)),
        count: numberValue(getCalcValue(rows, 63, 2))
      }
    },
    payment: {
      cash: { amount: cashAmount, count: cashCount, share: cashShare },
      upi: { amount: upiAmount, count: upiCount, share: upiShare }
    },
    grievance: {
      total: safeText(getCalcValue(rows, 75, 1)),
      resolved: safeText(getCalcValue(rows, 76, 1)),
      pending: safeText(getCalcValue(rows, 77, 1))
    }
  };
}

function SectionHeader({
  number,
  title,
  subtitle,
  restricted = false
}: {
  number: string;
  title: string;
  subtitle: string;
  restricted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
          {number}
        </div>
        <div>
          <h2 className="text-sm leading-tight font-black text-slate-900">
            {title}
          </h2>
          <p className="text-[8px] text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      {restricted ? (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-[10px] font-bold text-red-700">
          <Lock className="w-3 h-3" />
          Visible only to Treasurer &amp; Trustees
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
          <Eye className="w-3 h-3" />
          Visible to all roles
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  tone = 'green'
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  tone?: 'green' | 'orange' | 'blue' | 'purple' | 'red' | 'slate';
}) {
  const tones = {
    green: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    orange: 'bg-orange-50 border-orange-100 text-orange-900',
    blue: 'bg-blue-50 border-blue-100 text-blue-900',
    purple: 'bg-violet-50 border-violet-100 text-violet-900',
    red: 'bg-red-50 border-red-100 text-red-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-900'
  };

  return (
    <div className={`rounded-lg border px-2 py-1.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-md bg-white/80 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black leading-tight">{title}</div>
          <div className="text-[19px] leading-none font-black font-mono">
            {value}
          </div>
          <div className="text-[8px] leading-none font-semibold opacity-70 mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block min-w-[100px] flex-1">
      <span className="absolute left-2 top-1 text-[7px] font-semibold text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2 pt-3 pb-0.5 text-[9px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-300"
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 bottom-1.5 w-3 h-3 text-slate-400" />
    </label>
  );
}

export function CollectionsDashboard({
  donations,
  volunteers,
  trustConfig,
  onViewReceipt,
  onOpenVolunteerManagement,
  onBackToPortal
}: CollectionsDashboardProps) {
  const [calculation, setCalculation] = useState<CalcRow[]>([]);
  const [loadingCalculation, setLoadingCalculation] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [period, setPeriod] = useState('Till Date');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeva, setSelectedSeva] = useState('All');
  const [selectedVolunteer, setSelectedVolunteer] = useState('All');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('All');

  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCalculation(true);

      const result = await googleSheetsService.fetchDashboardCalculation(null);

      if (mounted) {
        if (result.success) {
          setCalculation(result.values || []);
        } else {
          console.warn('Detailed Dashboard calculation fetch failed:', result.error);
        }

        setLoadingCalculation(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshCalculation = async () => {
    setRefreshing(true);

    const result = await googleSheetsService.fetchDashboardCalculation(null);

    if (result.success) {
      setCalculation(result.values || []);
    } else {
      alert(
        `Dashboard calculation could not be refreshed.\n\n${result.error || 'Unknown error'}`
      );
    }

    setRefreshing(false);
  };

  const dashboard = useMemo(
    () => buildDashboardData(calculation),
    [calculation]
  );

  const activeVolunteerRows = useMemo(
    () =>
      volunteers
        .filter(v => v.status === 'Active')
        .filter(v => (v.role || '').toLowerCase().includes('volunteer'))
        .map(v => ({
          id: v.volunteerCode,
          name: v.volunteerName,
          role: v.role || 'Volunteer',
          amount: Number((v as any).amountCollected || 0),
          verifiedSeva: Number(v.verifiedSeva || 0),
          grievances: 0,
          thisMonth: 0
        })),
    [volunteers]
  );

  /*
   * The Volunteers sheet is now the source of truth for:
   *   - Amount Collected
   *   - Verified Seva
   *
   * Grievances / This Month are read from the live Donations data here
   * until those values are exposed directly through the Volunteers sheet.
   */
  const volunteerRows = useMemo(() => {
    return activeVolunteerRows.map(v => {
      const related = donations.filter(
        d =>
          d.paymentStatus === 'Paid' &&
          String(d.confirmedBy || '').trim() === v.id
      );

      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const thisMonth = related
        .filter(d => {
          const date = new Date(d.updatedAt || d.createdAt || d.submittedAt);
          return date >= thisMonthStart;
        })
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);

      const grievances = donations.filter(
        d =>
          String(d.confirmedBy || '').trim() === v.id &&
          String(d.paymentStatus || '').trim() === 'Repayment - Dispute'
      ).length;

      return {
        ...v,
        grievances,
        thisMonth
      };
    });
  }, [activeVolunteerRows, donations]);

  const sevaRows = useMemo(() => {
    const paid = donations.filter(d => d.paymentStatus === 'Paid');

    const map = new Map<
      string,
      { seva: string; category: string; count: number; amount: number }
    >();

    paid.forEach(d => {
      const seva = d.sevaHead || (d as any).sevaCategory || 'General Seva';
      const category = d.sevaCategory || 'General Seva';
      const key = `${category}||${seva}`;

      const existing = map.get(key) || {
        seva,
        category,
        count: 0,
        amount: 0
      };

      existing.count += 1;
      existing.amount += Number(d.amount || 0);
      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [donations]);

  const categoryRows = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    donations
      .filter(d => d.paymentStatus === 'Paid')
      .forEach(d => {
        const category = d.sevaCategory || 'General Seva';
        const existing = map.get(category) || { amount: 0, count: 0 };
        existing.amount += Number(d.amount || 0);
        existing.count += 1;
        map.set(category, existing);
      });

    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        ...stats,
        share:
          dashboard.paidAmount > 0
            ? stats.amount / dashboard.paidAmount
            : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [donations, dashboard.paidAmount]);

  const recentActivity = useMemo(() => {
    return [...donations]
      .filter(d => d.paymentStatus !== 'Cancelled')
      .sort((a, b) => {
        const da = new Date(a.updatedAt || a.createdAt || a.submittedAt).getTime();
        const db = new Date(b.updatedAt || b.createdAt || b.submittedAt).getTime();
        return db - da;
      })
      .slice(0, 6);
  }, [donations]);

  const lastFiveDays = useMemo(() => {
    const rows: { date: string; amount: number }[] = [];

    for (let row = 23; row <= 27; row++) {
      const date = getCalcValue(calculation, row, 0);
      const amount = numberValue(getCalcValue(calculation, row, 1));

      if (date !== undefined && date !== '') {
        rows.push({
          date: String(date),
          amount
        });
      }
    }

    return rows;
  }, [calculation]);

  const maxDayAmount = Math.max(
    1,
    ...lastFiveDays.map(d => d.amount)
  );

  const workflowTotal =
    dashboard.workflow.confirmation.amount +
    dashboard.workflow.recollect.amount +
    dashboard.workflow.repayment.amount +
    dashboard.workflow.paid.amount;

  const workflowShare = (amount: number) =>
    workflowTotal > 0 ? Math.round((amount / workflowTotal) * 100) : 0;

  const exportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Paid Collection', dashboard.paidAmount],
      ['Paid Contributions', dashboard.paidCount],
      ['Confirmation Required', dashboard.confirmationAmount],
      ['Confirmation Required Count', dashboard.confirmationCount],
      ['Recollect', dashboard.recollectAmount],
      ['Recollect Count', dashboard.recollectCount],
      ['Repayment', dashboard.repaymentAmount],
      ['Repayment Count', dashboard.repaymentCount],
      ['Repayment - Dispute', dashboard.disputeCount],
      ['Not Interested', dashboard.notInterestedCount],
      ['Active Volunteers', dashboard.activeVolunteers]
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `SJST_Detailed_Dashboard_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-1 pb-4">

      {/* ------------------------------------------------------------- */}
      {/* HEADER + FILTERS                                               */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl overflow-visible border border-slate-200 shadow-sm bg-white">
        <div className="bg-slate-950 text-white px-3 py-1.5">
          <div className="flex flex-col xl:flex-row xl:items-center gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-white/80 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-amber-300" />
              </div>

              <div>
                <h1 className="text-sm font-black tracking-tight whitespace-nowrap">
                  SJST Collection Dashboard
                </h1>
                <p className="text-[8px] text-slate-300 whitespace-nowrap">
                  Collection • Verification • Payment Resolution • Volunteer Operations
                </p>
              </div>
            </div>

            <div className="flex flex-nowrap items-center gap-1.5 w-full xl:w-auto xl:flex-1">
              <FilterSelect
                label="Period"
                value={period}
                options={['Till Date', 'This Year', 'This Quarter', 'This Month', 'This Week']}
                onChange={setPeriod}
              />

              <FilterSelect
                label="Seva Category"
                value={selectedCategory}
                options={['All', ...categoryRows.map(r => r.category)]}
                onChange={setSelectedCategory}
              />

              <FilterSelect
                label="Seva"
                value={selectedSeva}
                options={['All', ...sevaRows.map(r => r.seva)]}
                onChange={setSelectedSeva}
              />

              <FilterSelect
                label="Volunteer"
                value={selectedVolunteer}
                options={['All', ...volunteerRows.map(r => r.name)]}
                onChange={setSelectedVolunteer}
              />

              <FilterSelect
                label="Payment Mode"
                value={selectedPaymentMode}
                options={['All', 'Cash', 'UPI']}
                onChange={setSelectedPaymentMode}
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[10px] font-bold inline-flex items-center gap-2"
                >
                  <UserCircle className="w-4 h-4 text-amber-300" />

                  <span className="max-w-[110px] truncate">
                    {(() => {
                      try {
                        const saved = sessionStorage.getItem('sjst_active_volunteer');
                        const parsed = saved ? JSON.parse(saved) : null;
                        return parsed?.volunteerName || 'Volunteer';
                      } catch {
                        return 'Volunteer';
                      }
                    })()}
                  </span>

                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">

                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">
                        Logged in as
                      </div>

                      <div className="mt-1 text-sm font-black text-slate-900">
                        {(() => {
                          try {
                            const saved = sessionStorage.getItem('sjst_active_volunteer');
                            const parsed = saved ? JSON.parse(saved) : null;
                            return parsed?.volunteerName || 'Volunteer';
                          } catch {
                            return 'Volunteer';
                          }
                        })()}
                      </div>

                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {(() => {
                          try {
                            const saved = sessionStorage.getItem('sjst_active_volunteer');
                            const parsed = saved ? JSON.parse(saved) : null;
                            return parsed?.role || parsed?.roles || 'Volunteer';
                          } catch {
                            return 'Volunteer';
                          }
                        })()}
                      </div>
                    </div>

                    <div className="p-2">

                      <button
                        type="button"
                        onClick={async () => {
                          setShowUserMenu(false);
                          await refreshCalculation();
                        }}
                        className="w-full px-3 py-2 rounded-lg hover:bg-slate-50 text-left text-xs font-bold flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                        Refresh Dashboard
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          exportReport();
                        }}
                        className="w-full px-3 py-2 rounded-lg hover:bg-slate-50 text-left text-xs font-bold flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        Export Report
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onBackToPortal?.();
                        }}
                        className="w-full px-3 py-2 rounded-lg hover:bg-slate-50 text-left text-xs font-bold flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                        Back to Portal
                      </button>

                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. KEY METRICS                                                 */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-emerald-200 bg-white px-2 py-1.5">
        <SectionHeader
          number="1"
          title="Key Metrics"
          subtitle="Overall collection status and key operational numbers."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          <MetricCard
            icon={<HandCoins className="w-5 h-5 text-emerald-700" />}
            title="Paid (Collection)"
            value={money(dashboard.paidAmount)}
            subtitle={`${dashboard.paidCount} Contributions`}
            tone="green"
          />

          <MetricCard
            icon={<Clock3 className="w-5 h-5 text-orange-700" />}
            title="Confirmation Required"
            value={money(dashboard.confirmationAmount)}
            subtitle={`${dashboard.confirmationCount} Donations`}
            tone="orange"
          />

          <MetricCard
            icon={<Repeat2 className="w-5 h-5 text-blue-700" />}
            title="Recollect"
            value={money(dashboard.recollectAmount)}
            subtitle={`${dashboard.recollectCount} Donations`}
            tone="blue"
          />

          <MetricCard
            icon={<WalletCards className="w-5 h-5 text-violet-700" />}
            title="Repayment"
            value={money(dashboard.repaymentAmount)}
            subtitle={`${dashboard.repaymentCount} Donations`}
            tone="purple"
          />

          <MetricCard
            icon={<ShieldAlert className="w-5 h-5 text-red-700" />}
            title="Repayment – Dispute"
            value={`${dashboard.disputeCount} Case${dashboard.disputeCount === 1 ? '' : 's'}`}
            subtitle="Payment dispute"
            tone="red"
          />

          <MetricCard
            icon={<Ban className="w-5 h-5 text-slate-500" />}
            title="Not Interested"
            value={`${dashboard.notInterestedCount}`}
            subtitle="Donations"
            tone="slate"
          />

          <MetricCard
            icon={<Users className="w-5 h-5 text-blue-700" />}
            title="Active Volunteers"
            value={`${dashboard.activeVolunteers}`}
            subtitle="Active volunteer accounts"
            tone="blue"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. COLLECTION WORKFLOW                                         */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-emerald-200 bg-white px-2 py-1.5">
        <SectionHeader
          number="2"
          title="Collection Workflow"
          subtitle="Track the flow of donations from confirmation to collection and see where action is needed."
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1fr_1fr_0.9fr] gap-1.5">
          {[
            {
              number: '1',
              title: 'Confirmation Required',
              amount: dashboard.workflow.confirmation.amount,
              count: dashboard.workflow.confirmation.count,
              tone: 'orange',
              icon: <Clock3 className="w-5 h-5 text-orange-700" />
            },
            {
              number: '2',
              title: 'Recollect',
              amount: dashboard.workflow.recollect.amount,
              count: dashboard.workflow.recollect.count,
              tone: 'blue',
              icon: <Repeat2 className="w-5 h-5 text-blue-700" />
            },
            {
              number: '3',
              title: 'Reconfirmation',
              amount: dashboard.workflow.repayment.amount,
              count: dashboard.workflow.repayment.count,
              tone: 'purple',
              icon: <CheckCircle2 className="w-5 h-5 text-violet-700" />
            },
            {
              number: '4',
              title: 'Collection (Paid)',
              amount: dashboard.workflow.paid.amount,
              count: dashboard.workflow.paid.count,
              tone: 'green',
              icon: <HandCoins className="w-5 h-5 text-emerald-700" />
            }
          ].map(stage => (
            <div
              key={stage.number}
              className={`relative rounded-lg border px-2 py-1.5 ${
                stage.tone === 'green'
                  ? 'bg-emerald-50 border-emerald-100'
                  : stage.tone === 'orange'
                  ? 'bg-orange-50 border-orange-100'
                  : stage.tone === 'blue'
                  ? 'bg-blue-50 border-blue-100'
                  : 'bg-violet-50 border-violet-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                  {stage.icon}
                </div>

                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-wide opacity-70">
                    {stage.number}
                  </div>

                  <div className="text-[11px] font-black text-slate-900 leading-tight">
                    {stage.title}
                  </div>
                </div>
              </div>

              <div className="mt-1.5 flex items-end justify-between">
                <div>
                  <div className="text-[9px] text-slate-500 leading-none">
                    {stage.count} Donations
                  </div>

                  <div className="text-[17px] leading-none font-black font-mono mt-0.5">
                    {money(stage.amount)}
                  </div>
                </div>

                <div className="text-[9px] font-bold text-slate-500">
                  {workflowShare(stage.amount)}%
                </div>
              </div>

              <div className="mt-1 h-1.5 rounded-full bg-white/70 overflow-hidden">
                <div
                  className="h-full rounded-full bg-current opacity-70"
                  style={{
                    width: `${Math.min(100, workflowShare(stage.amount))}%`
                  }}
                />
              </div>

              {stage.number !== '4' && (
                <ArrowRight className="hidden xl:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 z-20" />
              )}
            </div>
          ))}

          <div className="space-y-1">
            <div className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />

                <div className="min-w-0">
                  <div className="text-[9px] font-black text-red-700">
                    5
                  </div>

                  <div className="text-[11px] font-black text-slate-900 leading-tight">
                    Repayment – Dispute
                  </div>

                  <div className="text-[9px] text-slate-500 leading-none mt-0.5">
                    {dashboard.workflow.dispute.count} Case
                    {dashboard.workflow.dispute.count === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Ban className="w-5 h-5 text-slate-700 shrink-0" />

                <div className="min-w-0">
                  <div className="text-[9px] font-black text-slate-500">
                    6
                  </div>

                  <div className="text-[11px] font-black text-slate-900 leading-tight">
                    Not Interested
                  </div>

                  <div className="text-[9px] text-slate-500 leading-none mt-0.5">
                    {dashboard.workflow.notInterested.count} Donations
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. ACTION REQUIRED                                             */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-emerald-200 bg-white px-2 py-1.5">
        <SectionHeader
          number="3"
          title="Action Required"
          subtitle="Key items that need attention. Click to view and take action."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Clock3 className="w-8 h-8 text-orange-700" />
              <div>
                <div className="text-xl font-black">{dashboard.confirmationCount}</div>
                <div className="text-xs font-black">Confirmation Required</div>
                <div className="text-[10px] text-slate-500">
                  {money(dashboard.confirmationAmount)} • {dashboard.confirmationCount} Donations
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('sjst-open-live-sheet', { detail: 'Confirmation Pending' }))}
              className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black inline-flex items-center gap-1"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Repeat2 className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-xl font-black">{dashboard.recollectCount}</div>
                <div className="text-xs font-black">Recollect Donations</div>
                <div className="text-[10px] text-slate-500">
                  Initiated for collection • {money(dashboard.recollectAmount)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('sjst-open-live-sheet', { detail: 'Recollect' }))}
              className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black inline-flex items-center gap-1"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-xl font-black">{dashboard.disputeCount}</div>
                <div className="text-xs font-black">Repayment Dispute</div>
                <div className="text-[10px] text-slate-500">
                  Needs investigation
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('sjst-open-live-sheet', { detail: 'Repayment - Dispute' }))}
              className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-black inline-flex items-center gap-1"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. COLLECTION OVERVIEW                                         */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-emerald-200 bg-white px-2 py-1.5">
        <SectionHeader
          number="4"
          title="Collection Overview"
          subtitle="Collection performance over different periods and recent trends."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.5fr] gap-2">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Till Date', dashboard.periods.tillDate, 'emerald'],
              ['This Year', dashboard.periods.thisYear, 'blue'],
              ['This Month', dashboard.periods.thisMonth, 'violet'],
              ['This Week', dashboard.periods.thisWeek, 'orange']
            ].map(([label, data, tone]) => (
              <div
                key={String(label)}
                className={`rounded-xl p-3 border ${
                  tone === 'emerald'
                    ? 'bg-emerald-50 border-emerald-100'
                    : tone === 'blue'
                    ? 'bg-blue-50 border-blue-100'
                    : tone === 'violet'
                    ? 'bg-violet-50 border-violet-100'
                    : 'bg-orange-50 border-orange-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-black">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {label}
                </div>
                <div className="text-xl font-black font-mono mt-2">
                  {money((data as any).amount)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {(data as any).count} Contributions
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-black text-slate-900">
                  Last 5 Available Collection Days
                </div>
                <div className="text-[10px] text-slate-500">
                  Based on Paid collection days
                </div>
              </div>
              <BarChart3 className="w-4 h-4 text-blue-700" />
            </div>

            <div className="h-[150px] flex items-end gap-2 border-b border-slate-200 px-1">
              {lastFiveDays.map(day => {
                const height = Math.max(
                  8,
                  Math.round((day.amount / maxDayAmount) * 120)
                );

                return (
                  <div
                    key={day.date}
                    className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                  >
                    <div className="text-[9px] font-black text-slate-700">
                      {money(day.amount)}
                    </div>
                    <div
                      className="w-full max-w-[46px] rounded-t-md bg-blue-500"
                      style={{ height }}
                      title={`${day.date}: ${money(day.amount)}`}
                    />
                    <div className="text-[9px] text-slate-500 truncate max-w-full">
                      {day.date}
                    </div>
                  </div>
                );
              })}

              {lastFiveDays.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  No collection-day data available.
                </div>
              )}
            </div>
          </div>

          {/* Payment Mode — restricted section within Collection Overview */}
          <div className="rounded-xl border border-red-100 bg-white p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-red-700" />
                <div>
                  <div className="text-sm font-black text-slate-900">Payment Mode</div>
                  <div className="text-[10px] text-slate-500">Cash vs Direct UPI</div>
                </div>
              </div>

              <div className="rounded-full bg-red-50 border border-red-100 px-2 py-1 text-[9px] font-black text-red-700 whitespace-nowrap">
                Treasurer &amp; Trustees
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                  <span className="text-[10px] font-black">Cash at Counter</span>
                </div>
                <div className="text-lg font-black font-mono mt-1">
                  {money(dashboard.payment.cash.amount)}
                </div>
                <div className="text-[9px] text-emerald-800 font-semibold">
                  {dashboard.payment.cash.count} Contributions • {percent(dashboard.payment.cash.share)}
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-2.5">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-5 h-5 text-blue-700" />
                  <span className="text-[10px] font-black">Direct UPI</span>
                </div>
                <div className="text-lg font-black font-mono mt-1">
                  {money(dashboard.payment.upi.amount)}
                </div>
                <div className="text-[9px] text-blue-800 font-semibold">
                  {dashboard.payment.upi.count} Contributions • {percent(dashboard.payment.upi.share)}
                </div>
              </div>
            </div>

            <div className="mt-2 h-3 rounded-full overflow-hidden flex bg-slate-100">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, dashboard.payment.cash.share * 100))}%` }}
              />
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, dashboard.payment.upi.share * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5 + 6 + 7 + 8                                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">

        {/* 5. Seva */}
        <section className="xl:col-span-4 rounded-xl border border-red-100 bg-white p-3">
          <SectionHeader
            number="5"
            title="Seva-wise Collection"
            subtitle="Category and detailed Seva collection."
            restricted
          />

          <div className="grid grid-cols-2 gap-2">
            {categoryRows.slice(0, 4).map((row, index) => (
              <div
                key={row.category}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="text-[10px] font-black text-amber-700">
                  {index + 1}. {row.category}
                </div>
                <div className="text-lg font-black font-mono mt-1">
                  {money(row.amount)}
                </div>
                <div className="text-[9px] text-slate-500">
                  {row.count} Contributions • {Math.round(row.share * 100)}%
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="text-xs font-black mb-2">Seva Collection Details</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-[9px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Seva</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-right">Contributions</th>
                    <th className="p-2 text-right">Collection</th>
                    <th className="p-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {sevaRows.map(row => (
                    <tr key={`${row.category}-${row.seva}`} className="border-t border-slate-100">
                      <td className="p-2 font-semibold">{row.seva}</td>
                      <td className="p-2 text-slate-500">{row.category}</td>
                      <td className="p-2 text-right">{row.count}</td>
                      <td className="p-2 text-right font-mono font-bold">{money(row.amount)}</td>
                      <td className="p-2 text-right">
                        {dashboard.paidAmount
                          ? `${Math.round((row.amount / dashboard.paidAmount) * 100)}%`
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 6. Volunteer */}
        <section className="xl:col-span-4 rounded-xl border border-red-100 bg-white p-3">
          <SectionHeader
            number="6"
            title="Volunteer-wise Collection"
            subtitle="Volunteer collection and operational view."
            restricted
          />

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-[9px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Volunteer</th>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-right">Amount Collected</th>
                  <th className="p-2 text-right">Verified Seva</th>
                  <th className="p-2 text-right">This Month</th>
                  <th className="p-2 text-right">Grievances</th>
                </tr>
              </thead>

              <tbody>
                {volunteerRows.map(row => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-2 font-bold">{row.name}</td>
                    <td className="p-2 text-slate-500">{row.role}</td>
                    <td className="p-2 text-right font-mono font-bold">
                      {money(row.amount)}
                    </td>
                    <td className="p-2 text-right">{row.verifiedSeva}</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-700">
                      {money(row.thisMonth)}
                    </td>
                    <td className="p-2 text-right">{row.grievances}</td>
                  </tr>
                ))}

                {volunteerRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      No active volunteers available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={onOpenVolunteerManagement}
            className="mt-2 text-[10px] font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
          >
            <Users className="w-3 h-3" />
            Manage Volunteers
          </button>
        </section>

        {/* 7. Grievance */}
        <section className="xl:col-span-4 rounded-xl border border-red-100 bg-white p-3">
          <SectionHeader
            number="7"
            title="Grievance Management"
            subtitle="Grievance KPIs are reserved for the future resolution workflow."
            restricted
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
              <ShieldAlert className="w-6 h-6 mx-auto text-red-500" />
              <div className="text-[10px] font-bold mt-1">Total Raised</div>
              <div className="text-xl font-black mt-1">
                {dashboard.grievance.total}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-700" />
              <div className="text-[10px] font-bold mt-1">Resolved</div>
              <div className="text-xl font-black mt-1">
                {dashboard.grievance.resolved}
              </div>
            </div>

            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
              <Clock3 className="w-6 h-6 mx-auto text-orange-700" />
              <div className="text-[10px] font-bold mt-1">Pending</div>
              <div className="text-xl font-black mt-1">
                {dashboard.grievance.pending}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-500">
            Grievance resolution workflow is currently a placeholder. No resolution status is inferred from the existing donation workflow.
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 8. RECENT COLLECTION ACTIVITY                                  */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-red-100 bg-white p-3">
        <SectionHeader
          number="8"
          title="Recent Collection Activity"
          subtitle="Latest donation activity from the live Donations sheet."
          restricted
        />

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[9px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Donation ID</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Donor Name</th>
                <th className="p-2 text-left">Seva</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-left">Mode</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Volunteer</th>
                <th className="p-2 text-center">Receipt</th>
              </tr>
            </thead>

            <tbody>
              {recentActivity.map(row => {
                const status = String(row.paymentStatus || '');
                const statusClass =
                  status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'Confirmation Pending'
                    ? 'bg-orange-100 text-orange-700'
                    : status === 'Repayment - Dispute'
                    ? 'bg-red-100 text-red-700'
                    : status === 'Repayment'
                    ? 'bg-violet-100 text-violet-700'
                    : status === 'Not Interested'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-blue-100 text-blue-700';

                return (
                  <tr key={row.donationId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold whitespace-nowrap">
                      {row.donationId}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {new Date(
                        row.updatedAt || row.createdAt || row.submittedAt
                      ).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </td>
                    <td className="p-2 font-semibold">{row.donorName}</td>
                    <td className="p-2">{row.sevaHead || (row as any).sevaCategory || '—'}</td>
                    <td className="p-2 text-right font-mono font-bold">
                      {money(row.amount)}
                    </td>
                    <td className="p-2">{row.paymentMode}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${statusClass}`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {row.volunteerName || row.confirmedBy || '—'}
                    </td>
                    <td className="p-2 text-center">
                      {row.paymentStatus === 'Paid' && row.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(row)}
                          className="px-2 py-1 rounded-md bg-amber-700 hover:bg-amber-800 text-white font-bold inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          View
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">
                    No recent collection activity available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400">
          <span>
            Showing latest {recentActivity.length} non-cancelled records.
          </span>
          {loadingCalculation && (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Loading dashboard calculation…
            </span>
          )}
        </div>
      </section>

      {/* Mobile role visibility note */}
      <div className="sm:hidden rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-[9px] text-emerald-700 font-semibold">
        Dashboard visibility is currently common to authenticated roles. Actual role-based access control will be implemented separately.
      </div>
    </div>
  );
}
