#!/usr/bin/env python3
"""
ETL: master_prodsue_raw.xlsb -> schema PostgreSQL (product_issue).

Cara pakai:
    pip install pyxlsb psycopg2-binary
    python etl_migrate.py --xlsb /path/to/master_prodsue_raw.xlsb \
                           --dsn "postgresql://user:pass@host:5432/dbname"

Atau untuk dry-run (cuma cetak ringkasan, tidak insert ke DB):
    python etl_migrate.py --xlsb /path/to/master_prodsue_raw.xlsb --dry-run

Untuk RE-RUN dengan file .xlsb yang datanya sudah pernah dimasukkan
sebelumnya (baris nambah, atau nilai di kolom yang sudah ada berubah),
WAJIB tambahkan --truncate-first:
    python etl_migrate.py --xlsb /path/to/master_prodsue_raw_v2.xlsb \
                           --dsn "postgresql://user:pass@host:5432/dbname" \
                           --truncate-first

Catatan penting:
- Jalankan 01_schema_product_issue.sql dan 02_seed_lookup.sql DULU sebelum
  script ini, karena script ini hanya INSERT ke tabel yang sudah ada dan
  akan mencari lookup ID dari tabel ref_* / dim_customer_group yang
  seharusnya sudah terisi seed data.
- Script ini idempotent untuk tabel master (dim_customer, dim_branch, dst --
  pakai ON CONFLICT DO NOTHING/DO UPDATE), tapi TIDAK idempotent untuk
  fact_issue_case dan tabel anaknya (claim, case_timeline, case_part,
  case_progress_log). Re-run tanpa --truncate-first akan membuat baris
  lama TERDUPLIKASI, bukan ter-update -- karena tidak ada natural key
  yang cukup andal di data sumber untuk dijadikan acuan ON CONFLICT
  (sudah diverifikasi: kombinasi Customer+Unit+Complaint Date bisa sama
  untuk 2 kasus yang benar-benar berbeda). --truncate-first mengosongkan
  tabel transaksional dulu (BUKAN tabel master) sebelum insert ulang dari
  awal, sebagai strategi "full reload" yang aman -- meminta konfirmasi
  ketik 'YES' sebelum benar-benar menghapus apapun.
- Script juga memvalidasi struktur header file sebelum membaca data --
  kalau ada kolom baru DISISIPKAN DI TENGAH sheet (bukan di akhir), ETL
  akan berhenti dengan pesan jelas alih-alih diam-diam salah baca data.
"""

import argparse
import datetime
import re
import sys
from collections import defaultdict

import pyxlsb


# ---------------------------------------------------------------------
# Util konversi
# ---------------------------------------------------------------------

def excel_serial_to_date(serial):
    """Konversi serial number Excel ke datetime.date. None jika tidak valid."""
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


# ---------------------------------------------------------------------
# Validasi header: nama kolom yang DIHARAPKAN di tiap index, sesuai
# struktur file master_prodsue_raw.xlsb saat schema ini dirancang.
# Dipakai untuk mendeteksi kalau ada kolom baru disisipkan DI TENGAH
# (yang akan menggeser semua index setelahnya) sebelum ETL mulai baca
# data -- daripada diam-diam salah baca tanpa error apapun.
# ---------------------------------------------------------------------

EXPECTED_HEADERS = {
    0: 'Business Area', 1: 'Product', 4: 'Customer Group', 5: 'Customer',
    6: 'Historical Process', 9: 'Complaint Date', 10: 'Claimable Status',
    11: 'Unit Model', 12: 'Serial Number', 20: 'Part Number', 21: 'Part Name',
    27: 'Status WO', 33: 'Golongan Customer', 34: 'Warranty Scope/Non Warranty Scope',
}
# Catatan: sengaja tidak mencakup SEMUA 40 kolom -- cukup titik-titik
# kunci yang tersebar merata (awal/tengah/akhir), supaya kalau ada
# pergeseran di manapun, minimal 1 titik ini akan ketahuan tidak cocok.
# Perbandingan di validate_headers() men-trim spasi di kedua sisi,
# karena beberapa header asli punya trailing space (mis. 'Part Number ').


