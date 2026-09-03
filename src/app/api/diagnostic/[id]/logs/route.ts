import { NextRequest, NextResponse } from 'next/server';
import { getCaseLogs, createCaseLog } from '@/lib/queries/diagnostic';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const logs = await getCaseLogs(id);
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching case logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { log_date, log_text, logged_by_pic_id } = body;

    if (!log_date || !log_text || !log_text.trim()) {
      return NextResponse.json(
        { error: 'Tanggal log dan isi teks perkembangan wajib diisi.' },
        { status: 400 }
      );
    }

    if (log_text.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Panjang teks catatan perkembangan maksimal 2000 karakter.' },
        { status: 400 }
      );
    }

    // Business Logic Validation
    const caseRes = await query<{
      complaint_date: string;
      status_wo: string;
      closing_date_wo: string | null;
    }>(`
      SELECT 
        TO_CHAR(ic.complaint_date, 'YYYY-MM-DD') AS complaint_date,
        cl.status_wo,
        TO_CHAR(cl.closing_date_wo, 'YYYY-MM-DD') AS closing_date_wo
      FROM product_issue.fact_issue_case ic
      LEFT JOIN product_issue.claim cl ON cl.issue_case_id = ic.issue_case_id
      WHERE ic.issue_case_id = $1;
    `, [id]);

    if (!caseRes.rows.length) {
      return NextResponse.json(
        { error: 'Data kasus tidak ditemukan.' },
        { status: 404 }
      );
    }

    const { complaint_date, status_wo, closing_date_wo } = caseRes.rows[0];

    if (complaint_date && log_date < complaint_date) {
      return NextResponse.json(
        {
          error: `Tanggal log (${log_date}) tidak boleh lebih awal dari Complaint Date kasus (${complaint_date}).`,
        },
        { status: 400 }
      );
    }

    if (status_wo === 'Closed' && closing_date_wo && log_date > closing_date_wo) {
      return NextResponse.json(
        {
          error: `Kasus ini sudah Closed. Tanggal log (${log_date}) tidak boleh melebihi Closing Date WO (${closing_date_wo}).`,
        },
        { status: 400 }
      );
    }

    const newLog = await createCaseLog(id, log_date, log_text.trim(), logged_by_pic_id);
    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error('Error creating case log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
