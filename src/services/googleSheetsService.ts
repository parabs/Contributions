import { DonationRecord, TrustConfig, VolunteerRecord } from '../types';

export interface GoogleSheetsSyncConfig {
  spreadsheetId?: string;
  sheetName?: string; // "Form Responses 1" (Raw) or "Donations" (Master Ledger)
  webhookUrl?: string; // Google Apps Script Webhook URL
  autoSync: boolean;
}

export const TARGET_SPREADSHEET_ID = '1VfbM7FPXIniD_WftrFbNK6bmdd05GZAr6eluazShJBc';
export const TARGET_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1VfbM7FPXIniD_WftrFbNK6bmdd05GZAr6eluazShJBc/edit?gid=0#gid=0';
export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwo2HwQRNS8R5Vm81jHn87QFU75_xT64hdaTjEcvQfU84VAVchMwL7_JlP9EcNU2-w/exec';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsSyncConfig = {
  spreadsheetId: localStorage.getItem('sjst_sheets_spreadsheet_id') || TARGET_SPREADSHEET_ID,
  sheetName: 'Donations',
  webhookUrl: (localStorage.getItem('sjst_sheets_webhook_url') || '').trim(),
  autoSync: true
};

/**
 * Formats a Google Sheets A1 range safely by ensuring sheet titles with spaces
 * are wrapped in single quotes, e.g. `'Form Responses 1'!A:G`.
 */
export function formatA1Range(sheetTitle: string, cellRange: string): string {
  const cleanTitle = sheetTitle.replace(/^'|'$/g, '').trim();
  return `'${cleanTitle}'!${cellRange}`;
}

/**
 * Schema-Aware Dynamic Row Mapper for 'Form Responses 1' (7 Columns)
 * Inspects existing headers to place values in the exact matching column index.
 * Standard Schema:
 * [0] Col A: Timestamp
 * [1] Col B: Contributor Name
 * [2] Col C: Email ID
 * [3] Col D: Amount (₹)
 * [4] Col E: Payment Mode (Cash / UPI)
 * [5] Col F: Towards (Seva Head / Category)
 * [6] Col G: Confirmation Code (Cleared upon volunteer confirmation)
 */
export function buildHeaderMappedFormRow(headers: string[] | undefined, d: DonationRecord, clearCode = false): (string | number)[] {
  const formattedTime = d.submittedAt ? new Date(d.submittedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) : new Date().toLocaleString('en-IN');

  const finalCode = clearCode || d.paymentStatus === 'Paid' ? '' : (d.confirmationCode || '');
  const sevaName = d.sevaHead || d.sevaCategory || 'General Seva';
  const emailAddr = d.email || '';

  const defaultRow = [
    formattedTime,                                  // Col A - Timestamp
    d.donorName || 'Devotee',                      // Col B - Contributor Name
    emailAddr,                                      // Col C - Email ID
    Number(d.amount) || 0,                         // Col D - Amount (₹)
    d.paymentMode || 'UPI',                         // Col E - Payment Mode (Cash / UPI)
    sevaName,                                       // Col F - Towards (Seva Head / Category)
    finalCode                                       // Col G - Confirmation Code
  ];

  if (!headers || headers.length === 0) {
    return defaultRow;
  }

  return headers.map((hRaw, idx) => {
    const h = (hRaw || '').toLowerCase().trim();
    if (h.includes('timestamp') || (h.includes('date') && !h.includes('update')) || (h.includes('time') && !h.includes('mode') && !h.includes('update'))) {
      return formattedTime;
    }
    if (h.includes('towards') || h.includes('seva') || h.includes('head') || h.includes('category') || h.includes('purpose')) {
      return sevaName;
    }
    if (h.includes('email') || h.includes('mail')) {
      return emailAddr;
    }
    if (h.includes('amount') || h.includes('rupee') || h.includes('rs') || h.includes('₹') || h.includes('inr')) {
      return Number(d.amount) || 0;
    }
    if (h.includes('payment') || h.includes('mode') || h.includes('cash') || h.includes('upi')) {
      return d.paymentMode || 'UPI';
    }
    if (h.includes('code') || h.includes('pin') || h.includes('otp') || (h.includes('confirm') && !h.includes('by'))) {
      return finalCode;
    }
    if (h.includes('contributor') || h.includes('donor') || h.includes('name') || h.includes('devotee')) {
      return d.donorName || 'Devotee';
    }
    if (h.includes('mobile') || h.includes('phone') || h.includes('contact')) {
      return emailAddr || d.mobile || '';
    }
    if (idx < defaultRow.length) {
      return defaultRow[idx];
    }
    return '';
  });
}

/**
 * Schema-Aware Dynamic Row Mapper for Master 'Donations' Sheet (15 Columns A:O)
 */
