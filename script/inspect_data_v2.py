#!/usr/bin/env python3
"""
Tool inspeksi data: cari detail baris tertentu dari master_prodsue_raw.xlsb
tanpa perlu buka Excel dan hitung baris manual.

Cara pakai:
    python inspect_data.py --xlsb path/to/master_prodsue_raw.xlsb --mode warnings
    python inspect_data.py --xlsb path/to/master_prodsue_raw.xlsb --mode open_cases
    python inspect_data.py --xlsb path/to/master_prodsue_raw.xlsb --mode row --index 95

Konsep penting: "index" di sini adalah posisi ke-0, 1, 2, ... di antara
151 baris data RIIL (bukan nomor baris Excel apa adanya, karena header
dan baris kosong sudah disingkirkan). Tool ini SELALU menampilkan nomor
baris Excel juga, supaya gampang dicocokkan manual kalau perlu.
"""

import argparse
import datetime
from collections import defaultdict

import pyxlsb


# ---------------------------------------------------------------------
# Klasifikasi kolom: WAJIB (seharusnya selalu terisi secara bisnis) vs
# OPSIONAL (wajar kosong tergantung tahapan proses kasus). Klasifikasi
# ini berdasar pemahaman alur proses yang sudah diverifikasi sepanjang
# analisis sebelumnya -- bukan tebakan. Kolom 36-38 (helper pivot) tidak
# dimasukkan karena bukan data operasional.
# ---------------------------------------------------------------------

REQUIRED_COLUMNS = {
    0: 'Business Area', 1: 'Product', 4: 'Customer Group', 5: 'Customer',
    9: 'Complaint Date', 10: 'Claimable Status', 11: 'Unit Model',
    27: 'Status WO',
}

OPTIONAL_COLUMNS = {
    3: 'Unit Condition', 6: 'Historical Process', 7: 'HM',
    8: 'Delivery Date', 12: 'Serial Number', 13: 'WO Checking', 14: 'TR',
    15: 'Root Cause', 16: 'Problem Analysis', 17: 'WO Warranty Repair',
    18: 'TSR', 19: 'Part Readiness', 20: 'Part Number', 21: 'Part Name',
    22: 'ETA Parts', 23: 'Supply Status', 24: 'Current Progress',
    25: 'Estimate RFU', 26: 'PIC', 28: 'Closing Date WO',
    29: 'Closing by RFU Date', 30: 'Goodwill Statement', 31: 'SRD Publication',
    32: 'Bottleneck Process', 33: 'Golongan Customer', 34: 'Warranty Scope',
    35: 'Achievement', 39: 'Old/New Issue',
}

# Kolom teks bebas yang rawan duplikasi kategori akibat inkonsistensi
# kapitalisasi/spasi (sudah terbukti sebelumnya: Karyamas vs KARYAMAS,
# PIC SDH vs SHD, dst).
FREE_TEXT_CATEGORY_COLUMNS = {
    4: 'Customer Group', 5: 'Customer', 26: 'PIC',
}


def excel_date_str(serial):
    if serial is None or serial == '':
        return None
    try:
        serial = float(serial)
    except (TypeError, ValueError):
        return None
    if serial < 1:
        return None
    base = datetime.date(1899, 12, 30)
    try:
        return str(base + datetime.timedelta(days=int(serial)))
    except (OverflowError, ValueError):
        return None


def load_real_rows(xlsb_path):
    """Kembalikan list of (index, excel_row_number, row_dict)."""
    with pyxlsb.open_workbook(xlsb_path) as wb:
        with wb.get_sheet('New Master Prodsue') as sheet:
            all_rows = list(sheet.rows())

    header_row_idx = 8
    last_real_row = header_row_idx
    for idx in range(header_row_idx + 1, len(all_rows)):
        d = {c.c: c.v for c in all_rows[idx]}
        if d.get(0):
            last_real_row = idx

    result = []
    data_index = 0
    for idx in range(header_row_idx + 1, last_real_row + 1):
        d = {c.c: c.v for c in all_rows[idx]}
        if not d.get(0):
            continue
        # idx di sini 0-based dari all_rows, Excel row number = idx + 1
        result.append((data_index, idx + 1, d))
        data_index += 1
    return result


