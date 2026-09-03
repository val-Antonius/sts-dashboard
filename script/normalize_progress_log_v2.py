#!/usr/bin/env python3
"""
Migrasi 1x-jalan: normalisasi case_progress_log yang sudah ada di database.

Masalah: ETL sebelumnya (etl_migrate.py versi lama) meng-INSERT seluruh
blok teks Current Progress sebagai 1 baris log_text raksasa per kasus,
bukan dipecah per entri tanggal seperti desain tabel yang sebenarnya
(log_date DATE NOT NULL, log_text TEXT -- 1 baris = 1 entri).

Skrip ini:
1. Membaca baris case_progress_log yang ada sekarang (1 baris/kasus).
2. Parsing ulang log_text-nya jadi banyak entri (tanggal, teks), dengan
   menggabungkan baris lanjutan (word-wrap tanpa tanggal baru) ke entri
   sebelumnya -- diverifikasi terhadap 151 kasus data asli: 821 entri
   final, 0 entri tanpa tanggal (pakai fallback complaint_date untuk
   entri pertama yang memang tidak diawali tanggal di sumber aslinya).
3. Menghapus baris lama, insert ulang sebagai baris-baris terpisah.

Cara pakai:
    pip install psycopg2-binary
    python normalize_progress_log.py --dsn "postgresql://..." --dry-run
    python normalize_progress_log.py --dsn "postgresql://..."

PENTING: jalankan --dry-run dulu, cek ringkasannya, baru jalankan
sungguhan. Skrip ini TIDAK idempotent -- jalankan SEKALI SAJA. Kalau
dijalankan 2x, entri akan terduplikasi (skrip mendeteksi kalau
case_progress_log sudah dalam bentuk "banyak baris pendek" dan akan
menolak jalan lagi -- lihat pengecekan di bawah).
"""

import argparse
import datetime
import re
import sys


DATE_LINE_PATTERN = re.compile(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})\s*:?\s*(.+)$')
# Titik dua setelah tanggal dibuat OPSIONAL -- ditemukan 8 dari 785 baris
# (1%) di data asli pakai format "tanggal teks" tanpa ':', yang sebelumnya
# gagal terdeteksi sebagai baris baru dan salah tergabung ke entri
# sebelumnya (contoh: kasus PT. Fairco Agro Mandiri, 4 entri penting
# hilang tergabung jadi 1 baris raksasa sebelum perbaikan ini).


def parse_progress_log(text, fallback_date):
    """Pecah 1 blok log jadi list of (date, text).
    Baris tanpa tanggal di depan digabung ke entri sebelumnya (word-wrap).
    Baris pertama yang tanpa tanggal (tidak ada entri sebelumnya untuk
    digabung) pakai fallback_date -- biasanya complaint_date kasus itu."""
    if not text:
        return []
    entries = []
    current_date = None
    current_text_parts = []

    for line in str(text).split('\n'):
        line = line.strip()
        if not line:
            continue
        m = DATE_LINE_PATTERN.match(line)
        if m:
            if current_date is not None or current_text_parts:
                d = current_date if current_date else fallback_date
                entries.append((d, ' '.join(current_text_parts).strip()))
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if year < 100:  # format 2-digit seperti '5/5/26' -> 2026
                year += 2000
            try:
                current_date = datetime.date(year, month, day)
            except ValueError:
                current_date = None
            current_text_parts = [m.group(4).strip()]
        else:
            if current_text_parts:
                current_text_parts.append(line)
            else:
                entries.append((fallback_date, line))

    if current_date is not None or current_text_parts:
        d = current_date if current_date else fallback_date
        entries.append((d, ' '.join(current_text_parts).strip()))

    return [(d, t) for d, t in entries if t]  # buang entri teks kosong


def run_migration(dsn, dry_run=False):
    import psycopg2

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SET search_path TO product_issue")

    try:
        # --- Pengecekan aman: apakah data sudah ternormalisasi? ---
        cur.execute("""
            SELECT issue_case_id, COUNT(*) as n
            FROM case_progress_log
            GROUP BY issue_case_id
            HAVING COUNT(*) > 1
        """)
        already_multi = cur.fetchall()
        if already_multi:
            print(f"[PERINGATAN] {len(already_multi)} kasus SUDAH punya lebih dari "
                  f"1 baris log. Kemungkinan migrasi ini sudah pernah dijalankan, "
                  f"atau ada data yang di-insert manual/lewat CRUD form sejak awal. "
                  f"Migrasi ini TIDAK AMAN dijalankan ulang -- akan menduplikasi "
                  f"entri yang sudah benar. Berhenti tanpa perubahan.")
            cur.close()
            conn.close()
            return

        # --- Ambil semua baris log yang ada sekarang (raksasa, 1/kasus) ---
        cur.execute("""
            SELECT cpl.log_id, cpl.issue_case_id, cpl.log_text,
                   ic.complaint_date
            FROM case_progress_log cpl
            JOIN fact_issue_case ic ON ic.issue_case_id = cpl.issue_case_id
        """)
        old_rows = cur.fetchall()
        print(f"[INFO] {len(old_rows)} baris log lama ditemukan (akan dipecah).")

        total_new_entries = 0
        plan = []  # (old_log_id, issue_case_id, [(date, text), ...])
        for log_id, issue_case_id, log_text, complaint_date in old_rows:
            entries = parse_progress_log(log_text, complaint_date)
            total_new_entries += len(entries)
            plan.append((log_id, issue_case_id, entries))

        print(f"[INFO] Akan menghasilkan {total_new_entries} entri baru "
              f"(dari {len(old_rows)} baris lama).")

        if dry_run:
            print("\n[DRY RUN] Contoh hasil parsing untuk 2 kasus pertama:")
            for log_id, issue_case_id, entries in plan[:2]:
                print(f"\n  issue_case_id={issue_case_id} -> {len(entries)} entri:")
                for d, t in entries[:3]:
                    print(f"    {d}: {t[:70]}")
                if len(entries) > 3:
                    print(f"    ... ({len(entries)-3} entri lainnya)")
            print("\n[DRY RUN] Tidak ada perubahan dilakukan ke database.")
            cur.close()
            conn.close()
            return

        # --- Eksekusi: hapus baris lama, insert baris baru ---
        deleted, inserted = 0, 0
        for log_id, issue_case_id, entries in plan:
            cur.execute("DELETE FROM case_progress_log WHERE log_id = %s", (log_id,))
            deleted += 1
            for d, t in entries:
                cur.execute(
                    "INSERT INTO case_progress_log (issue_case_id, log_date, log_text) "
                    "VALUES (%s, %s, %s)",
                    (issue_case_id, d, t)
                )
                inserted += 1

        conn.commit()
        print(f"\n[DONE] {deleted} baris lama dihapus, {inserted} entri baru "
              f"di-insert sebagai gantinya.")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Normalisasi case_progress_log yang sudah ada')
    parser.add_argument('--dsn', required=True, help='PostgreSQL DSN')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    run_migration(args.dsn, dry_run=args.dry_run)