export function buildHeaderMappedDonationsRow(headers: string[] | undefined, d: DonationRecord): (string | number)[] {
  const isPaid = d.paymentStatus === 'Paid';
  const sevaName = d.sevaHead || d.sevaCategory || 'General Seva';
  const emailAddr = d.email || '';

  const defaultRow = [
    d.donationId, // Col A (1) - Donation ID
    d.submittedAt || new Date().toISOString(), // Col B (2) - Submitted At
    sevaName, // Col C (3) - Towards (Seva Head / Category)
    d.donorName || 'Devotee', // Col D (4) - Donor Name
    emailAddr, // Col E (5) - Email
    Number(d.amount) || 0, // Col F (6) - Amount
    d.paymentMode || 'UPI', // Col G (7) - Payment Mode (Cash/UPI)
    isPaid ? 'Paid' : 'Pending', // Col H (8) - Payment Status (Pending / Paid)
    d.paymentReference || (d.paymentMode === 'Cash' ? (isPaid ? 'CASH-COUNTER-VERIFIED' : 'CASH-PENDING-VERIFY') : (isPaid ? `UPI-CONFIRMED-${d.confirmationCode}` : `UPI-PIN-${d.confirmationCode}`)), // Col I (9) - Payment Reference
    d.receiptUrl || '', // Col J (10) - Final Receipt URL
    d.emailStatus === 'Sent' ? 'Sent' : 'Pending', // Col K (11) - Email Status
    d.emailMessageId || (isPaid ? `MSG-${d.donationId.split('-').pop()}` : ''), // Col L (12) - Email Message ID
    d.createdAt || d.submittedAt || new Date().toISOString(), // Col M (13) - Created At
    d.updatedAt || new Date().toISOString(), // Col N (14) - Updated At
    d.confirmedBy || '' // Col O (15) - Confirmed by (Blank on Pending, filled on Paid)
  ];

  if (!headers || headers.length === 0) {
    return defaultRow;
  }

  return headers.map((hRaw, idx) => {
    const h = (hRaw || '').toLowerCase().trim();
    if (h.includes('donation id') || h.includes('id') || h === 'donationid') return d.donationId;
    if (h.includes('submitted') || (h.includes('date') && !h.includes('update')) || (h.includes('time') && !h.includes('update'))) return d.submittedAt || new Date().toISOString();
    if (h.includes('towards') || h.includes('seva') || h.includes('category') || h.includes('head') || h.includes('purpose')) return sevaName;
    if (h.includes('donor') || h.includes('contributor') || h.includes('devotee') || (h.includes('name') && !h.includes('volunteer'))) return d.donorName || 'Devotee';
    if (h.includes('email') || h.includes('mail')) return emailAddr;
    if (h.includes('amount') || h.includes('rupee') || h.includes('₹') || h.includes('rs') || h.includes('inr')) return Number(d.amount) || 0;
    if (h.includes('mode') || (h.includes('payment') && !h.includes('status') && !h.includes('ref'))) return d.paymentMode || 'UPI';
    if (h.includes('status') && !h.includes('email') && !h.includes('whatsapp')) return isPaid ? 'Paid' : 'Pending';
    if (h.includes('reference') || h.includes('ref') || h.includes('transaction') || h.includes('txn') || h.includes('utr')) {
      return d.paymentReference || (d.paymentMode === 'Cash' ? (isPaid ? 'CASH-COUNTER-VERIFIED' : 'CASH-PENDING-VERIFY') : (isPaid ? `UPI-CONFIRMED-${d.confirmationCode}` : `UPI-PIN-${d.confirmationCode}`));
    }
    if (h.includes('receipt') || h.includes('drive') || h.includes('pdf') || h.includes('url') || h.includes('link')) return d.receiptUrl || '';
    if (h.includes('whatsapp') || (h.includes('email') && h.includes('status'))) return d.emailStatus === 'Sent' ? 'Sent' : 'Pending';
    if (h.includes('message id') || h.includes('msg')) return d.emailMessageId || '';
    if (h.includes('created')) return d.createdAt || d.submittedAt || new Date().toISOString();
    if (h.includes('updated') || h.includes('modified')) return d.updatedAt || new Date().toISOString();
    if (h.includes('confirmed by') || h.includes('verified by') || h.includes('volunteer') || (h.includes('confirm') && !h.includes('code') && !h.includes('pin'))) {
      return d.confirmedBy || '';
    }
    if (idx < defaultRow.length) {
      return defaultRow[idx];
    }
    return '';
  });
}

/**
 * Raw Donor Submissions Schema for 'Form Responses 1' Sheet (Exact 7 Columns):
 * [0] Col A: Timestamp
 * [1] Col B: Contributor Name
 * [2] Col C: Email ID
 * [3] Col D: Amount (₹)
 * [4] Col E: Payment Mode (Cash / UPI)
 * [5] Col F: Towards (Seva Head / Category)
 * [6] Col G: Confirmation Code
 */
export function formatFormResponses1Row(d: DonationRecord): (string | number)[] {
  return buildHeaderMappedFormRow(undefined, d);
}

/**
 * Master Operational Ledger Schema for 'Donations' Sheet (15 Columns):
 */
export function formatDonationRow(d: DonationRecord): (string | number)[] {
  return buildHeaderMappedDonationsRow(undefined, d);
}

/**
 * Ensures required sheets/tabs exist in the target spreadsheet.
 * If missing, automatically creates them with proper column headers.
 */