def validate_headers(actual_headers):
    """Bandingkan header aktual (dari file) dengan yang diharapkan.
    Kembalikan list of (index, expected, actual) untuk yang TIDAK cocok.
    List kosong berarti header aman, index-nya tidak bergeser."""
    mismatches = []
    for idx, expected_name in EXPECTED_HEADERS.items():
        actual_name = actual_headers.get(idx)
        actual_clean = str(actual_name).strip() if actual_name else None
        if actual_clean != expected_name.strip():
            mismatches.append((idx, expected_name, actual_clean))
    return mismatches


def normalize_text(s):
    """Trim + collapse whitespace. None-safe. Angka bulat (float dari
    pyxlsb, misal nomor WO 5080032246.0) dirapikan jadi tanpa '.0'."""
    if s is None:
        return None
    if isinstance(s, float) and s.is_integer():
        s = str(int(s))
    else:
        s = str(s).strip()
    return s if s else None


def normalize_key(s):
    """Untuk pencocokan lookup case-insensitive (Karyamas vs KARYAMAS)."""
    s = normalize_text(s)
    return s.upper() if s else None


def split_multiline(s):
    """Pecah 1 sel berisi banyak part (dipisah newline) jadi list bersih.
    Sebagian data lama menaruh koma di akhir tiap baris sebagai pemisah
    tambahan (misal '04817-00180,\\nRD431-64520,\\n...') -- koma trailing
    ini dibuang supaya tidak ikut tersimpan sebagai bagian dari nilai."""
    if not s:
        return []
    parts = [normalize_text(p) for p in str(s).split('\n')]
    cleaned = []
    for p in parts:
        if not p or p == '-':
            continue
        p = p.rstrip(',').strip()  # buang koma trailing + spasi sisa
        if p:
            cleaned.append(p)
    return cleaned


def parse_historical_process(text):
    """
    Parse kolom 'Historical Process' (free text) jadi dict checkpoint -> date.
    Format asli: "Label : DD/MM/YYYY\\nLabel2: DD/MM/YYYY\\n..."
    """
    if not text:
        return {}

    label_to_code = {
        'complaint date': 'COMPLAINT_DATE',
        'create wo checking': 'WO_CHECKING_CREATED',
        'close wo checking': 'WO_CHECKING_CLOSED',
        'ps approval': 'PS_APPROVAL',
        'release wo repair': 'WO_REPAIR_RELEASED',
        'part gi': 'PART_GI',
        'unit rfu': 'UNIT_RFU',
        'close wo repair': 'WO_REPAIR_CLOSED',
    }

    result = {}
    for line in str(text).split('\n'):
        if ':' not in line:
            continue
        label, _, value = line.partition(':')
        label_key = label.strip().lower()
        code = label_to_code.get(label_key)
        if not code:
            continue
        value = value.strip()
        m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', value)
        if m:
            day, month, year = map(int, m.groups())
            try:
                result[code] = datetime.date(year, month, day)
            except ValueError:
                pass
    return result


# ---------------------------------------------------------------------
# Ekstraksi dari xlsb
# ---------------------------------------------------------------------

def extract_new_master(xlsb_path):
    """Baca sheet 'New Master Prodsue', kembalikan list of dict per baris data riil."""
    with pyxlsb.open_workbook(xlsb_path) as wb:
        with wb.get_sheet('New Master Prodsue') as sheet:
            all_rows = list(sheet.rows())

    header_row_idx = 8  # baris ke-9 di Excel (0-indexed = 8)
    headers = {c.c: c.v for c in all_rows[header_row_idx]}

    # Cari baris terakhir yang punya Business Area terisi (kolom 0) --
    # ini penanda baris data riil, bukan baris formula kosong.
    last_real_row = header_row_idx
    for idx in range(header_row_idx + 1, len(all_rows)):
        d = {c.c: c.v for c in all_rows[idx]}
        if d.get(0):  # Business Area terisi
            last_real_row = idx

    records = []
    for idx in range(header_row_idx + 1, last_real_row + 1):
        d = {c.c: c.v for c in all_rows[idx]}
        if not d.get(0):
            continue
        records.append(d)

    return records, headers