def print_row_summary(index, excel_row, d):
    print(f"--- index={index}  (Excel row {excel_row}) ---")
    print(f"  Branch/Product     : {d.get(0)} / {d.get(1)}")
    print(f"  Customer           : {d.get(5)}")
    print(f"  Complaint Date     : {excel_date_str(d.get(9))}")
    print(f"  Claimable Status   : {d.get(10)}")
    print(f"  Status WO          : {d.get(27)}")
    print(f"  Closing Date WO    : {excel_date_str(d.get(28))}")
    print(f"  Closing by RFU     : {excel_date_str(d.get(29))}")
    print(f"  Part Number (raw)  : {d.get(20)!r}")
    print(f"  Part Name (raw)    : {d.get(21)!r}")
    print()


def find_part_mismatch(rows):
    """Cari baris dengan jumlah part_number vs part_name yang beda,
    pakai logika split yang SAMA dengan etl_migrate.py (termasuk fix
    koma trailing)."""
    def split_multiline(s):
        if not s:
            return []
        parts = [str(p).strip() for p in str(s).split('\n')]
        cleaned = []
        for p in parts:
            if not p or p == '-':
                continue
            p = p.rstrip(',').strip()
            if p:
                cleaned.append(p)
        return cleaned

    mismatches = []
    for index, excel_row, d in rows:
        pn = split_multiline(d.get(20))
        pname = split_multiline(d.get(21))
        if pn and pname and len(pn) != len(pname):
            mismatches.append((index, excel_row, d, pn, pname))
    return mismatches


def find_open_cases(rows):
    return [(i, er, d) for i, er, d in rows if normalize_status(d.get(27)) != 'closed']


def normalize_status(s):
    return (str(s).strip().lower() if s else '')


def is_empty(v):
    """True jika nilai dianggap kosong -- None, string kosong, atau
    string cuma berisi spasi/tanda '-' (dipakai sebagai placeholder
    'tidak ada' di beberapa kolom sumber)."""
    if v is None:
        return True
    s = str(v).strip()
    return s == '' or s == '-'


# ---------------------------------------------------------------------
# QUALITY CHECK: null / missing value
# ---------------------------------------------------------------------

def analyze_nulls(rows):
    """Kembalikan (per_row_report, per_column_report) untuk kolom REQUIRED
    dan OPTIONAL secara terpisah."""
    per_row = []
    for index, excel_row, d in rows:
        missing_required = [name for idx, name in REQUIRED_COLUMNS.items() if is_empty(d.get(idx))]
        missing_optional = [name for idx, name in OPTIONAL_COLUMNS.items() if is_empty(d.get(idx))]
        per_row.append({
            'index': index, 'excel_row': excel_row,
            'missing_required': missing_required,
            'missing_optional': missing_optional,
        })

    per_column_required = {}
    for idx, name in REQUIRED_COLUMNS.items():
        empty_count = sum(1 for _, _, d in rows if is_empty(d.get(idx)))
        per_column_required[name] = {'empty_count': empty_count, 'total': len(rows)}

    per_column_optional = {}
    for idx, name in OPTIONAL_COLUMNS.items():
        empty_count = sum(1 for _, _, d in rows if is_empty(d.get(idx)))
        per_column_optional[name] = {'empty_count': empty_count, 'total': len(rows)}

    return per_row, per_column_required, per_column_optional


def print_null_summary(rows):
    per_row, per_col_req, per_col_opt = analyze_nulls(rows)

    # --- 1. Baris dengan kolom WAJIB kosong (paling kritis) ---
    critical_rows = [r for r in per_row if r['missing_required']]
    print(f"=== BARIS DENGAN KOLOM WAJIB KOSONG (paling kritis) ===")
    print(f"Total: {len(critical_rows)} dari {len(rows)} baris\n")
    for r in critical_rows:
        print(f"  index={r['index']} (Excel row {r['excel_row']}): "
              f"kolom wajib kosong -> {r['missing_required']}")

    # --- 2. Ringkasan per kolom WAJIB ---
    print(f"\n=== RINGKASAN PER KOLOM WAJIB ===")
    for name, stat in per_col_req.items():
        pct = stat['empty_count'] / stat['total'] * 100
        flag = '  <-- PERLU DITINDAKLANJUTI' if stat['empty_count'] > 0 else ''
        print(f"  {name:<20} kosong: {stat['empty_count']}/{stat['total']} ({pct:.0f}%){flag}")

    # --- 3. Ringkasan per kolom OPSIONAL, diurutkan dari yang paling kosong ---
    print(f"\n=== RINGKASAN PER KOLOM OPSIONAL (diurut dari paling banyak kosong) ===")
    print("Catatan: kosong di sini WAJAR secara bisnis (kasus belum sampai")
    print("tahap itu / tidak butuh tahap itu) -- bukan otomatis berarti error.\n")
    sorted_opt = sorted(per_col_opt.items(), key=lambda kv: -kv[1]['empty_count'])
    for name, stat in sorted_opt:
        pct = stat['empty_count'] / stat['total'] * 100
        print(f"  {name:<22} kosong: {stat['empty_count']}/{stat['total']} ({pct:.0f}%)")

    # --- 4. Distribusi jumlah kolom opsional kosong per baris ---
    print(f"\n=== DISTRIBUSI: berapa banyak baris berdasarkan jumlah kolom opsional yang kosong ===")
    dist = defaultdict(int)
    for r in per_row:
        dist[len(r['missing_optional'])] += 1
    for n_missing in sorted(dist.keys()):
        print(f"  {n_missing} kolom opsional kosong: {dist[n_missing]} baris")

    # --- 5. Top 10 baris "paling kosong" (kandidat re-entry data) ---
    print(f"\n=== TOP 10 BARIS DENGAN KOLOM OPSIONAL PALING BANYAK KOSONG ===")
    top_empty = sorted(per_row, key=lambda r: -len(r['missing_optional']))[:10]
    for r in top_empty:
        print(f"  index={r['index']} (Excel row {r['excel_row']}): "
              f"{len(r['missing_optional'])} kolom opsional kosong")


