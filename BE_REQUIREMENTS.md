# Requirements FE → BE (Modul M13 Kehadiran)

> **Untuk**: Ikmal (Backend) & Dera (System Analyst)
> **Dari**: Azhar (Frontend)
> **Tanggal**: 21 Okt 2026
>
> FE saat ini berjalan full di mode **mock** (`NEXT_PUBLIC_USE_MOCK=true`).
> Dokumen ini merangkum **apa yang FE perlukan dari BE** agar bisa switch ke
> `NEXT_PUBLIC_USE_MOCK=false`. Endpoint versi final dari Dera (System Analyst)
> akan menggantikan/melengkapi spesifikasi di sini.

## 1. Endpoint yang sudah ada di BE & FE sudah map

| # | FE panggil | Path BE | Status BE | Catatan |
|---|---|---|---|---|
| 1 | `GET /api/working-hours` | ✅ ada | **BUG**: 405 Method Not Allowed | BE hanya punya POST. FE perlu GET untuk load data awal form + dashboard. |
| 2 | `POST /api/working-hours` | ✅ ada | Jalan | Body: `{jam_masuk, jam_pulang, toleransi_keterlambatan}`. |
| 3 | `POST /api/attendance/check-in` | ✅ ada | Jalan | Body: `{karyawan_id, latitude, longitude, accuracy_m, geo_timestamp, spoof_suspect, spoof_reasons}`. |
| 4 | `POST /api/attendance/check-out` | ❌ **TIDAK ADA** | FE butuh | Body sama dengan check-in. Response: `{data: {check_in, check_out, status}}`. |
| 5 | `GET /api/attendance/today` | ❌ **TIDAK ADA** | FE butuh | Query: `?karyawan_id=N`. Response: `{sudah_absen: bool, data: {check_in, check_out, status} \| null}`. |
| 6 | `GET /api/attendance/recap?bulan=N&tahun=N` | ✅ ada | **BUG**: SQL error | `EXTRACT(YEAR FROM tahun)` → seharusnya `EXTRACT(YEAR FROM tanggal)`. |
| 7 | `POST /api/leave-permissions` | ✅ ada | Jalan | Body: `{tanggal, jenis, alasan}` (per-tanggal, bukan rentang). |
| 8 | `GET /api/leave-permissions` | ✅ ada | Jalan | Response: array. |

## 2. Endpoint yang BELUM ADA di BE (FE pakai mock sementara)

> FE **sudah siap** menerima response; tinggal BE bikin endpoint-nya.

### 2.1 `GET /api/attendance/history`

**Dipakai**: kartu "Riwayat 5 Presensi Terakhir" di dashboard karyawan.

```jsonc
// Response 200 — array 5 entri terakhir (descending by tanggal)
[
  {
    "id": "att-001",
    "tanggal": "2026-10-20",
    "jam_check_in": "08:12",
    "jam_check_out": "17:05",
    "status": "hadir",          // hadir | terlambat | izin | sakit | cuti | alpa
    "lokasi": "Kantor Araya, Jl. Blimbing Indah Megah No. 1"  // nullable
  }
]
```

- Filter: hanya data karyawan yang login (via `X-Employee-Id` header atau `karyawan_id` query).
- Kalau 0 entri → `[]` (kosong, bukan error).

### 2.2 `GET /api/leave/quota`

**Dipakai**: kartu "Sisa Kuota Cuti Tahunan" di dashboard karyawan.

```jsonc
// Response 200
{
  "tahun": 2026,
  "total": 12,
  "sisa": 9
}
```

- Kuota per tahun per karyawan. Jika belum ada data → `{tahun, total: 0, sisa: 0}`.

### 2.3 `GET /api/approvals?status=pending|approved|rejected|all`

**Dipakai**: halaman HR "Persetujuan Izin & Sakit" (`/kehadiran/approval`).

