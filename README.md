# FE Modul M13 — Kehadiran (Araya Business Hub Platform)

Frontend **Modul Kehadiran (M13, Kel. C4)** — Next.js App Router + TypeScript + Tailwind (token CSS).
UI terhubung **langsung ke BE live** (`laboratorium-backend.vercel.app`). Data presensi, rekap, dan izin
datang dari endpoint BE nyata; fitur yang belum punya endpoint di BE menampilkan empty-state.

Relasi dokumen:

- `SYSTEM_ANALYST_M13_v3.xlsx` — SA v3 (kontrak E01–E27; sebagian belum di-deploy di BE)
- `Sprint_Plan_M13_Presensi.xlsx` — rencana & status sprint
- `Panduan_UI_Capstone_Project_05_Oktober.pdf` v1.0 → `stitch_employee_hr_portal_redesign/` (referensi desain)

> **FE tidak lagi punya mode mock.** Semua route handler mock (`src/app/api/mock/**`) dan
> `src/mocks/` sudah dihapus. `client.ts` selalu menembak `NEXT_PUBLIC_API_BASE_URL` dan
> mengirim cookie sesi (`araya_employee`) sebagai header `X-Employee-Id`.

---

## 1. Ringkasan status

| US | Halaman | Route | Role | Status FE |
|---|---|---|---|---|
| M13-US1 | Pengaturan jam kerja (POST global) | `/kehadiran/pengaturan` | `admin_hr` | **live** — `POST /api/working-hours` |
| M13-US2 | Kehadiran hari ini + presensi | `/kehadiran/hari-ini` | `karyawan` | **live** — `GET /api/attendance/today`, `POST check-in/check-out` |
| M13-US2 | Riwayat kehadiran | `/kehadiran/riwayat` | semua | empty-state (BE belum punya endpoint riwayat harian) + kartu hari ini |
| M13-US3 | Ajukan izin/sakit | `/kehadiran/izin` | `karyawan` | **live** — `GET/POST /api/leave-permissions` |
| M13-US3 | Riwayat pengajuan | `/kehadiran/izin/riwayat` | `karyawan` | **live** — `GET /api/leave-permissions` |
| M13-US3 | Persetujuan izin/sakit | `/kehadiran/approval` | `admin_hr` | empty-state (BE belum punya endpoint review) |
| M13-US5 | Rekap bulanan | `/kehadiran/rekap` | `admin_hr` / `karyawan` | **live** — `GET /api/attendance/recap?bulan=&tahun=` |
| — | Masuk (login) | `/masuk` | semua | **placeholder** — menunggu endpoint login dari BE (`POST /api/auth/login`); belum ada mock akun demo |

Build: `npm run build` **hijau** (Next 15.5, React 19, TypeScript strict).

---

## 2. Cara menjalankan

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Node 20+.