# ---------------------------------------------------------------------
# QUALITY CHECK: duplikasi kategori (Karyamas vs KARYAMAS, dsb)
# ---------------------------------------------------------------------

def find_duplicate_categories(rows):
    """Untuk tiap kolom teks bebas kategorikal, kelompokkan nilai by
    versi ternormalisasi (upper + trim) dan laporkan grup yang punya
    lebih dari 1 variasi penulisan asli."""
    results = {}
    for col_idx, col_name in FREE_TEXT_CATEGORY_COLUMNS.items():
        groups = defaultdict(set)
        for _, _, d in rows:
            val = d.get(col_idx)
            if is_empty(val):
                continue
            normalized = str(val).strip().upper()
            groups[normalized].add(str(val))  # simpan versi ASLI (belum di-trim) juga

        dupes = {k: v for k, v in groups.items() if len(v) > 1}
        results[col_name] = dupes
    return results


def print_duplicate_categories(rows):
    results = find_duplicate_categories(rows)
    total_dupe_groups = sum(len(v) for v in results.values())
    print(f"=== DUPLIKASI KATEGORI (variasi penulisan utk nilai yang seharusnya sama) ===")
    print(f"Total grup duplikat ditemukan: {total_dupe_groups}\n")
    for col_name, dupes in results.items():
        if not dupes:
            print(f"  [{col_name}] tidak ada duplikasi terdeteksi.")
            continue
        print(f"  [{col_name}] {len(dupes)} grup duplikat:")
        for normalized, variants in dupes.items():
            print(f"    - {sorted(variants)}")
        print()


# ---------------------------------------------------------------------
# QUALITY CHECK: anomali tanggal (urutan tidak logis)
# ---------------------------------------------------------------------

def excel_date_obj(serial):
    if serial is None or serial == '':
        return None
    try:
        serial = float(serial)
    except (TypeError, ValueError):
        return None
    if serial < 1:
        return None
    base = datetime.date(1899, 12, 30)
    try:
        return base + datetime.timedelta(days=int(serial))
    except (OverflowError, ValueError):
        return None


def find_date_anomalies(rows):
    """Cek beberapa aturan logis dasar:
    1. closing_date_wo / closing_by_rfu_date lebih AWAL dari complaint_date
    2. delivery_date lebih BARU dari complaint_date (unit belum dikirim
       tapi sudah komplain -- tidak masuk akal)
    """
    anomalies = []
    for index, excel_row, d in rows:
        complaint = excel_date_obj(d.get(9))
        closing_wo = excel_date_obj(d.get(28))
        closing_rfu = excel_date_obj(d.get(29))
        delivery = excel_date_obj(d.get(8))

        issues = []
        if complaint and closing_wo and closing_wo < complaint:
            issues.append(f"Closing Date WO ({closing_wo}) lebih awal dari Complaint Date ({complaint})")
        if complaint and closing_rfu and closing_rfu < complaint:
            issues.append(f"Closing by RFU ({closing_rfu}) lebih awal dari Complaint Date ({complaint})")
        if complaint and delivery and delivery > complaint:
            issues.append(f"Delivery Date ({delivery}) lebih baru dari Complaint Date ({complaint})")

        if issues:
            anomalies.append({'index': index, 'excel_row': excel_row, 'issues': issues})

    return anomalies