def extract_customer_ka_list(xlsb_path):
    """Baca sheet 'List Customer KA' -> list of (customer_name, group_name, ka_type)."""
    with pyxlsb.open_workbook(xlsb_path) as wb:
        with wb.get_sheet('List Customer KA') as sheet:
            rows = list(sheet.rows())

    result = []
    for row in rows[1:]:  # skip header
        d = {c.c: c.v for c in row}
        name = normalize_text(d.get(0))
        group = normalize_text(d.get(1))
        ka_type = normalize_text(d.get(2))
        if name:
            result.append((name, group, ka_type))
    return result


# ---------------------------------------------------------------------
# Transformasi: 1 baris mentah -> struktur siap insert
# ---------------------------------------------------------------------

COLUMN = {  # index kolom sesuai header sheet New Master Prodsue
    'business_area': 0, 'product': 1, 'unit_condition': 3,
    'customer_group': 4, 'customer': 5, 'historical_process': 6, 'hm': 7,
    'delivery_date': 8, 'complaint_date': 9, 'claimable_status': 10,
    'unit_model': 11, 'serial_number': 12, 'wo_checking': 13, 'tr': 14,
    'root_cause': 15, 'problem_analysis': 16, 'wo_warranty_repair': 17,
    'tsr': 18, 'part_readiness': 19, 'part_number': 20, 'part_name': 21,
    'eta_parts': 22, 'supply_status': 23, 'current_progress': 24,
    'estimate_rfu': 25, 'pic': 26, 'status_wo': 27, 'closing_date_wo': 28,
    'closing_by_rfu_date': 29, 'goodwill_statement': 30, 'srd_publication': 31,
    'bottleneck_process': 32, 'golongan_customer': 33, 'warranty_scope': 34,
    'old_new_issue': 39,
}


def parse_problem_analysis(text):
    """Pecah kolom 'Problem Analysis' jadi 4 bagian: symptom/analysis/corrective/preventive."""
    result = {'symptom': None, 'technical_analysis': None,
              'corrective_action': None, 'preventive_action': None}
    if not text:
        return result

    pattern = r'(Sympton|Symptom|Technical Analysist|Corrective Action|Preventive Action)\s*:\s*(.*?)(?=(?:Sympton|Symptom|Technical Analysist|Corrective Action|Preventive Action)\s*:|$)'
    matches = re.findall(pattern, str(text), re.DOTALL)
    key_map = {
        'sympton': 'symptom', 'symptom': 'symptom',
        'technical analysist': 'technical_analysis',
        'corrective action': 'corrective_action',
        'preventive action': 'preventive_action',
    }
    for label, value in matches:
        key = key_map.get(label.strip().lower())
        if key:
            v = value.strip()
            result[key] = v if v else None
    return result


