import React, { useState } from 'react';
import { 
  TrendingUp, 
  Banknote, 
  QrCode, 
  Receipt, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Users, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ChevronRight,
  ShieldCheck,
  Building2,
  PieChart,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import { DonationRecord, VolunteerRecord, TrustConfig } from '../types';
import { SEVA_CATEGORIES } from '../data/mockData';

interface CollectionsDashboardProps {
  donations: DonationRecord[];
  volunteers: VolunteerRecord[];
  trustConfig: TrustConfig;
  onViewReceipt: (donation: DonationRecord) => void;
  onOpenVolunteerManagement: () => void;
}

export function CollectionsDashboard({
  donations,
  volunteers,
  trustConfig,
  onViewReceipt,
  onOpenVolunteerManagement
}: CollectionsDashboardProps) {
  // Date & Filter states
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<'all' | 'Cash' | 'UPI'>('all');

  // Filter donations based on selections
  const filteredDonations = donations.filter(d => {
    // Status: only count Paid for collections totals
    const isPaid = d.paymentStatus === 'Paid';
    
    // Time filtering
    if (timeRange !== 'all') {
      const donationDate = new Date(d.submittedAt || d.createdAt);
      const now = new Date();
      
      if (timeRange === 'today') {
        const isToday = donationDate.toDateString() === now.toDateString();
        if (!isToday) return false;
      } else if (timeRange === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = donationDate.toDateString() === yesterday.toDateString();
        if (!isYesterday) return false;
      } else if (timeRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        if (donationDate < weekAgo) return false;
      }
    }

    // Volunteer filter
    if (selectedVolunteer !== 'all') {
      if (selectedVolunteer === 'Cash Counter') {
        if (d.paymentMode !== 'Cash') return false;
      } else {
        if (!d.confirmedBy.includes(selectedVolunteer)) return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all') {
      if (d.sevaCategory !== selectedCategory && !d.sevaHead?.includes(selectedCategory)) {
        return false;
      }
    }

    // Mode filter
    if (selectedMode !== 'all') {
      if (d.paymentMode !== selectedMode) return false;
    }

    return true;
  });

  // Calculate Metrics on Filtered Data
  const paidDonations = filteredDonations.filter(d => d.paymentStatus === 'Paid');
  const pendingDonations = filteredDonations.filter(d => d.paymentStatus === 'Confirmation Pending');

  const totalCollected = paidDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalCount = paidDonations.length;
  const avgAmount = totalCount > 0 ? Math.round(totalCollected / totalCount) : 0;

  const cashDonations = paidDonations.filter(d => d.paymentMode === 'Cash');
  const cashAmount = cashDonations.reduce((sum, d) => sum + d.amount, 0);
  const cashPercent = totalCollected > 0 ? Math.round((cashAmount / totalCollected) * 100) : 0;

  const upiDonations = paidDonations.filter(d => d.paymentMode === 'UPI');
  const upiAmount = upiDonations.reduce((sum, d) => sum + d.amount, 0);
  const upiPercent = totalCollected > 0 ? Math.round((upiAmount / totalCollected) * 100) : 0;

  const pendingUpiAmount = pendingDonations.reduce((sum, d) => sum + d.amount, 0);

  // Category Breakdown
  const categoryStats: { [cat: string]: { amount: number; count: number } } = {};
  
  // Initialize with known categories
  SEVA_CATEGORIES.forEach(c => {
    categoryStats[c.category] = { amount: 0, count: 0 };
  });
  categoryStats['Custom / Other Seva'] = { amount: 0, count: 0 };

  paidDonations.forEach(d => {
    const cat = d.sevaCategory || 'General Seva';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { amount: 0, count: 0 };
    }
    categoryStats[cat].amount += d.amount;
    categoryStats[cat].count += 1;
  });

  // Volunteer Performance Breakdown
  const volunteerStats: { [vol: string]: { name: string; amount: number; count: number } } = {
    'Cash Counter': { name: 'Cash Counter Staff', amount: 0, count: 0 }
  };

  volunteers.forEach(v => {
    volunteerStats[v.volunteerCode] = { name: v.volunteerName, amount: 0, count: 0 };
  });

  paidDonations.forEach(d => {
    if (d.paymentMode === 'Cash') {
      volunteerStats['Cash Counter'].amount += d.amount;
      volunteerStats['Cash Counter'].count += 1;
    } else {
      const match = volunteers.find(v => d.confirmedBy.includes(v.volunteerCode));
      if (match) {
        volunteerStats[match.volunteerCode].amount += d.amount;
        volunteerStats[match.volunteerCode].count += 1;
      } else if (d.confirmedBy) {
        if (!volunteerStats[d.confirmedBy]) {
          volunteerStats[d.confirmedBy] = { name: d.confirmedBy, amount: 0, count: 0 };
        }
        volunteerStats[d.confirmedBy].amount += d.amount;
        volunteerStats[d.confirmedBy].count += 1;
      }
    }
  });

  // Export Dashboard Summary CSV
  const handleExportSummary = () => {
    const headers = ['Category / Seva Head', 'Total Contributions Count', 'Total Collection (₹)', 'Share (%)'];
    const rows = Object.entries(categoryStats).map(([cat, stats]) => [
      `"${cat}"`,
      stats.count,
      stats.amount,
      totalCollected > 0 ? `${((stats.amount / totalCollected) * 100).toFixed(1)}%` : '0%'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `"SHREE JAGANNATH SEVA TRUST - COLLECTIONS SUMMARY REPORT"`,
      `"Generated: ${new Date().toLocaleString()}"`,
      `"Total Collection: ₹${totalCollected.toLocaleString('en-IN')}"`,
      `"Cash: ₹${cashAmount.toLocaleString('en-IN')} (${cashPercent}%) | UPI: ₹${upiAmount.toLocaleString('en-IN')} (${upiPercent}%)"`,
      '',
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SJST_Collections_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-md shadow-amber-900/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 font-serif">Trust Collections Dashboard</h2>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                Real-Time Audited
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive Financial Analytics, Seva Head Breakdown, and Volunteer Audit for {trustConfig.name}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={onOpenVolunteerManagement}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-amber-800" />
            <span>Manage Volunteers</span>
          </button>

          <button
            onClick={handleExportSummary}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* Timeframe Chips */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'yesterday' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 font-mono">{paidDonations.length}</strong> verified receipts
          </div>
        </div>

        {/* Dropdown Filters (Volunteer, Category, Mode) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Filter by Volunteer / Verifier
            </label>
            <select
              value={selectedVolunteer}
              onChange={e => setSelectedVolunteer(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            >
              <option value="all">All Volunteers &amp; Counters</option>
              <option value="Cash Counter">Cash Counter Staff</option>
              {volunteers.map(v => (
                <option key={v.volunteerCode} value={v.volunteerCode}>
                  {v.volunteerName} ({v.volunteerCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Filter by Seva Category
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            >
              <option value="all">All Puja &amp; Seva Categories</option>
              {SEVA_CATEGORIES.map(c => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
              <option value="Custom / Other Seva">Custom / Other Seva</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Filter by Payment Mode
            </label>
            <select
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            >
              <option value="all">All Modes (Cash + UPI)</option>
              <option value="Cash">Cash at Counter Only</option>
              <option value="UPI">Direct UPI Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Collections */}
        <div className="bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-3xl p-6 shadow-md shadow-amber-950/15 space-y-3 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-amber-600/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-amber-200 text-xs font-bold uppercase tracking-wider">
            <span>Total Collections</span>
            <TrendingUp className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-3xl font-black font-mono tracking-tight text-white">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-amber-200/80 flex items-center justify-between pt-1 border-t border-white/10">
            <span>{totalCount} Verified Contributions</span>
            <span>Avg: ₹{avgAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 2: Cash at Counter */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="text-emerald-700 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" />
              <span>Cash at Counter</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-black">
              {cashPercent}% Share
            </span>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight text-emerald-950">
            ₹{cashAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{cashDonations.length} Cash Receipts Issued</span>
            <span className="font-semibold text-emerald-800">Instant Verification</span>
          </div>
        </div>

        {/* Card 3: Direct UPI */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="text-amber-800 flex items-center gap-1.5">
              <QrCode className="w-4 h-4" />
              <span>Direct UPI (SBI)</span>
            </span>
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-black">
              {upiPercent}% Share
            </span>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight text-amber-950">
            ₹{upiAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{upiDonations.length} UPI Receipts Verified</span>
            <span className="font-mono text-amber-900">{trustConfig.upiId}</span>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="text-amber-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Pending Verifications</span>
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-black">
              {pendingDonations.length} Pending
            </span>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight text-amber-700">
            ₹{pendingUpiAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Awaiting Volunteer PIN</span>
            <span className="text-amber-800 font-semibold">6-Digit Code</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Category Breakdown (7 cols) + Volunteer Matrix & Payment Split (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Puja & Seva Category Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-800" />
              <h3 className="font-bold text-sm text-slate-900">Puja &amp; Seva Head Collection Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">By Category Total</span>
          </div>

          <div className="space-y-4">
            {Object.entries(categoryStats).map(([category, stats]) => {
              const share = totalCollected > 0 ? (stats.amount / totalCollected) * 100 : 0;
              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{stats.count} seva contributions</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{stats.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 min-w-[45px] text-right">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-700 to-amber-900 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(share > 0 ? 3 : 0, share))}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Volunteer Leaderboard & Payment Mode Distribution */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Payment Mode Distribution Bar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-800" />
              <span>Payment Mode Split</span>
            </h3>

            {/* Split Bar */}
            <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${cashPercent}%` }}
                title={`Cash: ${cashPercent}%`}
              ></div>
              <div
                className="bg-amber-800 h-full transition-all duration-500"
                style={{ width: `${upiPercent}%` }}
                title={`UPI: ${upiPercent}%`}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-1">
                <div className="text-emerald-800 font-bold flex items-center justify-between">
                  <span>Cash at Counter</span>
                  <span>{cashPercent}%</span>
                </div>
                <div className="font-mono text-base font-black text-emerald-950">
                  ₹{cashAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-700">{cashDonations.length} contributions</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-1">
                <div className="text-amber-900 font-bold flex items-center justify-between">
                  <span>Direct UPI (SBI)</span>
                  <span>{upiPercent}%</span>
                </div>
                <div className="font-mono text-base font-black text-amber-950">
                  ₹{upiAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-800">{upiDonations.length} contributions</div>
              </div>
            </div>
          </div>

          {/* Volunteer Audit / Leaderboard */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
                <span>Volunteer Collections Audit</span>
              </h3>
              <button
                onClick={onOpenVolunteerManagement}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5">
              {Object.entries(volunteerStats).map(([code, stat]) => (
                <div
                  key={code}
                  className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between text-xs hover:bg-amber-50/40 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">{stat.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {code} • {stat.count} verified receipts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-950">
                      ₹{stat.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {totalCollected > 0 ? `${((stat.amount / totalCollected) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Recent Collections Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Recent Audited Collections Feed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest contributions with verified receipt access and volunteer confirmation details.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Showing top {Math.min(10, paidDonations.length)} of {paidDonations.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt ID</th>
                <th className="py-3 px-4">Devotee / Contributor</th>
                <th className="py-3 px-4">Seva Head</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Confirmed By</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paidDonations.slice(0, 10).map(row => (
                <tr key={row.donationId} className="hover:bg-amber-50/30 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {row.donationId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{row.donorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{row.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-medium">
                      {row.sevaHead || 'General Seva'}
                    </span>
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
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {row.confirmedBy || 'Cash Counter'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onViewReceipt(row)}
                      className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