def print_date_anomalies(rows):
    anomalies = find_date_anomalies(rows)
    print(f"=== ANOMALI TANGGAL (urutan tidak logis secara proses bisnis) ===")
    print(f"Total baris dengan anomali: {len(anomalies)} dari {len(rows)}\n")
    for a in anomalies:
        print(f"  index={a['index']} (Excel row {a['excel_row']}):")
        for issue in a['issues']:
            print(f"    - {issue}")
        print()


# ---------------------------------------------------------------------
# QUALITY REPORT: ringkasan gabungan semua check di atas
# ---------------------------------------------------------------------

def print_quality_report(rows):
    per_row, per_col_req, per_col_opt = analyze_nulls(rows)
    critical_rows = [r for r in per_row if r['missing_required']]
    part_mismatches = find_part_mismatch(rows)
    open_cases = find_open_cases(rows)
    dupe_categories = find_duplicate_categories(rows)
    total_dupe_groups = sum(len(v) for v in dupe_categories.values())
    date_anomalies = find_date_anomalies(rows)

    print("=" * 70)
    print("RINGKASAN KUALITAS DATA -- master_prodsue_raw.xlsb")
    print("=" * 70)
    print(f"Total baris data riil                         : {len(rows)}")
    print(f"Baris dengan kolom WAJIB kosong                : {len(critical_rows)}")
    print(f"Baris dengan Part Number vs Part Name mismatch : {len(part_mismatches)}")
    print(f"Kasus dengan Status WO = 'Belum Closed'        : {len(open_cases)}")
    print(f"Grup duplikasi kategori (Customer/Group/PIC)   : {total_dupe_groups}")
    print(f"Baris dengan anomali urutan tanggal             : {len(date_anomalies)}")
    print()
    print("Kolom OPSIONAL paling banyak kosong (top 5):")
    sorted_opt = sorted(per_col_opt.items(), key=lambda kv: -kv[1]['empty_count'])[:5]
    for name, stat in sorted_opt:
        pct = stat['empty_count'] / stat['total'] * 100
        print(f"  - {name:<22} {stat['empty_count']}/{stat['total']} ({pct:.0f}%) kosong")
    print()
    print("Jalankan mode berikut untuk detail masing-masing:")
    print("  --mode null_summary          detail kolom wajib/opsional kosong")
    print("  --mode warnings               detail part_number vs part_name mismatch")
    print("  --mode open_cases             detail kasus belum closed")
    print("  --mode duplicate_categories   detail variasi penulisan Customer/Group/PIC")
    print("  --mode date_anomalies         detail urutan tanggal tidak logis")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--xlsb', required=True)
    parser.add_argument('--mode', required=True,
                         choices=['warnings', 'open_cases', 'row',
                                  'null_summary', 'duplicate_categories',
                                  'date_anomalies', 'quality_report'])
    parser.add_argument('--index', type=int, help='Index baris (untuk --mode row)')
    args = parser.parse_args()

    rows = load_real_rows(args.xlsb)
    print(f"[INFO] Total {len(rows)} baris data riil dimuat.\n")

    if args.mode == 'row':
        if args.index is None:
            print("Error: --index wajib diisi untuk --mode row")
            return
        match = [r for r in rows if r[0] == args.index]
        if not match:
            print(f"Index {args.index} tidak ditemukan (valid: 0 - {len(rows)-1}).")
            return
        index, excel_row, d = match[0]
        print_row_summary(index, excel_row, d)

    elif args.mode == 'warnings':
        mismatches = find_part_mismatch(rows)
        print(f"[HASIL] {len(mismatches)} baris dengan part_number vs part_name TIDAK SAMA jumlahnya:\n")
        for index, excel_row, d, pn, pname in mismatches:
            print_row_summary(index, excel_row, d)
            print(f"  -> Part Number setelah di-split ({len(pn)}): {pn}")
            print(f"  -> Part Name setelah di-split   ({len(pname)}): {pname}")
            print()

    elif args.mode == 'open_cases':
        open_cases = find_open_cases(rows)
        print(f"[HASIL] {len(open_cases)} kasus dengan Status WO != 'Closed':\n")
        for index, excel_row, d in open_cases:
            print_row_summary(index, excel_row, d)

    elif args.mode == 'null_summary':
        print_null_summary(rows)

    elif args.mode == 'duplicate_categories':
        print_duplicate_categories(rows)

    elif args.mode == 'date_anomalies':
        print_date_anomalies(rows)

    elif args.mode == 'quality_report':
        print_quality_report(rows)


if __name__ == '__main__':
    main()