export async function ensureSheetStructure(
  accessToken: string,
  spreadsheetId: string
): Promise<{ formResponsesTab: string; donationsTab: string; rawTitles: string[] }> {
  const cleanId = (spreadsheetId || '').trim();
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!metaRes.ok) {
      if (metaRes.status === 401 || metaRes.status === 403) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google_auth_expired', { 
            detail: { reason: 'sheets_meta_unauthenticated' } 
          }));
        }
      }
      return { formResponsesTab: 'Form Responses 1', donationsTab: 'Donations', rawTitles: [] };
    }

    const metaJson = await metaRes.json();
    const sheets = metaJson.sheets || [];
    const titles: string[] = sheets.map((s: any) => s.properties?.title || '').filter(Boolean);

    const hasFormResponses = titles.some((t: string) => t.toLowerCase().includes('form responses') || t.toLowerCase().includes('form 1') || t === 'Form Responses 1');
    const existingFormTab = titles.find((t: string) => t.toLowerCase().includes('form responses') || t.toLowerCase().includes('form 1')) || '';

    const hasDonations = titles.some((t: string) => t.toLowerCase() === 'donations');
    const existingDonationsTab = titles.find((t: string) => t.toLowerCase() === 'donations') || '';

    const requests: any[] = [];
    if (!hasFormResponses && titles.length > 0 && !titles.includes('Form Responses 1')) {
      requests.push({
        addSheet: {
          properties: { title: 'Form Responses 1' }
        }
      });
    }

    if (!hasDonations && !titles.includes('Donations')) {
      requests.push({
        addSheet: {
          properties: { title: 'Donations' }
        }
      });
    }

    let createdFormTab = false;
    let createdDonationsTab = false;

    if (requests.length > 0) {
      try {
        const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests })
        });

        if (batchRes.ok) {
          if (!hasFormResponses) createdFormTab = true;
          if (!hasDonations) createdDonationsTab = true;

          // Initialize headers for newly added tabs
          if (!hasFormResponses) {
            const formHeaders = [['Timestamp', 'Contributor Name', 'Email ID', 'Amount (₹)', 'Payment Mode (Cash / UPI)', 'Towards (Seva Head / Category)', 'Confirmation Code']];
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(formatA1Range('Form Responses 1', 'A1:G1'))}?valueInputOption=USER_ENTERED`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ range: formatA1Range('Form Responses 1', 'A1:G1'), majorDimension: 'ROWS', values: formHeaders })
            }).catch(() => {});
          }

          if (!hasDonations) {
            const donHeaders = [[
              'Donation ID', 'Submitted At', 'Towards (Seva Head / Category)', 'Donor Name', 'Email',
              'Amount', 'Payment Mode', 'Payment Status', 'Payment Reference', 'Final Receipt URL',
              'WhatsApp Status', 'WhatsApp Message ID', 'Created At', 'Updated At', 'Confirmed by'
            ]];
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(formatA1Range('Donations', 'A1:O1'))}?valueInputOption=USER_ENTERED`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ range: formatA1Range('Donations', 'A1:O1'), majorDimension: 'ROWS', values: donHeaders })
            }).catch(() => {});
          }
        }
      } catch (addErr) {
        console.warn('Auto-create sheet tab notice:', addErr);
      }
    }

    // Determine final form tab name
    let formResponsesTab = 'Form Responses 1';
    if (hasFormResponses && existingFormTab) {
      formResponsesTab = existingFormTab;
    } else if (createdFormTab) {
      formResponsesTab = 'Form Responses 1';
    } else if (titles.length > 0) {
      formResponsesTab = titles[0];
    }

    // Determine final donations tab name
    let donationsTab = 'Donations';
    if (hasDonations && existingDonationsTab) {
      donationsTab = existingDonationsTab;
    } else if (createdDonationsTab) {
      donationsTab = 'Donations';
    } else if (titles.length > 1) {
      donationsTab = titles[1];
    } else if (titles.length > 0) {
      donationsTab = titles[0];
    }

    return {
      formResponsesTab,
      donationsTab,
      rawTitles: titles
    };
  } catch (err) {
    console.warn('ensureSheetStructure fallback:', err);
    return { formResponsesTab: 'Form Responses 1', donationsTab: 'Donations', rawTitles: [] };
  }
}

/**
 * Sync (Append or Update) donation to Google Sheet via Google Sheets API (OAuth) OR Google Apps Script Webhook.
 * 
 * Flow:
 * 1. Initial Devotee Submission (Pending):
 *    - Appends raw submission row into 'Form Responses 1' (A:G)
 *    - Appends/Upserts initial record into 'Donations' (A:O) with Payment Status = 'Pending'
 * 
 * 2. Volunteer Verification / Confirmation (Paid):
 *    - Finds existing row in 'Donations' (A:O) matching donationId or confirmationCode
 *    - Updates that row with Payment Status = 'Paid', Confirmed By = Volunteer Name, Receipt URL = driveUrl
 *    - If row not found in Donations, appends it as Paid.
 */