def transform_record(raw):
    """Ubah 1 baris mentah (dict by column index) jadi bundel siap insert."""
    d = raw

    delivery_date = excel_serial_to_date(d.get(COLUMN['delivery_date']))
    complaint_date = excel_serial_to_date(d.get(COLUMN['complaint_date']))
    closing_date_wo = excel_serial_to_date(d.get(COLUMN['closing_date_wo']))
    closing_by_rfu = excel_serial_to_date(d.get(COLUMN['closing_by_rfu_date']))
    goodwill_date = excel_serial_to_date(d.get(COLUMN['goodwill_statement']))
    srd_date = excel_serial_to_date(d.get(COLUMN['srd_publication']))

    pa = parse_problem_analysis(d.get(COLUMN['problem_analysis']))
    timeline = parse_historical_process(d.get(COLUMN['historical_process']))

    part_numbers = split_multiline(d.get(COLUMN['part_number']))
    part_names = split_multiline(d.get(COLUMN['part_name']))
    # Pasangkan by index; jika jumlah tidak sama, sisanya None (butuh
    # verifikasi manual oleh tim -- lihat log 'MISMATCH_PART_COUNT').
    max_len = max(len(part_numbers), len(part_names), 1 if (part_numbers or part_names) else 0)
    parts = []
    for i in range(max_len):
        pn = part_numbers[i] if i < len(part_numbers) else None
        pname = part_names[i] if i < len(part_names) else None
        if pn or pname:
            parts.append({'part_number': pn, 'part_name': pname})

    hm_raw = d.get(COLUMN['hm'])
    try:
        hm_value = float(hm_raw) if hm_raw not in (None, '') else None
    except (TypeError, ValueError):
        hm_value = None

    supply_status = normalize_text(d.get(COLUMN['supply_status']))
    is_full_supplied = None
    if supply_status:
        is_full_supplied = (supply_status.strip().lower() == 'full supplied')

    return {
        'branch_code': normalize_text(d.get(COLUMN['business_area'])),
        'product_code': normalize_text(d.get(COLUMN['product'])),
        'unit_condition': normalize_text(d.get(COLUMN['unit_condition'])),
        'customer_group_name': normalize_text(d.get(COLUMN['customer_group'])),
        'customer_name': normalize_text(d.get(COLUMN['customer'])),
        'unit_model': normalize_text(d.get(COLUMN['unit_model'])) or 'UNKNOWN',
        'serial_number': normalize_text(d.get(COLUMN['serial_number'])),
        'delivery_date': delivery_date,
        'hm_value': hm_value,
        'complaint_date': complaint_date,
        'claimable_status': normalize_text(d.get(COLUMN['claimable_status'])),
        'wo_checking_number': normalize_text(d.get(COLUMN['wo_checking'])),
        'tr_ref': normalize_text(d.get(COLUMN['tr'])),
        'root_cause': normalize_text(d.get(COLUMN['root_cause'])),
        'symptom': pa['symptom'],
        'technical_analysis': pa['technical_analysis'],
        'corrective_action': pa['corrective_action'],
        'preventive_action': pa['preventive_action'],
        'wo_warranty_repair_number': normalize_text(d.get(COLUMN['wo_warranty_repair'])),
        'tsr_ref': normalize_text(d.get(COLUMN['tsr'])),
        'part_readiness': normalize_text(d.get(COLUMN['part_readiness'])),
        'parts': parts,
        'eta_parts_raw': d.get(COLUMN['eta_parts']),
        'is_full_supplied': is_full_supplied,
        'current_progress': normalize_text(d.get(COLUMN['current_progress'])),
        'pic_name': normalize_text(d.get(COLUMN['pic'])),
        'status_wo': normalize_text(d.get(COLUMN['status_wo'])) or 'Belum Closed',
        'closing_date_wo': closing_date_wo,
        'closing_by_rfu_date': closing_by_rfu,
        'goodwill_statement_date': goodwill_date,
        'srd_publication_date': srd_date,
        'bottleneck_process': normalize_text(d.get(COLUMN['bottleneck_process'])),
        'old_new_issue': normalize_text(d.get(COLUMN['old_new_issue'])) or 'New Issue',
        'timeline': timeline,
    }


# ---------------------------------------------------------------------
# Load ke PostgreSQL
# ---------------------------------------------------------------------