```jsonc
// Response 200 — array
[
  {
    "id": "abs-001",
    "tanggal": "2026-10-19",
    "jenis": "sakit",
    "alasan": "Demam, ada surat dokter",
    "status": "pending",        // pending | approved | rejected
    "createdAt": "2026-10-19T09:15:00+07:00",
    "karyawan_id": "3",
    "employeeName": "Sinta Maharani",
    "employeeDivision": "Operasional"
  }
]
```

- **Hanya role `admin_hr`** (403 jika karyawan).
- Sorted `createdAt` descending.
- `employeeName` / `employeeDivision` = JOIN tabel karyawan (atau array terpisah, FE toleran).

### 2.4 `PATCH /api/approvals/:id`

**Dipakai**: tombol "Setujui" / "Tolak" di halaman approval HR.

```jsonc
// Request
{ "decision": "approved" }   // atau "rejected"

// Response 200
{
  "id": "abs-001",
  "status": "approved"
}

// Error 409 — sudah diproses
{ "error": "Pengajuan sudah diproses sebelumnya." }

// Error 404
{ "error": "Pengajuan tidak ditemukan." }
```

- Setelah approve/reject, status di tabel `absence_requests` / `leave_permissions` ikut update.

### 2.5 `GET /api/leave/approved?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Dipakai**: integrasi cuti M12 → status "cuti" di rekap kehadiran (US4).

```jsonc
// Response 200
[
  {
    "karyawan_id": "3",
    "tanggal": "2026-10-07",
    "status": "cuti"
  }
]
```

- Tanggal range inklusif. Jika kosong → `[]`.

## 3. Bug BE yang harus difix (dari sprint plan US1-08 / US5-08)

| # | Endpoint | Bug | Fix |
|---|---|---|---|
| 1 | `GET /api/working-hours` | 405 Method Not Allowed | Tambah handler `GET` (kembalikan baris `working_hours_rules` id=1). |
| 2 | `GET /api/attendance/recap` | SQL: `EXTRACT(YEAR FROM tahun)` | Ubah jadi `EXTRACT(YEAR FROM tanggal)`. |
| 3 | `POST /api/attendance/check-in` | 500 jika `working_hours_rules` kosong | Return 400 + pesan jelas, bukan 500. |
| 4 | `POST /api/attendance/check-in` | Tidak terima geolokasi | Tambah field `latitude, longitude, accuracy_m, geo_timestamp, spoof_suspect, spoof_reasons` di request body (FE sudah kirim). |

## 4. Kontrak umum FE

| Aspek | Nilai |
|---|---|
| **Auth** | FE kirim header `X-Employee-Id: <id>` di semua request (isi: `emp-1` / `emp-2` / `emp-3` di mock; BE bisa pakai numeric id dari DB). |
| **Base URL** | Env `NEXT_PUBLIC_API_BASE_URL` → FE prepend ke semua path. |
| **Error format** | FE terima dua bentuk: `{error: "msg"}` (BE saat ini) dan `{code, message, fields?}` (mock). Tidak perlu unifikasi — FE sudah handle keduanya. |
| **Waktu** | Semua jam WIB (`+07:00`). FE tidak convert. |
| **Format jam** | `"HH:MM"` di FE (mock), `"HH:MM:SS"` di BE. FE otomatis `.slice(0,5)`. |

## 5. Yang BELUM bisa FE kerjakan tanpa BE

- **Check-out** — tombol di dashboard terkunci (404) sampai BE tambah `POST /api/attendance/check-out`.
- **History 5 terakhir** — tabel selalu kosong sampai `GET /api/attendance/history` ada.
- **Kuota cuti** — angka 0 sampai `GET /api/leave/quota` ada.
- **Approval HR** — list + aksi setujui/tolak tidak jalan di BE sampai endpoint 2.3 & 2.4 ada.
- **Rekap** — error 500 sampai bug SQL recap difix.

> **Catatan**: spesifikasi final dari Dera (System Analyst) akan menggantikan
> dokumen ini. Jika ada field tambahan / perubahan shape, FE tinggal update
> mapper di `src/lib/api/kehadiran.ts` (satu file).