### Environment

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_BASE_URL=https://laboratorium-backend.vercel.app
```

- `NEXT_PUBLIC_USE_MOCK` sudah tidak dibaca kode (mock dihapus); dibiarkan `false` eksplisit.
- `client.ts` selalu menembak `NEXT_PUBLIC_API_BASE_URL` dan mengirim cookie sesi
  (`araya_employee`) sebagai header `X-Employee-Id` — BE autentikasi per endpoint, bukan token.
- Belum ada cookie → dialihkan ke `/masuk`. Ganti peran: **Keluar** dari menu akun, masuk identitas lain.
- Tidak ada reset data mock (data hidup di DB Neon milik BE).

---

## 3. Struktur folder

```
src/
  app/
    (app)/kehadiran/
      pengaturan/page.tsx         # US1 — aturan per jabatan + hari libur
      hari-ini/page.tsx           # US2 — check-in/out + GPS
      riwayat/page.tsx            # US2/US4 — riwayat kehadiran (E11)
      izin/page.tsx               # US3 — form pengajuan
      izin/riwayat/page.tsx       # US3 — riwayat pengajuan
      approval/page.tsx           # US3 — persetujuan HR (E15)
      rekap/page.tsx              # US5 (+US4) — rekap & siklus M14
    api/mock/**                   # mock BE, path = kontrak SA (§7)
  components/
    kehadiran/
      WorkSettingsForm.tsx        # US1
      AttendanceHistoryPage.tsx   # E11
      RecapWorkflow.tsx           # E19–E22 (hitung/kunci/kirim + log)
      MonthlySummaryPage.tsx      # US5/US4
      AbsenceFormPage.tsx / AbsenceHistoryPage.tsx / ApprovalPage.tsx
      PresensiCTA.tsx, TerminalPresensiHariIni.tsx, TodayCard.tsx, …  # dashboard US2
    ui/ layout/ auth/
  lib/
    api/          # client.ts (mock-aware) + kehadiran.ts (satu fungsi = satu endpoint)
    auth/         # constants.ts + session.ts (cookie & guard, server)
    format/ types/ validation/
  mocks/store.ts  # seed + store in-memory (ERD v2)
  styles/tokens.css
```

---

## 4. Aturan yang berlaku di UI

- Warna **hanya** dari token (`src/styles/tokens.css`). Tidak ada hex di `src/`.
- Skala `spacing` dan `fontSize` Tailwind **di-override** di `tailwind.config.ts`.
- Font: Plus Jakarta Sans (judul) + Source Sans 3 (isi) dari Google Fonts.
- Angka tabel: `tabular-nums` + rata kanan (`<Table>` mengurus ini).
- Badge = titik + kata, satu badge per baris.
- **Satu tombol utama per layar**, "Batal" di kiri aksi utama.
- Loading = skeleton; error = banner + "Coba lagi"; empty = satu kalimat + satu aksi.
- Responsif: ≥1024px sidebar tetap, <1024px laci, <640px satu kolom.
  Tabel bergulir **di dalam kartu**; halaman tidak bergulir ke samping di 400px (diverifikasi).
- **Mode gelap tidak dipakai.** Nilai gelap Lampiran PDF tetap ada di `tokens.css`
  sebagai `:root[data-theme="dark"]`, aktif hanya bila atribut itu dipasang manual.

---

## 5. Kontrak API — mengikuti SA (E01–E23)

Semua path **relatif**. Saat mock, FE memetakan `/api/...` → `/api/mock/...`;
saat BE asli, FE memakai `NEXT_PUBLIC_API_BASE_URL` + path yang sama.
**BE cukup menyediakan path di kolom "Path", tanpa prefix `/api/mock`.**

### 5.1 Status implementasi per endpoint

| ID | Method | Path | Role | Dipakai FE | Status di BE (per SA) |
|---|---|---|---|---|---|
| E01 | `POST` | `/api/working-hours` | `admin_hr` | ✅ US1 | belum (usulan) |
| E02 | `GET` | `/api/working-hours` | `admin_hr` | ✅ US1 (riwayat versi) | belum |
| E03 | `GET` | `/api/working-hours/active` | semua | ✅ US1/US2 (aturan jabatan sendiri) | belum |
| E04 | `GET` | `/api/working-hours/{id}` | `admin_hr` | ✅ tersedia di mock, belum dipakai UI | belum |
| E05 | `POST` | `/api/holidays` | `admin_hr` | ✅ US1 | belum |
| E06 | `GET` | `/api/holidays` | semua | ✅ US1 | belum |
| E07 | `DELETE` | `/api/holidays/{id}` | `admin_hr` | ✅ US1 | belum |
| E08 | `POST` | `/api/attendance/check-in` | `karyawan` | ✅ US2 | **ada di Swagger** |
| E09 | `POST` | `/api/attendance/check-out` | `karyawan` | ✅ US2 | **ada di Swagger** |
| E10 | `GET` | `/api/attendance/today` | semua | ✅ US2 | **ada di Swagger** |
| E11 | `GET` | `/api/attendance?month=YYYY-MM` | HR semua / karyawan sendiri | ✅ `/kehadiran/riwayat` + export CSV | belum |
| E12 | `GET` | `/api/attendance-statuses` | semua | ❌ tidak dipakai (6 status baku di FE) | usulan |
| E13 | `POST` | `/api/absence-requests` | `karyawan` | ✅ US3 (satu tanggal) | belum |
| E14 | `GET` | `/api/absence-requests?status=` | HR semua / karyawan sendiri | ✅ US3 | belum |
| E15 | `PATCH` | `/api/absence-requests/{id}/review` | `admin_hr` | ✅ persetujuan | belum |
| E16 | `GET` | `/api/leaves?status=APPROVED&from=&to=` | sistem/HR | ✅ US4 (kontrak M12) | **kontrak M12** |
| E17 | `POST` | `/api/attendance/sync-leaves` | sistem/HR | ❌ belum dipakai | usulan |
| E18 | `GET` | `/api/recaps?month=YYYY-MM` | HR semua / karyawan sendiri | ✅ US5 | belum |
| E19 | `POST` | `/api/recaps/generate` | `admin_hr` | ✅ US5 | belum |
| E20 | `POST` | `/api/recaps/lock` | `admin_hr` | ✅ US5 | belum |
| E21 | `POST` | `/api/recaps/send-to-m14` | `admin_hr` | ✅ US5 | belum |
| E22 | `GET` | `/api/recap-exports` | `admin_hr` | ✅ log pengiriman | belum |
| E23 | `GET` | `/api/audit-logs` | `admin_hr` | ❌ tidak dipakai (`Usulan` di SA) | usulan |
| — | `GET` | `/me` | semua | ✅ identitas + role | belum jelas (auth) |
| — | `GET` | `/api/positions` | semua | ✅ **mock-only** (ref M12) | digantikan M12 |

Catatan:

- **E17 sengaja tidak dipanggil FE.** Sinkronisasi cuti M12 → kehadiran adalah proses server.
  FE membaca hasilnya lewat E16 + kolom `cuti` di E18.
- **E23 (audit log)** tidak ditampilkan: tidak ada AC US1–US5 yang memintanya. Perubahan aturan
  tetap dicatat di BE (`created_by` sudah dikirim).
- **E12** tidak dipanggil: FE memakai 6 status baku panduan UI (`hadir`, `terlambat`, `izin`,
  `sakit`, `cuti`, `alpa`).
- **E04** sudah ada di mock untuk kelengkapan kontrak; UI memakai E02/E03.

### 5.2 Aturan umum

| Hal | Kesepakatan |
|---|---|
| Base URL | `NEXT_PUBLIC_API_BASE_URL`, tanpa trailing slash |
| Zona waktu acuan | **server WIB** (`Asia/Jakarta`) |
| Toleransi | **menit**, bilangan bulat **0–15** (maks. 15 per SA) |
| Format bulan | `YYYY-MM` |
| Timestamp | ISO 8601 dengan offset — `2026-10-05T08:17:00+07:00` |
| Tanggal tanpa jam | `YYYY-MM-DD` |
| Angka | number JSON, bukan string |
| Header FE | `Content-Type: application/json` pada POST/PATCH/PUT |
| Autentikasi | belum ada; mock memakai cookie `araya_employee` |
| Cookies lintas origin | FE belum mengirim `credentials` |

**Amplop galat** (semua non-2xx):

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Jam pulang harus setelah jam masuk.",
  "fields": { "workEnd": "Jam pulang harus setelah jam masuk." }
}
```

Kode yang dipakai FE: `VALIDATION_ERROR`, `INVALID_MONTH`, `ALREADY_CHECKED_IN`,
`NOT_CHECKED_IN`, `ALREADY_CHECKED_OUT`, `NOT_FOUND`, `NOT_CANCELLABLE`,
`DUPLICATE_EFFECTIVE_DATE`, `DUPLICATE_HOLIDAY`, `DATE_CONFLICT`,
`RECAP_NOT_GENERATED`, `RECAP_LOCKED`, `RECAP_NOT_LOCKED`, `RECAP_SENT`,
`FORBIDDEN`, `NETWORK_ERROR` (dibuat FE).

### 5.3 E01–E04 — aturan jam kerja per jabatan (US1)

ERD v2: `working_hours` milik **jabatan**, ber-versi.

**`POST /api/working-hours`** (201)

```json
{
  "positionId": "pos-staff",
  "workStart": "08:00",
  "workEnd": "17:00",
  "lateToleranceMinutes": 15,
  "workDays": [1, 2, 3, 4, 5],
  "effectiveFrom": "2026-11-01"
}
```

Kontrak snake_case SA juga diterima: `position_id`, `clock_in_time`, `clock_out_time`,
`late_tolerance_minutes`, `work_days` (`"1,2,3,4,5"`), `effective_from`.

**Response `GET /api/working-hours`** (array, terbaru dulu):

```json
[
  {
    "id": "wh-2",
    "positionId": "pos-staff",
    "positionName": "Staff",
    "workStart": "08:00",
    "workEnd": "17:00",
    "lateToleranceMinutes": 15,
    "workDays": [1, 2, 3, 4, 5],
    "effectiveFrom": "2026-10-01",
    "effectiveTo": null,
    "createdAt": "2026-10-01T08:30:00+07:00",
    "createdBy": "emp-1"
  }
]
```

**Aturan bisnis yang wajib dijaga BE** (sama dengan mock):

1. `workEnd > workStart`.
2. `lateToleranceMinutes` integer 0–15.
3. `workDays` minimal satu hari (1 = Senin … 7 = Minggu).
4. `effectiveFrom` tidak boleh tanggal lampau.
5. `UNIQUE(positionId, effectiveFrom)` → 409 `DUPLICATE_EFFECTIVE_DATE`.
6. Saat versi baru dibuat, versi lama ditutup otomatis: `effectiveTo = effectiveFrom - 1 hari`.
7. Satu aturan aktif per jabatan per tanggal.
8. `GET /working-hours/active` mengembalikan aturan untuk **jabatan pengguna** (E03),
   dipakai juga oleh halaman Hari ini untuk menampilkan jam & toleransi.
9. Hanya `admin_hr` yang boleh menulis; perubahan mencatat `createdBy` (audit).

### 5.4 E05–E07 — hari libur (US1)

```json
{ "date": "2026-12-25", "name": "Hari Raya Natal", "type": "NATIONAL" }
```

`type`: `NATIONAL` | `JOINT_LEAVE` | `CUSTOM`. Tanggal unik (409 `DUPLICATE_HOLIDAY`).
Hari libur **bukan hari kerja**, jadi tidak boleh dihitung `alpa` oleh BE di rekap.

### 5.5 E08–E11 — kehadiran (US2)

E08/E09/E10 mengikuti bentuk yang sudah ada (lihat `TodayAttendance` di `types`).
Aturan terlambat:

```
batas       = workStart + lateToleranceMinutes
terlambat   = checkIn > batas
lateMinutes = checkIn - batas
```

**E11 `GET /api/attendance?month=YYYY-MM`** → array, terbaru dulu:

```json
[
  {
    "employeeId": "emp-2",
    "employeeName": "Budi Santoso",
    "tanggal": "2026-10-23",
    "jam_check_in": "07:51",
    "jam_check_out": "17:06",
    "status": "hadir",
    "lokasi": "The Araya lantai 2"
  }
]
```

- `status` ∈ 6 status baku.
- HR menerima semua karyawan; karyawan hanya barisnya sendiri (BE yang memfilter, bukan FE).
- `lokasi` boleh `null` bila tidak ada check-in.

### 5.6 E13–E15 — izin/sakit (US3)

**`POST /api/absence-requests`** (201) — **satu tanggal per pengajuan** (SA):

```json
{ "tanggal": "2026-10-06", "jenis": "izin", "alasan": "Keperluan keluarga" }
```

Bentuk FE (`type`, `startDate`, `endDate`, `reason`) tetap diterima mock; FE selalu mengirim
`endDate == startDate`.

**`GET /api/absence-requests?status=pending|approved|rejected|all`** → array.
Untuk HR, sertakan `employeeName` + `employeeDivision`.

**`PATCH /api/absence-requests/{id}/review`**

```json
{ "decision": "approved" }
```

Hanya `pending` yang bisa diproses (409 `ALREADY_DECIDED` di mock).

`reason` wajib (spasi = kosong), maks 500 karakter. Tanggal bentrok dengan pengajuan aktif
lain → 409 `DATE_CONFLICT` (mock).

### 5.7 E18–E22 — rekap & M14 (US5)

**`GET /api/recaps?month=YYYY-MM`**

```json
{
  "month": "2026-10",
  "hasData": true,
  "rows": [
    {
      "employeeId": "emp-2",
      "name": "Budi Santoso",
      "division": "Keuangan",
      "present": 18,
      "late": 2,
      "izin": 1,
      "sakit": 0,
      "cuti": 2,
      "alpa": 0,
      "totalWorkDays": 23
    }
  ],
  "meta": { "month": "2026-10", "generatedAt": null, "lockedAt": null, "sentAt": null }
}
```

Invarian: `present + late + izin + sakit + cuti + alpa == totalWorkDays`;
`izin/sakit` hanya dari pengajuan `approved`; `cuti` hanya dari cuti disetujui M12;
`alpa` = sisa, minimal 0. Bulan kosong → baris bernilai 0 + `hasData: false`.

**Siklus** (semua `admin_hr`):

| Endpoint | Efek | Galat |
|---|---|---|
| `POST /api/recaps/generate` `{month}` | isi `generatedAt` | 409 `RECAP_LOCKED` |
| `POST /api/recaps/lock` `{month}` | isi `lockedAt` | 409 `RECAP_NOT_GENERATED`, `RECAP_LOCKED` |
| `POST /api/recaps/send-to-m14` `{month}` | isi `sentAt`, buat log | 409 `RECAP_NOT_LOCKED`, `RECAP_SENT` |
| `GET /api/recap-exports` | log pengiriman | — |

**Aturan:** rekap terkunci tidak bisa dihitung ulang; rekap terkirim bersifat final.
Bentuk payload ke M14 **belum ditentukan** — mock hanya mencatat log.

### 5.8 Validasi (dipakai form DAN route mock)

Sumber tunggal: `src/lib/validation/index.ts`.

| Form | Aturan |
|---|---|
| Aturan jam kerja | jabatan wajib; jam `HH:MM`; pulang > masuk; toleransi integer 0–15; hari kerja ≥ 1; tanggal berlaku ≥ hari ini |
| Hari libur | tanggal valid; nama wajib; jenis salah satu dari 3 |
| Izin/sakit | jenis `izin`/`sakit`; tanggal valid; alasan wajib, maks 500 |

---

## 6. Titik revisi kontrak — satu perubahan, satu file

| Kalau BE mengubah… | Ubah file ini saja |
|---|---|
| Path endpoint | `src/lib/api/kehadiran.ts` + nama folder di `src/app/api/mock/**` |
| Base URL | `.env.local` → `NEXT_PUBLIC_API_BASE_URL` |
| Bentuk field request/response | `src/lib/types/index.ts` + `src/lib/api/kehadiran.ts` |
| Amplop galat (`fields`) | `src/lib/api/client.ts` (`ApiError.fields`) |
| Aturan validasi | `src/lib/validation/index.ts` |
| Status baru | `src/lib/types/index.ts` + `Badge.tsx` |
| Kontrak cuti M12 final | `getApprovedLeave()` di `src/lib/api/kehadiran.ts` + perhitungan `cuti` di `src/app/api/mock/recaps/route.ts` |
| Payload M14 final | `sendRecapToM14()` di `src/lib/api/kehadiran.ts` |
| Autentikasi | `src/lib/api/client.ts` (+ `src/lib/auth/session.ts` bila bukan cookie) |
| Daftar jabatan | `POSITIONS` di `src/mocks/store.ts` (BE: dari M12) |
| Format tanggal/jam/angka | `src/lib/format/index.ts` |
| Token desain | `src/styles/tokens.css` + `tailwind.config.ts` |

---

## 7. Mock: cara kerja & batasnya

Semua di prefix `/api/mock`, khusus dev, `force-dynamic`.

| Endpoint mock | Method | Padanan SA |
|---|---|---|
| `/api/mock/working-hours` | GET, POST | E02, E01 |
| `/api/mock/working-hours/active` | GET | E03 |
| `/api/mock/working-hours/{id}` | GET | E04 |
| `/api/mock/holidays` | GET, POST | E06, E05 |
| `/api/mock/holidays/{id}` | DELETE | E07 |
| `/api/mock/attendance` | GET | E11 |
| `/api/mock/attendance/today` | GET | E10 |
| `/api/mock/attendance/check-in` | POST | E08 |
| `/api/mock/attendance/check-out` | POST | E09 |
| `/api/mock/absence-requests` | GET, POST | E14, E13 |
| `/api/mock/absence-requests/{id}/review` | PATCH | E15 |
| `/api/mock/absence-requests/{id}` | DELETE | **mock-only** (pembatalan) |
| `/api/mock/leaves?status=APPROVED` | GET | E16 |
| `/api/mock/recaps?month=` | GET | E18 |
| `/api/mock/recaps/generate` | POST | E19 |
| `/api/mock/recaps/lock` | POST | E20 |
| `/api/mock/recaps/send-to-m14` | POST | E21 |
| `/api/mock/recap-exports` | GET | E22 |
| `/api/mock/positions` | GET | **mock-only** (ref M12) |
| `/api/mock/leave/quota` | GET | **mock-only** (kuota cuti dashboard) |
| `/api/mock/accounts`, `/session`, `/me`, `/reset` | — | mock auth/dev |

**Seed data** (`src/mocks/store.ts`) — fixture sementara, bukan sumber kebenaran:

- Jabatan: `HR` (`pos-hr`), `Staff` (`pos-staff`). Karyawan: `emp-1` Rani (HR),
  `emp-2` Budi (Staff/Keuangan), `emp-3` Sinta (Staff/Operasional).
- Aturan: Staff & HR 08:00–17:00, toleransi 15, Senin–Jumat. Ada satu **versi lama** (bulan lalu)
  untuk menunjukkan `effectiveTo` terisi.
- Hari libur: 1 contoh pada tanggal 5.
- Hari ini kosong untuk `emp-2` (alur check-in → terlambat → check-out bisa didemokan utuh).
- Pengajuan: campuran `approved`/`pending`/`rejected`; cuti M12: 2 hari untuk `emp-2`.
- Rekap: `emp-1` (20/1/0/1/0/1), `emp-2` (18/2/1/0/2/0), `emp-3` (15/1/0/1/0/6).

**Batas mock:**

- Store **in-memory** → hilang saat restart / tidak dibagi antar instance serverless.
- Masuk tanpa kata sandi (pilih akun). BE wajib menyediakan autentikasi.
- `GET /api/attendance` menurunkan baris harian dari agregat seed + izin/cuti disetujui,
  hanya sampai hari ini. Angka `alpa` harian bisa lebih kecil dari `alpa` rekap
  (rekap memakai total hari kerja sebulan). BE asli menghitung dari tabel kehadiran.
- Foto/lokasi check-in disimulasikan (geofence 50 m + reverse-geocode OSM + cek spoof di klien).
- Pembatalan pengajuan hanya ada di mock (SA tidak mencantumkan `DELETE`).

### Demo `terlambat` tanpa bergantung jam

1. **Alami** — check-in setelah pukul `08:15 WIB`.
2. **Deterministik** — Admin HR → Pengaturan → buat aturan baru untuk jabatan karyawan
   dengan jam masuk `00:00` + toleransi `0`, berlaku hari ini; lalu check-in sebagai karyawan.
   Ini sekaligus membuktikan aturan tersimpan **dan dipakai** perhitungan.

---

## 8. Uji manual per Acceptance Criteria

| AC | Langkah | Harapan |
|---|---|---|
| US1-1 | HR → Pengaturan → pilih jabatan → isi jam/toleransi/hari kerja/tanggal → Simpan | toast sukses; kartu "Aturan yang berlaku" berubah; versi lama masuk tabel riwayat dengan status Arsip |
| US1-2 | Jam pulang ≤ jam masuk → Simpan | pesan di kolom jam pulang, tidak tersimpan |
| US1 (toleransi) | Isi `16` atau `1.5` | "Toleransi maksimal 15 menit." / "Toleransi harus bilangan bulat…" |
| US1 (tanggal) | Pilih tanggal kemarin | "Tanggal berlaku tidak boleh masa lalu." |
| US1 (versi) | Simpan 2 aturan dengan tanggal sama | 409 "Sudah ada aturan untuk jabatan ini pada tanggal tersebut." |
| US1 (libur) | Tambah hari libur → muncul di tabel; Hapus → dialog konfirmasi | data hilang setelah konfirmasi |
| US2-1 | Karyawan → Hari ini → Check-in lewat batas toleransi | badge **Terlambat** + menit keterlambatan |
| US2-2 | Check-in dua kali | 409 `ALREADY_CHECKED_IN`; UI tidak menampilkan tombol ganda |
| US2 (riwayat) | Buka `/kehadiran/riwayat` | tabel harian + legenda 6 status; HR melihat semua karyawan, karyawan hanya dirinya |
| US3-1 | Karyawan → Izin → pilih tanggal & alasan → Kirim | toast sukses; baris **Menunggu** di riwayat |
| US3-2 | Alasan kosong → Kirim | "Alasan wajib diisi." |
| US3 (HR) | HR → Persetujuan → Setujui/Tolak | badge berubah; rekap ikut berubah setelah disetujui |
| US4-1 | Rekap bulan berjalan | `emp-2` `cuti: 2`, `alpa: 0` |
| US4-2 | Rekap bulan berjalan | cuti/izin `pending` tidak menambah cuti |
| US5-1 | HR → Rekap → **Hitung rekap** | meta "Dihitung" terisi |
| US5-2 | Pilih bulan tanpa data | semua angka 0 + banner "Belum ada data…" |
| US5-3 | **Kunci rekap** → coba Hitung ulang | tombol hitung hilang / 409 `RECAP_LOCKED` |
| US5-4 | **Kirim ke M14** setelah dikunci | status "Terkirim ke M14"; log muncul di Riwayat pengiriman; aksi final |
| Guard | Buka halaman role lain | dialihkan ke beranda role-nya |
| Guard | Tanpa cookie | dialihkan ke `/masuk` |
| Responsif | 400px | tidak ada scroll horizontal halaman (diverifikasi 6 halaman) |

**Cek otomatis yang sudah dijalankan:** `npm run build` hijau; curl mock untuk
E01–E07, E11, E13–E15, E18–E22 (termasuk 409/400); screenshot Playwright 1280 & 400
untuk Pengaturan, Riwayat (HR/karyawan), Rekap, Izin, Riwayat izin.

**Belum ada test otomatis (unit/e2e).**

---

## 9. Yang belum dikerjakan / menunggu keputusan

| Item | Status |
|---|---|
| Payload rekap ke M14 (E21) | **mock**; bentuk final belum ditentukan M14 |
| Kontrak cuti M12 (E16) | **mock**, menunggu kontrak final |
| E17 `sync-leaves` | **tidak dipakai FE** — proses server |
| E23 audit log | **tidak ada UI** — tidak ada AC; BE tetap mencatat `created_by` |
| E12 master status | **tidak dipakai** — 6 status baku panduan UI |
| Pembatalan pengajuan (`DELETE`) | **mock-only**; SA tidak mencantumkan endpoint |
| Autentikasi nyata | belum; mock pilih akun + cookie `araya_employee` |
| Role atasan | tidak dipakai di M13 |
| Ekspor rekap CSV/XLSX | belum (P1); export CSV yang ada = log presensi harian |
| Input tanggal/jam bawaan browser | teks mengikuti locale browser (`mm/dd/yyyy`, `08:00 AM`); butuh picker buatan sendiri bila harus persis format panduan |
| Kolom "Total Jam Kerja" di rekap | belum; `design.md` TBD |
| Focus trap penuh di Dialog | belum; fokus awal + Escape |
| Test otomatis | belum ada |

---

## 10. Cara ganti mock → BE asli

1. Set `NEXT_PUBLIC_USE_MOCK=false` + `NEXT_PUBLIC_API_BASE_URL`.
2. Pastikan BE mengikuti §5 (termasuk amplop galat + `fields`).
3. Beda nama field/path → sesuaikan **hanya** `lib/api/kehadiran.ts` + `lib/types/index.ts`.
4. Cookie session → tambah `credentials: "include"` di `lib/api/client.ts`.
5. Halaman masuk: ganti `lib/api/auth.ts` + `LoginPage.tsx` sesuai mekanisme BE;
   sesuaikan `requireSession()` di `lib/auth/session.ts`.
6. Jalankan smoke test §8. Mock boleh tetap hidup (tidak dipanggil).

---

## 11. Deploy

FE demo: **Vercel** — `https://fe-araya-bussiness-attendace-module.vercel.app`
(sesuai catatan Sprint Plan; konfigurasi Netlify lama tidak dipakai).

1. Import repo → preset **Next.js**, build `npm run build`.
2. Env: `NEXT_PUBLIC_USE_MOCK=true` untuk demo, `NEXT_PUBLIC_API_BASE_URL` untuk BE asli.
3. ⚠️ Store mock in-memory di serverless: data bisa hilang antar-instance.
4. ⚠️ Deploy tidak diverifikasi ulang di sesi ini.

---

## 12. Konvensi commit

- `feat(m13-usX): ...`
- `fix(...)`, `chore(...)`, `docs(readme): ...`

Kalau kontrak BE berubah, commit **wajib** menyentuh README §5/§6 agar tetap sinkron dengan kode.