export async function syncDonationToGoogleSheet(
  donation: DonationRecord,
  accessToken?: string | null,
  customConfig?: Partial<GoogleSheetsSyncConfig>
): Promise<{ success: boolean; method?: 'api' | 'webhook' | 'local'; message?: string; error?: string }> {
  const config = { ...DEFAULT_SHEETS_CONFIG, ...customConfig };
  const webhookUrl = (config.webhookUrl || localStorage.getItem('sjst_sheets_webhook_url') || DEFAULT_WEBHOOK_URL)?.trim();
  const spreadsheetId = (config.spreadsheetId || localStorage.getItem('sjst_sheets_spreadsheet_id') || TARGET_SPREADSHEET_ID).trim();
  const sheetName = 'Donations'

  // Resolve token from parameter, sessionStorage, or localStorage
  const effectiveToken = (
    accessToken || 
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sjst_gmail_access_token') : null) || 
    (typeof localStorage !== 'undefined' ? localStorage.getItem('sjst_gmail_access_token') : null)
  )?.trim() || null;

  const isPaid = donation.paymentStatus === 'Paid';
  const isFormResponses = sheetName.toLowerCase().includes('form');
  const sevaName = donation.sevaHead || donation.sevaCategory || 'General Seva';

  const formattedTimestamp = donation.submittedAt ? new Date(donation.submittedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) : new Date().toLocaleString('en-IN');

  let webhookSuccess = false;

// 1. Google Apps Script Webhook Dispatch
  if (webhookUrl && webhookUrl.startsWith('https://script.google.com/')) {
    try {
      const webhookPayload = {
        action: isPaid ? 'verifyDonation' : 'sync_donation',
        donationId: donation.donationId,
        timestamp: formattedTimestamp,
        donorName: donation.donorName || 'Devotee',
        email: donation.email || '',
        amount: Number(donation.amount || 0),
        paymentMode: donation.paymentMode || 'UPI',
        towards: sevaName,
        confirmationCode: donation.confirmationCode || '',
        paymentStatus: isPaid ? 'Paid' : 'Pending',
        confirmedBy: donation.confirmedBy || '',
        receiptUrl: donation.receiptUrl || '',
        submittedAt: donation.submittedAt || new Date().toISOString(),
        record: donation
      };

      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // Crucial: Bypasses browser CORS preflight check
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Crucial: Avoids triggering JSON preflight headers
        },
        body: JSON.stringify(webhookPayload)
      });
     webhookSuccess = true;
    } catch (whErr: any) {
      console.warn('Google Apps Script Webhook dispatch notice:', whErr);
    }
  }

  // 2. Direct Google Sheets API (OAuth Access Token + Spreadsheet ID) - Schema-Aware Updates
  if (effectiveToken && spreadsheetId) {
    try {
      // Ensure tab structure exists
      const { formResponsesTab, donationsTab, rawTitles } = await ensureSheetStructure(effectiveToken, spreadsheetId);

      let syncedOperations: string[] = [];
      let apiErrors: string[] = [];

      // ========================================================
      // A. Form Responses 1 Sync
      // ========================================================
      // If initial submission or pending, check if row with this confirmation code already exists
      if (!isPaid) {
        // Read existing Form Responses rows to check for existing submission with same confirmationCode
        let formHeaders: string[] = [];
        let existingFormRowIdx = -1;
        try {
          const formReadRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(formResponsesTab, 'A1:G'))}`,
            { headers: { Authorization: `Bearer ${effectiveToken}` } }
          );
          if (formReadRes.ok) {
            const formJson = await formReadRes.json();
            const formRows: (string | number)[][] = formJson.values || [];
            if (formRows.length > 0) {
              formHeaders = formRows[0].map(h => String(h));
              for (let i = 1; i < formRows.length; i++) {
                const codeInRow = String(formRows[i][6] || '').trim();
                if (
                  (donation.confirmationCode && codeInRow === donation.confirmationCode) ||
                  (codeInRow && codeInRow.includes(donation.confirmationCode))
                ) {
                  existingFormRowIdx = i + 1;
                  break;
                }
              }
            }
          }
        } catch (hErr) {}

        const formRow = buildHeaderMappedFormRow(formHeaders.length > 0 ? formHeaders : undefined, donation);
        const colEndLetter = formHeaders.length > 0 ? String.fromCharCode(64 + Math.min(26, formHeaders.length)) : 'G';

        if (existingFormRowIdx > 0) {
          // UPDATE existing row in Form Responses 1 (prevents duplicate on retry / delayed confirmation)
          const updateFormRange = formatA1Range(formResponsesTab, `A${existingFormRowIdx}:${colEndLetter}${existingFormRowIdx}`);
          const updateFormUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(updateFormRange)}?valueInputOption=USER_ENTERED`;
          const updateFormRes = await fetch(updateFormUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: updateFormRange,
              majorDimension: 'ROWS',
              values: [formRow]
            })
          });
          if (updateFormRes.ok) {
            syncedOperations.push(`Updated ${formResponsesTab} (Row ${existingFormRowIdx})`);
          }
        } else {
          // Append new entry to Form Responses 1
          const primaryRange = formatA1Range(formResponsesTab, `A:${colEndLetter}`);
          const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(primaryRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          
          let formRes = await fetch(appendUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              majorDimension: 'ROWS',
              values: [formRow]
            })
          });

          // If primary tab failed with range error, retry with first available tab (e.g. Sheet1)
          if (!formRes.ok && rawTitles.length > 0 && rawTitles[0] !== formResponsesTab) {
            const fallbackRange = formatA1Range(rawTitles[0], 'A:G');
            const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(fallbackRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
            const retryRes = await fetch(fallbackUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${effectiveToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                majorDimension: 'ROWS',
                values: [formRow]
              })
            });
            if (retryRes.ok) {
              formRes = retryRes;
            }
          }

          if (formRes.ok) {
            syncedOperations.push(`Appended to ${formResponsesTab}`);
          } else {
            if (formRes.status === 401 || formRes.status === 403) {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('google_auth_expired', { 
                  detail: { reason: 'sheets_append_unauthenticated' } 
                }));
              }
            }
            const errJson = await formRes.json().catch(() => ({}));
            apiErrors.push(`Form Responses: ${errJson.error?.message || formRes.statusText}`);
          }
        }
      } else {
        // Devotee contribution is now verified by volunteer (isPaid === true):
        // Remove / Clear the confirmation PIN from Form Responses 1 Column G for this row
        try {
          const formReadRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(formResponsesTab, 'A1:G'))}`,
            { headers: { Authorization: `Bearer ${effectiveToken}` } }
          );
          if (formReadRes.ok) {
            const formJson = await formReadRes.json();
            const formRows: (string | number)[][] = formJson.values || [];
            for (let i = 1; i < formRows.length; i++) {
              const codeInRow = String(formRows[i][6] || '').trim();
              const nameInRow = String(formRows[i][1] || '').trim();
              if (
                (donation.confirmationCode && codeInRow === donation.confirmationCode) ||
                (donation.confirmationCode && codeInRow.includes(donation.confirmationCode)) ||
                (donation.donorName && nameInRow.toLowerCase() === donation.donorName.toLowerCase() && codeInRow.length > 0)
              ) {
                const rowIndex = i + 1;
                // Clear Column G (Confirmation Code)
                const clearCellRange = formatA1Range(formResponsesTab, `G${rowIndex}`);
                await fetch(
                  `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(clearCellRange)}?valueInputOption=USER_ENTERED`,
                  {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${effectiveToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      range: clearCellRange,
                      majorDimension: 'ROWS',
                      values: [['']]
                    })
                  }
                );
                syncedOperations.push(`Cleared Code in ${formResponsesTab} (Row ${rowIndex})`);
                break;
              }
            }
          }
        } catch (clearErr) {
          console.warn('Form Responses code removal warning:', clearErr);
        }
      }

      // ========================================================
      // B. Donations Master Ledger (A:O)
      // ========================================================
      // Read Donations tab to check headers and if row already exists
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(donationsTab, 'A1:O'))}`;
      
      const readRes = await fetch(readUrl, {
        headers: { Authorization: `Bearer ${effectiveToken}` }
      });

      let donHeaders: string[] = [];
      let foundRowIndex = -1;
      if (readRes.ok) {
        const readData = await readRes.json();
        const rows: string[][] = readData.values || [];
        if (rows.length > 0) {
          donHeaders = rows[0];
        }
        for (let i = 1; i < rows.length; i++) {
          const rowId = rows[i][0] ? String(rows[i][0]).trim() : '';
          const rowRef = rows[i][8] ? String(rows[i][8]).trim() : '';
          
          if (
            (rowId && rowId === donation.donationId) ||
            (donation.confirmationCode && rowRef.includes(donation.confirmationCode))
          ) {
            foundRowIndex = i + 1; // 1-based row index in Google Sheets
            break;
          }
        }
      } else if (readRes.status === 401 || readRes.status === 403) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google_auth_expired', { 
            detail: { reason: 'sheets_read_unauthenticated' } 
          }));
        }
      }

      const donRow = buildHeaderMappedDonationsRow(donHeaders.length > 0 ? donHeaders : undefined, donation);

      if (foundRowIndex > 0) {
        // UPDATE existing row in Donations tab
        const updateRange = formatA1Range(donationsTab, `A${foundRowIndex}:O${foundRowIndex}`);
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
        
        const updateRes = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: updateRange,
            majorDimension: 'ROWS',
            values: [donRow]
          })
        });

        if (updateRes.ok) {
          syncedOperations.push(`Updated ${donationsTab} (Row ${foundRowIndex} - ${donation.paymentStatus} by ${donation.confirmedBy || 'Volunteer'})`);
        } else {
          const errJson = await updateRes.json().catch(() => ({}));
          apiErrors.push(`Donations Update: ${errJson.error?.message || updateRes.statusText}`);
        }
      } else {
        // APPEND new master row to Donations tab
        const donAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(donationsTab, 'A:O'))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        
        let appendRes = await fetch(donAppendUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            majorDimension: 'ROWS',
            values: [donRow]
          })
        });

        // If Donations tab append failed with range error and fallback tab exists, try rawTitles[0]
        if (!appendRes.ok && rawTitles.length > 0 && rawTitles[0] !== donationsTab) {
          const fallbackDonUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(rawTitles[0], 'A:O'))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          const retryDonRes = await fetch(fallbackDonUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              majorDimension: 'ROWS',
              values: [donRow]
            })
          });
          if (retryDonRes.ok) {
            appendRes = retryDonRes;
          }
        }

        if (appendRes.ok) {
          syncedOperations.push(`Appended to ${donationsTab} (${donation.paymentStatus})`);
        } else {
          const errJson = await appendRes.json().catch(() => ({}));
          apiErrors.push(`Donations Append: ${errJson.error?.message || appendRes.statusText}`);
        }
      }

      if (syncedOperations.length > 0) {
        return {
          success: true,
          method: 'api',
          message: `Live Sync Success: ${syncedOperations.join(' & ')}`
        };
      } else if (webhookSuccess) {
        return {
          success: true,
          method: 'webhook',
          message: `Dispatched to Google Sheet Webhook ("${sheetName}")`
        };
      } else if (apiErrors.length > 0) {
        return {
          success: false,
          method: 'api',
          error: `Google Sheets API error: ${apiErrors.join('; ')}`
        };
      }
    } catch (e: any) {
      console.error('Google Sheets API sync error:', e);
      if (webhookSuccess) {
        return {
          success: true,
          method: 'webhook',
          message: `Dispatched to Google Sheet Webhook ("${sheetName}")`
        };
      }
      return {
        success: false,
        error: e.message || 'Failed to execute Google Sheets API'
      };
    }
  }

  // 3. Fallback when Webhook was dispatched
  if (webhookSuccess) {
    return {
      success: true,
      method: 'webhook',
      message: `Dispatched to Google Apps Script Webhook ("${sheetName}")`
    };
  }

  // 4. Fallback when neither authenticated nor webhook configured
  return {
    success: false,
    method: 'local',
    message: 'Saved to local browser database. Connect Google Account in top bar or configure Google Apps Script Webhook to sync directly to your live Google Sheet.',
    error: 'NO_GOOGLE_ACCOUNT'
  };
}