def run_etl(xlsb_path, dsn, dry_run=False, truncate_first=False):
    records, headers = extract_new_master(xlsb_path)

    # --- VALIDASI HEADER: wajib dicek SEBELUM transform_record dipanggil,
    # karena transform_record membaca kolom berdasarkan index angka tetap
    # (lihat dict COLUMN). Kalau ada kolom disisipkan di tengah file baru,
    # semua index setelahnya bergeser dan data akan terbaca SALAH TANPA
    # ERROR APAPUN -- jadi ini harus jadi hard-stop, bukan warning biasa.
    header_mismatches = validate_headers(headers)
    if header_mismatches:
        print("[ERROR] Struktur kolom file TIDAK SESUAI dengan yang diharapkan "
              "script ini. Kemungkinan ada kolom baru yang disisipkan DI TENGAH "
              "sheet 'New Master Prodsue' (bukan di akhir), sehingga index kolom "
              "bergeser dan --COLUMN dict di script ini jadi salah acuan.\n")
        for idx, expected, actual in header_mismatches:
            print(f"  Kolom index {idx}: diharapkan '{expected}', "
                  f"ditemukan {actual!r} di file")
        print("\nETL DIHENTIKAN -- tidak ada data yang ditulis ke database. "
              "Cek apakah ada kolom baru di tengah sheet, lalu update dict "
              "COLUMN dan EXPECTED_HEADERS di etl_migrate.py sesuai posisi "
              "barunya sebelum menjalankan ulang.")
        return

    ka_list = extract_customer_ka_list(xlsb_path)
    transformed = [transform_record(r) for r in records]

    print(f"[INFO] Validasi header: OK, struktur kolom sesuai yang diharapkan.")
    print(f"[INFO] {len(transformed)} baris data riil ditemukan di New Master Prodsue.")
    print(f"[INFO] {len(ka_list)} baris master customer KA ditemukan.")

    # Validasi ringan sebelum insert -- ini yang perlu dicek manual
    # oleh tim jika muncul warning.
    missing_complaint = [i for i, r in enumerate(transformed) if r['complaint_date'] is None]
    if missing_complaint:
        print(f"[WARNING] {len(missing_complaint)} baris tanpa complaint_date valid -- "
              f"baris ini TIDAK BISA di-insert karena complaint_date NOT NULL. "
              f"Index (0-based dari data riil): {missing_complaint}")

    part_count_mismatch = []
    for i, raw in enumerate(records):
        pn = split_multiline(raw.get(COLUMN['part_number']))
        pname = split_multiline(raw.get(COLUMN['part_name']))
        if pn and pname and len(pn) != len(pname):
            part_count_mismatch.append(i)
    if part_count_mismatch:
        print(f"[WARNING] {len(part_count_mismatch)} baris punya jumlah part_number vs "
              f"part_name yang TIDAK SAMA -- pasangan part/nama mungkin salah. "
              f"Index: {part_count_mismatch}. Perlu dicek manual ke file asli.")

    if dry_run:
        print("\n[DRY RUN] Tidak ada insert ke database. Contoh 1 record hasil transformasi:")
        import json
        sample = {k: (str(v) if isinstance(v, datetime.date) else v)
                   for k, v in transformed[0].items()}
        print(json.dumps(sample, indent=2, ensure_ascii=False, default=str))
        return

    import psycopg2
    from psycopg2.extras import execute_values

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()

    # PENTING: SET search_path di 01_schema_product_issue.sql hanya
    # berlaku untuk sesi psql saat file itu dijalankan -- tidak terbawa
    # ke koneksi baru ini. Tanpa baris berikut, semua query tanpa prefix
    # schema (SELECT ... FROM ref_root_cause) akan dicari di 'public'
    # dan gagal dengan UndefinedTable meski tabelnya ada di product_issue.
    cur.execute("SET search_path TO product_issue")

    # --- TRUNCATE (opsional, hanya jika --truncate-first disebutkan) ---
    # Ini strategi "full reload" untuk tabel TRANSAKSIONAL, yang tidak
    # punya ON CONFLICT (lihat catatan di docstring atas file ini) --
    # jadi re-run tanpa truncate akan membuat baris lama terduplikasi.
    #
    # Tabel MASTER (dim_customer, dim_branch, dst) TIDAK di-truncate,
    # karena mereka sudah aman di-re-run berkat ON CONFLICT, dan
    # men-truncate-nya justru akan menghapus relasi yang masih dipakai
    # sebelum sempat dibuat ulang.
    #
    # Urutan TRUNCATE memperhatikan foreign key: child dulu (case_part,
    # case_timeline, case_progress_log, claim), baru parent-nya
    # (fact_issue_case). CASCADE ditambahkan sebagai pengaman kalau ada
    # relasi lain yang belum diantisipasi.
    if truncate_first:
        print("\n[TRUNCATE] Anda meminta --truncate-first. Ini akan MENGHAPUS "
              "SELURUH data di fact_issue_case, claim, case_timeline, "
              "case_part, dan case_progress_log (tabel master seperti "
              "dim_customer TIDAK terpengaruh).")
        confirm = input("Ketik 'YES' (huruf besar semua) untuk melanjutkan, "
                         "atau apapun selain itu untuk membatalkan: ")
        if confirm != 'YES':
            print("[DIBATALKAN] Tidak jadi truncate, ETL dihentikan tanpa perubahan apapun.")
            cur.close()
            conn.close()
            return

        cur.execute("""
            TRUNCATE TABLE
                case_part, case_timeline, case_progress_log, claim, fact_issue_case
            CASCADE
        """)
        conn.commit()
        print("[TRUNCATE] Selesai. Tabel transaksional sudah kosong, lanjut insert data baru.\n")

    try:
        # --- 1. Load lookup tables ke memory (id by normalized name) ---
        def load_lookup(table, id_col, name_col):
            cur.execute(f"SELECT {id_col}, {name_col} FROM {table}")
            return {normalize_key(name): id_ for id_, name in cur.fetchall()}

        root_cause_map = load_lookup('ref_root_cause', 'root_cause_id', 'root_cause_name')
        bottleneck_map = load_lookup('ref_bottleneck_reason', 'bottleneck_id', 'bottleneck_name')
        claimable_map = load_lookup('ref_claimable_status', 'claimable_status_id', 'status_name')
        condition_map = load_lookup('ref_unit_condition', 'unit_condition_id', 'condition_name')
        readiness_map = load_lookup('ref_part_readiness', 'part_readiness_id', 'readiness_name')
        cust_group_map = load_lookup('dim_customer_group', 'customer_group_id', 'group_name')

        # --- 2. Upsert dim_customer_group dari List Customer KA (lengkapi yang belum ada) ---
        for name, group, ka_type in ka_list:
            gk = normalize_key(group)
            if gk and gk not in cust_group_map:
                cur.execute(
                    "INSERT INTO dim_customer_group (group_name, key_account_type) "
                    "VALUES (%s, %s) ON CONFLICT (group_name) DO NOTHING "
                    "RETURNING customer_group_id",
                    (group, ka_type)
                )
                row = cur.fetchone()
                if row:
                    cust_group_map[gk] = row[0]

        # --- 3. Upsert dim_branch, dim_product_model, dim_pic, dim_customer, dim_unit_asset ---
        branch_map, product_map, pic_map, customer_map = {}, {}, {}, {}
        unit_asset_map = {}  # key: (product_model_id, unit_model, serial_number)

        def get_or_create(table, id_col, unique_col, value, cache, extra_cols=None):
            key = normalize_key(value)
            if key in cache:
                return cache[key]
            cols = [unique_col] + (list(extra_cols.keys()) if extra_cols else [])
            vals = [value] + (list(extra_cols.values()) if extra_cols else [])
            placeholders = ', '.join(['%s'] * len(vals))
            colnames = ', '.join(cols)
            cur.execute(
                f"INSERT INTO {table} ({colnames}) VALUES ({placeholders}) "
                f"ON CONFLICT ({unique_col}) DO UPDATE SET {unique_col} = EXCLUDED.{unique_col} "
                f"RETURNING {id_col}",
                vals
            )
            new_id = cur.fetchone()[0]
            cache[key] = new_id
            return new_id

        for r in transformed:
            if r['branch_code']:
                get_or_create('dim_branch', 'branch_id', 'branch_code', r['branch_code'], branch_map)
            if r['product_code']:
                get_or_create('dim_product_model', 'product_model_id', 'product_code', r['product_code'], product_map)
            if r['pic_name']:
                get_or_create('dim_pic', 'pic_id', 'pic_name', r['pic_name'], pic_map)
            if r['customer_name']:
                cg_id = cust_group_map.get(normalize_key(r['customer_group_name']))
                get_or_create('dim_customer', 'customer_id', 'customer_name', r['customer_name'],
                               customer_map, extra_cols={'customer_group_id': cg_id})

        conn.commit()  # commit master dulu supaya unit_asset bisa FK ke product_model

        for r in transformed:
            pm_id = product_map.get(normalize_key(r['product_code']))
            ua_key = (pm_id, normalize_key(r['unit_model']), r['serial_number'])
            if ua_key not in unit_asset_map and pm_id:
                if r['serial_number']:
                    cur.execute(
                        "INSERT INTO dim_unit_asset (product_model_id, unit_model_name, serial_number, delivery_date) "
                        "VALUES (%s, %s, %s, %s) "
                        "ON CONFLICT (serial_number) DO UPDATE SET serial_number = EXCLUDED.serial_number "
                        "RETURNING unit_asset_id",
                        (pm_id, r['unit_model'], r['serial_number'], r['delivery_date'])
                    )
                else:
                    cur.execute(
                        "INSERT INTO dim_unit_asset (product_model_id, unit_model_name, serial_number, delivery_date) "
                        "VALUES (%s, %s, NULL, %s) RETURNING unit_asset_id",
                        (pm_id, r['unit_model'], r['delivery_date'])
                    )
                unit_asset_map[ua_key] = cur.fetchone()[0]

        conn.commit()

        # --- 4. Insert fact_issue_case + child tables ---
        inserted, skipped = 0, 0
        for r in transformed:
            if r['complaint_date'] is None:
                skipped += 1
                continue

            branch_id = branch_map.get(normalize_key(r['branch_code']))
            customer_id = customer_map.get(normalize_key(r['customer_name']))
            pm_id = product_map.get(normalize_key(r['product_code']))
            ua_key = (pm_id, normalize_key(r['unit_model']), r['serial_number'])
            unit_asset_id = unit_asset_map.get(ua_key)
            pic_id = pic_map.get(normalize_key(r['pic_name'])) if r['pic_name'] else None
            root_cause_id = root_cause_map.get(normalize_key(r['root_cause'])) if r['root_cause'] else None
            condition_id = condition_map.get(normalize_key(r['unit_condition'])) if r['unit_condition'] else None
            bottleneck_id = bottleneck_map.get(normalize_key(r['bottleneck_process'])) if r['bottleneck_process'] else None

            if not (branch_id and customer_id and unit_asset_id):
                print(f"[SKIP] Baris dengan complaint_date={r['complaint_date']} dilewati -- "
                      f"branch/customer/unit_asset tidak lengkap.")
                skipped += 1
                continue

            cur.execute(
                """
                INSERT INTO fact_issue_case (
                    branch_id, customer_id, unit_asset_id, pic_id, hm_value,
                    complaint_date, unit_condition_id, root_cause_id,
                    symptom_text, technical_analysis_text, corrective_action_text,
                    preventive_action_text, wo_checking_number, wo_warranty_repair_number,
                    tr_document_ref, tsr_document_ref, bottleneck_id,
                    goodwill_statement_date, srd_publication_date, old_or_new_issue
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING issue_case_id
                """,
                (branch_id, customer_id, unit_asset_id, pic_id, r['hm_value'],
                 r['complaint_date'], condition_id, root_cause_id,
                 r['symptom'], r['technical_analysis'], r['corrective_action'],
                 r['preventive_action'], r['wo_checking_number'], r['wo_warranty_repair_number'],
                 r['tr_ref'], r['tsr_ref'], bottleneck_id,
                 r['goodwill_statement_date'], r['srd_publication_date'], r['old_new_issue'])
            )
            issue_case_id = cur.fetchone()[0]

            # claim (1-ke-1)
            claimable_id = claimable_map.get(normalize_key(r['claimable_status']))
            if claimable_id:
                cur.execute(
                    """
                    INSERT INTO claim (issue_case_id, claimable_status_id, closing_date_wo,
                                        closing_by_rfu_date, status_wo)
                    VALUES (%s,%s,%s,%s,%s)
                    """,
                    (issue_case_id, claimable_id, r['closing_date_wo'],
                     r['closing_by_rfu_date'], r['status_wo'])
                )

            # case_timeline (banyak baris)
            for code, dt in r['timeline'].items():
                cur.execute(
                    "INSERT INTO case_timeline (issue_case_id, checkpoint_code, checkpoint_date) "
                    "VALUES (%s,%s,%s) ON CONFLICT (issue_case_id, checkpoint_code) DO NOTHING",
                    (issue_case_id, code, dt)
                )

            # case_part (banyak baris)
            for p in r['parts']:
                readiness_id = readiness_map.get(normalize_key(r['part_readiness']))
                cur.execute(
                    """
                    INSERT INTO case_part (issue_case_id, part_number, part_name,
                                            part_readiness_id, is_full_supplied)
                    VALUES (%s,%s,%s,%s,%s)
                    """,
                    (issue_case_id, p['part_number'], p['part_name'],
                     readiness_id, r['is_full_supplied'])
                )

            # case_progress_log (1 entry dari current_progress -- catatan ada di bawah)
            if r['current_progress']:
                cur.execute(
                    "INSERT INTO case_progress_log (issue_case_id, log_date, log_text) "
                    "VALUES (%s, %s, %s)",
                    (issue_case_id, r['complaint_date'], r['current_progress'])
                )

            inserted += 1

        conn.commit()
        print(f"\n[DONE] {inserted} kasus berhasil di-insert, {skipped} dilewati (lihat log di atas).")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


