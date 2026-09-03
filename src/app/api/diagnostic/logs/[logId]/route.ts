import { NextRequest, NextResponse } from 'next/server';
import { updateCaseLog, deleteCaseLog } from '@/lib/queries/diagnostic';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params;
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
    const logRes = await query<{
      complaint_date: string;
      status_wo: string;
      closing_date_wo: string | null;
    }>(`
      SELECT 
        TO_CHAR(ic.complaint_date, 'YYYY-MM-DD') AS complaint_date,
        cl.status_wo,
        TO_CHAR(cl.closing_date_wo, 'YYYY-MM-DD') AS closing_date_wo
      FROM product_issue.case_progress_log l
      JOIN product_issue.fact_issue_case ic ON ic.issue_case_id = l.issue_case_id
      LEFT JOIN product_issue.claim cl ON cl.issue_case_id = ic.issue_case_id
      WHERE l.log_id = $1;
    `, [logId]);

    if (!logRes.rows.length) {
      return NextResponse.json(
        { error: 'Entri log tidak ditemukan.' },
        { status: 404 }
      );
    }

    const { complaint_date, status_wo, closing_date_wo } = logRes.rows[0];

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

    const updated = await updateCaseLog(logId, log_date, log_text.trim(), logged_by_pic_id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating case log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params;
  try {
    const success = await deleteCaseLog(logId);
    if (!success) {
      return NextResponse.json({ error: 'Log entry tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting case log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