/**
 * Batch sync all donation records to Google Sheet
 */
export async function batchSyncAllDonations(
  donations: DonationRecord[],
  accessToken?: string | null,
  spreadsheetId = TARGET_SPREADSHEET_ID
): Promise<{ success: boolean; count: number; message: string; error?: string }> {
  if (!accessToken) {
    return {
      success: false,
      count: 0,
      message: 'Google Sign-In is required to push directly to Google Sheets.',
      error: 'NO_ACCESS_TOKEN'
    };
  }

  try {
    const { formResponsesTab, donationsTab } = await ensureSheetStructure(accessToken, spreadsheetId);

    const rawRows = donations.map(d => formatFormResponses1Row(d));
    const donRows = donations.map(d => formatDonationRow(d));

    // Append to Form Responses 1
    const formUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(formResponsesTab, 'A:G'))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    await fetch(formUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: formatA1Range(formResponsesTab, 'A:G'), majorDimension: 'ROWS', values: rawRows })
    });

    // Append to Donations
    const donUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(donationsTab, 'A:O'))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const donRes = await fetch(donUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: formatA1Range(donationsTab, 'A:O'), majorDimension: 'ROWS', values: donRows })
    });

    if (donRes.ok) {
      return {
        success: true,
        count: donations.length,
        message: `Successfully synced ${donations.length} records into "${formResponsesTab}" and "${donationsTab}" tabs!`
      };
    } else {
      const err = await donRes.json().catch(() => ({}));
      return {
        success: false,
        count: 0,
        message: err?.error?.message || `Failed with status ${donRes.status}`,
        error: err?.error?.message
      };
    }
  } catch (e: any) {
    return {
      success: false,
      count: 0,
      message: e.message || 'Network error syncing to Google Sheet',
      error: e.message
    };
  }
}