# ---------------------------------------------------------------------

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='ETL master_prodsue_raw.xlsb -> PostgreSQL')
    parser.add_argument('--xlsb', required=True, help='Path ke file .xlsb')
    parser.add_argument('--dsn', help='PostgreSQL DSN, contoh: postgresql://user:pass@host:5432/db')
    parser.add_argument('--dry-run', action='store_true', help='Cuma tampilkan hasil transformasi, tidak insert')
    parser.add_argument('--truncate-first', action='store_true',
                         help='Kosongkan fact_issue_case dan tabel anaknya (claim, case_timeline, '
                              'case_part, case_progress_log) sebelum insert. WAJIB dipakai saat '
                              're-run dengan file .xlsb yang sudah pernah di-migrate sebelumnya -- '
                              'tanpa ini, baris lama akan terduplikasi karena fact_issue_case belum '
                              'idempotent. Tabel master (dim_customer, dst) TIDAK terpengaruh flag ini.')
    args = parser.parse_args()

    if not args.dry_run and not args.dsn:
        print("Error: --dsn wajib diisi kecuali pakai --dry-run", file=sys.stderr)
        sys.exit(1)

    if args.truncate_first and args.dry_run:
        print("Error: --truncate-first tidak relevan dengan --dry-run "
              "(dry-run tidak pernah menyentuh database sama sekali).", file=sys.stderr)
        sys.exit(1)

    run_etl(args.xlsb, args.dsn, dry_run=args.dry_run, truncate_first=args.truncate_first)
