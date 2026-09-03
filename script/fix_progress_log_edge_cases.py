#!/usr/bin/env python3
"""
Perbaikan bertarget: 4 kasus di case_progress_log yang salah ter-parsing
akibat bug regex lama (titik dua wajib, tahun harus tepat 4 digit).

Berbeda dari normalize_progress_log.py (yang memproses ULANG dari log_text
mentah di fact_issue_case / sumber Excel), skrip ini bekerja LANGSUNG di
baris case_progress_log yang sudah ada -- karena normalisasi awal sudah
berjalan sukses (821 baris), dan skrip normalize_progress_log.py sengaja
menolak dijalankan ulang pada data yang sudah multi-baris.

4 kasus yang diperbaiki (issue_case_id dari temuan investigasi):
  1. 7d078640-bb96-4652-a82c-46556d798e3b -- log_date salah baca sbg 2028-07-21
     (kemungkinan seharusnya 2026-07-21, TIDAK diubah otomatis -- lihat catatan)
  2. 156c2ef5-95a1-4e75-a884-1e04b948cf29 -- log_date salah baca sbg 2028-07-04
     (kemungkinan seharusnya 2026-07-04, TIDAK diubah otomatis)
  3. ef2f1ee0-dc5c-4a94-9e93-33d50a6171df -- 1 baris raksasa berisi 5 entri
     tergabung (bug titik-dua-opsional), perlu dipecah ulang
  4. 44e4434f-a8d2-4d6d-bc5f-cc3ca0a51e95 -- entri 22/12/22025 (5 digit tahun)
     tersembunyi tergabung ke entri 17/12/25, perlu dipecah ulang

PENTING -- soal tanggal yang salah tahun (kasus 1, 2, dan bagian dari 3):
Skrip ini TIDAK menebak/mengoreksi tahun yang salah ketik (2028->2026, dst)
secara otomatis. Itu murni typo di sumber data Excel, bukan bug parsing --
mengoreksinya tanpa konfirmasi manusia berisiko salah asumsi. Skrip ini
HANYA memperbaiki STRUKTUR (memisahkan entri yang salah tergabung), dan
MELAPORKAN daftar tanggal mencurigakan di akhir untuk keputusan manual Anda
(lihat REKOMENDASI_KOREKSI_MANUAL di bagian akhir output).

Cara pakai:
    python fix_progress_log_edge_cases.py --dsn "postgresql://..." --dry-run
    python fix_progress_log_edge_cases.py --dsn "postgresql://..."
"""

import argparse
import datetime
import re


DATE_LINE_PATTERN = re.compile(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})\s*:?\s*(.+)$')

# issue_case_id yang perlu diproses ulang strukturnya (kasus 3 dan 4).
# Kasus 1 dan 2 TIDAK perlu dipecah ulang (sudah 1 entri yang benar secara
# struktur, cuma tahunnya yang mencurigakan) -- hanya dilaporkan, tidak diubah.
TARGET_CASES_TO_RESPLIT = [
    'ef2f1ee0-dc5c-4a94-9e93-33d50a6171df',
    '44e4434f-a8d2-4d6d-bc5f-cc3ca0a51e95',
]

CASES_TO_FLAG_ONLY = [
    ('7d078640-bb96-4652-a82c-46556d798e3b', '2028-07-21', 'kemungkinan 2026-07-21'),
    ('156c2ef5-95a1-4e75-a884-1e04b948cf29', '2028-07-04', 'kemungkinan 2026-07-04'),
]


def parse_progress_log(text, fallback_date):
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
            if year < 100:
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

    return [(d, t) for d, t in entries if t]


def run_fix(dsn, dry_run=False):
    import psycopg2

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SET search_path TO product_issue")

    try:
        print("=" * 70)
        print("BAGIAN 1: Memecah ulang entri yang salah tergabung")
        print("=" * 70)

        for issue_case_id in TARGET_CASES_TO_RESPLIT:
            cur.execute("""
                SELECT log_id, log_date, log_text
                FROM case_progress_log
                WHERE issue_case_id = %s
                ORDER BY log_date
            """, (issue_case_id,))
            rows = cur.fetchall()

            cur.execute("SELECT complaint_date FROM fact_issue_case WHERE issue_case_id = %s",
                        (issue_case_id,))
            complaint_date = cur.fetchone()[0]

            print(f"\nissue_case_id={issue_case_id} -- {len(rows)} baris log ditemukan")

            for log_id, log_date, log_text in rows:
                # Cek apakah log_text ini sebenarnya berisi >1 entri tergabung
                reparsed = parse_progress_log(log_text, complaint_date)
                if len(reparsed) <= 1:
                    continue  # sudah benar, 1 entri, tidak perlu diapa-apakan

                print(f"  Baris log_id={log_id} (log_date lama={log_date}) "
                      f"ternyata berisi {len(reparsed)} entri tergabung:")
                for d, t in reparsed:
                    print(f"    -> {d}: {t[:70]}")

                if not dry_run:
                    cur.execute("DELETE FROM case_progress_log WHERE log_id = %s", (log_id,))
                    for d, t in reparsed:
                        cur.execute(
                            "INSERT INTO case_progress_log (issue_case_id, log_date, log_text) "
                            "VALUES (%s, %s, %s)",
                            (issue_case_id, d, t)
                        )

        print("\n" + "=" * 70)
        print("BAGIAN 2: Tanggal mencurigakan yang PERLU KEPUTUSAN MANUAL")
        print("=" * 70)
        print("Skrip ini TIDAK mengubah tanggal berikut -- cuma melaporkan.")
        print("Perbaiki manual lewat CRUD form/UPDATE langsung kalau memang typo:\n")

        for issue_case_id, current_date, suggestion in CASES_TO_FLAG_ONLY:
            cur.execute("""
                SELECT log_id, log_text FROM case_progress_log
                WHERE issue_case_id = %s AND log_date = %s
            """, (issue_case_id, current_date))
            match = cur.fetchone()
            if match:
                log_id, log_text = match
                print(f"  log_id={log_id}")
                print(f"  issue_case_id={issue_case_id}")
                print(f"  Tanggal saat ini: {current_date} -- {suggestion}")
                print(f"  Teks: {log_text[:80]}")
                print()

        if dry_run:
            print("[DRY RUN] Tidak ada perubahan dilakukan ke database.")
        else:
            conn.commit()
            print("[DONE] Perbaikan struktur (Bagian 1) sudah disimpan ke database.")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dsn', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    run_fix(args.dsn, dry_run=args.dry_run)