/**
 * Fix and align headers in user's Google Sheet
 */
export async function repairAndAlignGoogleSheetHeaders(
  accessToken: string,
  spreadsheetId: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const { formResponsesTab, donationsTab } = await ensureSheetStructure(accessToken, spreadsheetId);
    const formHeaders = [['Timestamp', 'Contributor Name', 'Email ID', 'Amount (₹)', 'Payment Mode (Cash / UPI)', 'Towards (Seva Head / Category)', 'Confirmation Code']];
    const donHeaders = [[
      'Donation ID', 'Submitted At', 'Towards (Seva Head / Category)', 'Donor Name', 'Email',
      'Amount', 'Payment Mode', 'Payment Status', 'Payment Reference', 'Final Receipt URL',
      'Email Status', 'Email Message ID', 'Created At', 'Updated At', 'Confirmed by'
    ]];

    // Overwrite Row 1 in Form Responses
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(formResponsesTab, 'A1:G1'))}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: formatA1Range(formResponsesTab, 'A1:G1'), majorDimension: 'ROWS', values: formHeaders })
    });

    // Overwrite Row 1 in Donations
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(formatA1Range(donationsTab, 'A1:O1'))}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: formatA1Range(donationsTab, 'A1:O1'), majorDimension: 'ROWS', values: donHeaders })
    });

    return {
      success: true,
      message: `Successfully aligned and formatted 7 columns in "${formResponsesTab}" and 15 columns in "${donationsTab}"!`
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Failed to repair headers',
      error: e.message
    };
  }
}

/**
 * Fetch live rows from Google Sheets (Header-Aware)
 */
export async function fetchDonationsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName = 'Donations'
): Promise<{ success: boolean; donations?: DonationRecord[]; error?: string }> {
  try {
    const isDonations = sheetName.toLowerCase().includes('donations');
    const range = isDonations ? formatA1Range(sheetName, 'A1:O') : formatA1Range(sheetName, 'A1:Z');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err?.error?.message || `Failed to fetch sheet HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const allRows: any[][] = data.values || [];
    if (allRows.length === 0) {
      return { success: true, donations: [] };
    }

    const headers = allRows[0].map((h: any) => String(h || '').toLowerCase().trim());
    const dataRows = allRows.slice(1);

    // Map column indices
    const findCol = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));

    if (isDonations) {
      const idIdx = findCol(['donation id', 'id']);
      const timeIdx = findCol(['submitted', 'date', 'time']);
      const sevaIdx = findCol(['towards', 'seva', 'head', 'category']);
      const nameIdx = findCol(['donor', 'contributor', 'name', 'devotee']);
      const emailIdx = findCol(['email', 'mail']);
      const amtIdx = findCol(['amount', 'rupee', '₹', 'rs']);
      const modeIdx = findCol(['mode', 'payment mode', 'cash', 'upi']);
      const statusIdx = findCol(['status', 'payment status']);
      const refIdx = findCol(['reference', 'ref']);
      const receiptIdx = findCol(['receipt', 'url', 'drive']);
      const emailStatusIdx = findCol(['whatsapp status', 'email status']);
      const msgIdIdx = findCol(['message id', 'msg']);
      const createIdx = findCol(['created']);
      const updateIdx = findCol(['updated']);
      const confirmIdx = findCol(['confirmed by', 'volunteer']);

      const donations: DonationRecord[] = dataRows.map((row, index) => {
        const donationId = (idIdx >= 0 && row[idIdx]) ? String(row[idIdx]).trim() : `SJST-${Date.now()}-${index}`;
        const submittedAt = (timeIdx >= 0 && row[timeIdx]) ? String(row[timeIdx]).trim() : new Date().toISOString();
        const sevaHead = (sevaIdx >= 0 && row[sevaIdx]) ? String(row[sevaIdx]).trim() : 'General Seva';
        const donorName = (nameIdx >= 0 && row[nameIdx]) ? String(row[nameIdx]).trim() : 'Devotee';
        const email = (emailIdx >= 0 && row[emailIdx]) ? String(row[emailIdx]).trim() : '';
        const amount = (amtIdx >= 0 && row[amtIdx]) ? Number(String(row[amtIdx]).replace(/[^0-9.]/g, '')) || 0 : 0;
        const paymentMode = (modeIdx >= 0 && String(row[modeIdx]).toLowerCase().includes('cash')) ? 'Cash' : 'UPI';
        const statusVal = (statusIdx >= 0 && row[statusIdx]) ? String(row[statusIdx]).trim().toLowerCase() : '';
        const paymentStatus = (statusVal === 'paid' || statusVal === 'completed' || statusVal === 'confirmed') ? 'Paid' : 'Confirmation Pending';
        const paymentReference = (refIdx >= 0 && row[refIdx]) ? String(row[refIdx]).trim() : '';
        const receiptUrl = (receiptIdx >= 0 && row[receiptIdx]) ? String(row[receiptIdx]).trim() : '';
        const emailStatus = (emailStatusIdx >= 0 && String(row[emailStatusIdx]).toLowerCase().includes('sent')) ? 'Sent' : 'Pending';
        const emailMessageId = (msgIdIdx >= 0 && row[msgIdIdx]) ? String(row[msgIdIdx]).trim() : '';
        const createdAt = (createIdx >= 0 && row[createIdx]) ? String(row[createIdx]).trim() : submittedAt;
        const updatedAt = (updateIdx >= 0 && row[updateIdx]) ? String(row[updateIdx]).trim() : new Date().toISOString();
        const confirmedBy = (confirmIdx >= 0 && row[confirmIdx]) ? String(row[confirmIdx]).trim() : '';

        // Extract 6-digit confirmation code from ref if present
        let confirmationCode = '';
        const codeMatch = paymentReference.match(/\b\d{6}\b/);
        if (codeMatch) {
          confirmationCode = codeMatch[0];
        }

        return {
          donationId,
          submittedAt,
          donorName,
          mobile: '',
          email,
          phone: '',
          amount,
          paymentMode,
          paymentStatus,
          paymentReference,
          receiptUrl,
          whatsappStatus: emailStatus === 'Sent' ? 'Sent' : 'Pending',
          whatsappMessageId: emailMessageId,
          emailStatus,
          emailMessageId,
          createdAt,
          updatedAt,
          confirmedBy,
          confirmationCode,
          sevaHead,
          sevaCategory: sevaHead
        };
      });

      return { success: true, donations };
    } else {
      // Form Responses Tab (7 Columns: Timestamp, Contributor Name, Email ID, Amount, Payment Mode, Towards, Confirmation Code)
      const timeIdx = findCol(['timestamp', 'date', 'time']);
      const nameIdx = findCol(['contributor', 'donor', 'name', 'devotee']);
      const emailIdx = findCol(['email', 'mail']);
      const amtIdx = findCol(['amount', 'rupee', '₹', 'rs']);
      const modeIdx = findCol(['mode', 'payment', 'cash', 'upi']);
      const sevaIdx = findCol(['towards', 'seva', 'head', 'category', 'purpose']);
      const codeIdx = findCol(['code', 'pin', 'confirm', 'otp']);

      const rawDonations: (DonationRecord | null)[] = dataRows.map((row, index) => {
        const rawTime = (timeIdx >= 0 && row[timeIdx]) ? row[timeIdx] : (row[0] || '');
        const submittedAt = rawTime ? String(rawTime).trim() : new Date().toISOString();

        const rawName = (nameIdx >= 0 && row[nameIdx]) ? row[nameIdx] : (row[1] || '');
        const donorName = rawName ? String(rawName).trim() : 'Devotee';

        const rawEmail = (emailIdx >= 0 && row[emailIdx]) ? row[emailIdx] : (row[2] || '');
        const email = rawEmail ? String(rawEmail).trim() : '';

        const rawAmt = (amtIdx >= 0 && row[amtIdx]) ? row[amtIdx] : (row[3] || 0);
        const amount = Number(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;

        const rawMode = (modeIdx >= 0 && row[modeIdx]) ? row[modeIdx] : (row[4] || 'UPI');
        const paymentMode = String(rawMode).toLowerCase().includes('cash') ? 'Cash' : 'UPI';

        const rawSeva = (sevaIdx >= 0 && row[sevaIdx]) ? row[sevaIdx] : (row[5] || 'General Seva');
        const sevaHead = rawSeva ? String(rawSeva).trim() : 'General Seva';

        const rawCode = (codeIdx >= 0 && row[codeIdx]) ? row[codeIdx] : (row[6] || '');
        const confirmationCode = String(rawCode).trim().replace(/\D/g, '');

        // Only include Form Responses rows where a confirmation code is present (and hasn't been cleared upon verification)
        if (!confirmationCode || confirmationCode.length < 4) {
          return null;
        }

        const donationId = `SJST-${new Date(submittedAt).getTime() || Date.now()}-${String(index + 1).padStart(4, '0')}`;

        return {
          donationId,
          submittedAt,
          donorName,
          mobile: '',
          email,
          phone: '',
          amount,
          paymentMode,
          paymentStatus: 'Confirmation Pending' as const,
          paymentReference: `UPI-PIN-${confirmationCode}`,
          receiptUrl: '',
          whatsappStatus: 'Pending' as const,
          whatsappMessageId: '',
          emailStatus: email ? ('Pending' as const) : ('Not Required' as const),
          emailMessageId: '',
          createdAt: submittedAt,
          updatedAt: submittedAt,
          confirmedBy: '',
          confirmationCode,
          sevaHead,
          sevaCategory: sevaHead
        };
      });

      const donations: DonationRecord[] = rawDonations.filter((d): d is DonationRecord => d !== null);
      return { success: true, donations };
    }
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Error fetching records from Google Sheet'
    };
  }
}

/**
 * Generate CSV data for 1-click Google Sheet / Excel import matching exact 15-column schema
 */
export function exportDonationsToCsv(donations: DonationRecord[]): string {
  const headers = [
    'Donation ID',
    'Submitted At',
    'Towards (Seva Head / Category)',
    'Donor Name',
    'Email',
    'Amount',
    'Payment Mode',
    'Payment Status',
    'Payment Reference',
    'Final Receipt URL',
    'WhatsApp Status',
    'WhatsApp Message ID',
    'Created At',
    'Updated At',
    'Confirmed by'
  ];

  const rows = donations.map(d => {
    return formatDonationRow(d).map(val => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function downloadCsvFile(content: string, fileName = 'SHREE_JAGANNATH_SEVA_TRUST_LEDGER.csv') {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Saves Google Sheets configuration to localStorage
 */
export function saveSheetsConfig(config: GoogleSheetsSyncConfig) {
  if (config.spreadsheetId) localStorage.setItem('sjst_sheets_spreadsheet_id', config.spreadsheetId.trim());
  if (config.sheetName) localStorage.setItem('sjst_sheets_tab_name', config.sheetName.trim());
  if (config.webhookUrl) localStorage.setItem('sjst_sheets_webhook_url', config.webhookUrl.trim());
  localStorage.setItem('sjst_sheets_auto_sync', config.autoSync ? 'true' : 'false');
}

/**
 * Gets current Google Sheets configuration
 */
export function getSheetsConfig(): GoogleSheetsSyncConfig {
  return {
    spreadsheetId: localStorage.getItem('sjst_sheets_spreadsheet_id') || TARGET_SPREADSHEET_ID,
    sheetName: localStorage.getItem('sjst_sheets_tab_name') || 'Form Responses 1',
    webhookUrl: localStorage.getItem('sjst_sheets_webhook_url') || DEFAULT_WEBHOOK_URL,
    autoSync: localStorage.getItem('sjst_sheets_auto_sync') !== 'false'
  };
}

/**
 * Appends a test row with the exact 7 columns directly to the Google Sheet
 */
export async function testAppendRowToGoogleSheet(
  accessToken?: string | null,
  customConfig?: Partial<GoogleSheetsSyncConfig>
): Promise<{ success: boolean; message: string; method?: string; error?: string }> {
  const testRecord: DonationRecord = {
    donationId: `TEST-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    donorName: 'Test Devotee (Verification Check)',
    email: 'devotee@example.com',
    amount: 101,
    paymentMode: 'UPI',
    paymentStatus: 'Confirmation Pending',
    paymentReference: 'TEST-APPEND-REF',
    receiptUrl: '',
    emailStatus: 'Not Required',
    emailMessageId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmationCode: String(Math.floor(100000 + Math.random() * 900000)),
    confirmedBy: '',
    sevaCategory: 'General Seva',
    sevaHead: 'Anna Dana'
  };

  const result = await syncDonationToGoogleSheet(testRecord, accessToken, customConfig);
  if (result.success) {
    return {
      success: true,
      method: result.method,
      message: `Test Row (PIN: ${testRecord.confirmationCode}) successfully appended to Google Sheet "${customConfig?.sheetName || 'Form Responses 1'}"!`
    };
  } else {
    return {
      success: false,
      method: result.method,
      message: result.message || result.error || 'Failed to append test row',
      error: result.error
    };
  }
}


