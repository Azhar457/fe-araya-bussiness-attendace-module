# FE Modul M13 — Kehadiran (Araya Business Hub Platform)

Frontend **Modul Kehadiran (M13, Kel. C4)** — Next.js App Router + TypeScript + Tailwind (token CSS).
Berisi UI + mock API lengkap untuk **M13-US1 s.d. M13-US5**, siap disambungkan ke BE.

> **Kontrak API di dokumen ini masih ASUMSI FE dan BELUM FINAL.**
> Bagian [§5](#5-kontrak-api--daftar-endpoint-yang-dibutuhkan-be) adalah perjanjian kerja FE ↔ BE.
> Kalau SA/BE mengubah apa pun, **jangan sentuh komponen halaman** — ikuti [§6 Titik revisi kontrak](#6-titik-revisi-kontrak--satu-perubahan-satu-file).
> Sumber kebenaran desain: `Panduan_UI_Capstone_Project_05_Oktober.pdf` v1.0 → `design.md` → `PRD.md`.

---

## 1. Ringkasan status

| US | Halaman | Route | Role | Status FE |
|---|---|---|---|---|
| M13-US1 | Pengaturan jam kerja | `/kehadiran/pengaturan` | `admin_hr` | **selesai** (mock) |
| M13-US2 | Kehadiran hari ini | `/kehadiran/hari-ini` | `karyawan` | **selesai** (mock) |
| M13-US3 | Ajukan izin/sakit | `/kehadiran/izin` | `karyawan` | **selesai** (mock) |
| M13-US5 | Rekap kehadiran bulanan | `/kehadiran/rekap` | `admin_hr` | **selesai** (mock) |
| M13-US4 | Status `cuti` (kontrak M12) | muncul di rekap | sistem | **selesai di mock**, menunggu kontrak cuti final M12 |

Build: `npm run build` **hijau** (Next 15.5, React 19, TypeScript strict).
Uji kontrak mock: 16/16 skenario AC lulus (lihat [§8.2](#82-cek-otomatis-yang-sudah-dijalankan)).

---

## 2. Cara menjalankan

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Node 20+. Bisa juga `pnpm`/`yarn`, tapi contoh di dokumen ini memakai `npm`.

### Environment

```env
# true  = pakai route handler mock internal (src/app/api/mock/**)
# false = pakai BE asli (isi NEXT_PUBLIC_API_BASE_URL)
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
# peran awal simulasi session (mock only): admin_hr | karyawan
NEXT_PUBLIC_DEFAULT_ROLE=admin_hr
```

- `NEXT_PUBLIC_USE_MOCK=false` → `src/lib/api/client.ts` langsung menembak `NEXT_PUBLIC_API_BASE_URL`. **Tidak ada komponen yang perlu diubah.**
- Simulasi session memakai cookie `araya_role` ([§7](#7-mock-cara-kerja--batasnya)). Ada penukar peran `Admin HR / Karyawan` di navbar — hanya untuk demo.
- Reset data mock: `curl -X POST http://localhost:3000/api/mock/reset`.

---

## 3. Struktur folder

```
src/
  app/
    layout.tsx                    # html/body, font, import token
    page.tsx                      # / → arahkan sesuai role
    (app)/layout.tsx              # AppShell + session
    (app)/kehadiran/
      pengaturan/page.tsx         # US1
      hari-ini/page.tsx           # US2
      izin/page.tsx               # US3
      rekap/page.tsx              # US5 (+US4)
    api/mock/**                   # mock BE (route handler) — lihat §7
    globals.css
  components/
    ui/            # Button, Badge, FormField/Input/Select/Textarea/RadioGroup,
                   # Table, Pagination, Toast, Dialog, Banner, Skeleton, Card,
                   # PageHeader, Icons
    layout/        # AppShell, Navbar, Sidebar, nav-items
    kehadiran/     # WorkSettingsForm, TodayCard, AbsencePage, MonthlySummaryPage
  lib/
    api/           # client.ts (mock-aware) + kehadiran.ts (satu fungsi = satu endpoint)
    auth/          # constants.ts (pure) + session.ts (server: cookie & guard)
    format/        # formatDate, formatDateTime, formatTime, formatNumber, …
    types/         # tipe domain = bentuk kontrak
    validation/    # aturan validasi (dipakai form DAN route handler mock)
  mocks/store.ts   # seed + store in-memory
  styles/tokens.css
```

---

## 4. Aturan yang berlaku di UI

- Warna **hanya** dari token (`src/styles/tokens.css`). Tidak ada hex di `src/` (diverifikasi dengan grep).
- Skala `spacing` dan `fontSize` Tailwind **di-override** di `tailwind.config.ts` → nilai di luar panduan (mis. `p-9`, `text-xl`) tidak bisa dipakai.
- Font: Plus Jakarta Sans (judul, via aturan `h1,h2,h3`) + Source Sans 3 (isi) dari Google Fonts `<link>`; fallback sistem.
- Angka tabel: `tabular-nums` + rata kanan (`<Table>` mengurus ini).
- Badge = titik + kata, tidak bisa diklik, satu badge per baris.
- **Satu tombol utama per layar**, "Batal" di kiri aksi utama.
- Loading = skeleton; error = banner merah + "Coba lagi"; empty = satu kalimat + satu aksi.
- Toast: sukses/info hilang sendiri 5 detik, galat tetap sampai ditutup.
- Responsif: ≥1024px sidebar tetap, <1024px sidebar jadi laci, <640px satu kolom. Tabel bergulir **di dalam kartu** (satu-satunya area `overflow-x`), halaman tidak bergulir ke samping di 400px.

---

## 5. Kontrak API — daftar endpoint yang dibutuhkan BE

Semua path di bawah **relatif**. Saat mock, FE menambahkan prefix `/api/mock`; saat BE asli, FE memakai `NEXT_PUBLIC_API_BASE_URL` + path yang sama.
Artinya: **BE cukup menyediakan path di kolom "Path"**, tanpa prefix `/api/mock`.

### 5.0 Checklist endpoint — ini yang harus disediakan BE

| # | Method | Path | Dipakai oleh | Role pemanggil | Fungsi | Prioritas |
|---|---|---|---|---|---|---|
| 1 | `GET` | `/me` | semua halaman | semua | identitas + role pengguna | wajib |
| 2 | `GET` | `/attendance/work-settings` | US1, **US2** | `admin_hr` (US1), `karyawan` (US2) | baca aturan jam kerja | wajib |
| 3 | `PUT` | `/attendance/work-settings` | US1 | `admin_hr` | simpan aturan jam kerja | wajib |
| 4 | `GET` | `/attendance/today` | US2 | `karyawan` | kehadiran hari ini | wajib |
| 5 | `POST` | `/attendance/check-in` | US2 | `karyawan` | catat jam masuk + tentukan terlambat | wajib |
| 6 | `POST` | `/attendance/check-out` | US2 | `karyawan` | catat jam pulang | wajib |
| 7 | `GET` | `/attendance/absence-requests` | US3 | `karyawan` | riwayat pengajuan milik sendiri | wajib |
| 8 | `POST` | `/attendance/absence-requests` | US3 | `karyawan` | kirim pengajuan izin/sakit | wajib |
| 9 | `DELETE` | `/attendance/absence-requests/{id}` | US3 | `karyawan` | batalkan pengajuan `pending` | ⚠️ interpretasi FE, perlu konfirmasi |
| 10 | `GET` | `/attendance/monthly-summary?month=YYYY-MM` | US5, US4 | `admin_hr` | rekap bulanan per karyawan | wajib |
| 11 | `GET` | `/leave/approved?from=&to=` | US4 | sistem / `admin_hr` | tanggal cuti **disetujui** (kontrak M12) | ⚠️ bentuk belum final |
| 12 | `POST` | *(belum ada)* | US5 | — | kirim rekap ke M14 (penggajian) | ⚠️ belum ada kontrak |

Catatan penting:

- **#2 dipanggil karyawan juga.** Halaman US2 butuh `workStart`, `workEnd`, `lateToleranceMinutes` untuk menampilkan "08:00–17:00 · Toleransi 15 menit". Kalau BE membatasi endpoint ini hanya untuk `admin_hr`, karyawan akan gagal memuat → mohon izinkan `karyawan` untuk `GET`, batasi hanya `PUT` untuk `admin_hr`.
- **#11 adalah satu-satunya titik integrasi M12 → M13.** Kalau M12 sudah punya endpoint sendiri (mis. `GET /leave/requests?status=approved`), FE cukup menyesuaikan satu fungsi ([§6](#6-titik-revisi-kontrak--satu-perubahan-satu-file)).
- **#12 di luar scope FE M13** dan belum ada bentuknya. FE tidak mengirim apa pun ke M14 hari ini.

### 5.1 Aturan umum (berlaku untuk semua endpoint)

| Hal | Kesepakatan FE | Status |
|---|---|---|
| Base URL | `NEXT_PUBLIC_API_BASE_URL`, tanpa trailing slash | asumsi |
| Zona waktu acuan | **server WIB** (`Asia/Jakarta`) | asumsi (PRD #1) |
| Satuan toleransi | **menit**, bilangan bulat ≥ 0 | asumsi (PRD #2) |
| Format bulan | **`YYYY-MM`** | asumsi (PRD #3) |
| Timestamp | ISO 8601 **dengan offset** — `2026-10-05T08:17:00+07:00` | asumsi |
| Tanggal tanpa jam | `YYYY-MM-DD` | asumsi |
| Angka | number JSON, **bukan string** | asumsi (agar FE tidak perlu konversi) |
| ID karyawan | satu format: `emp-1`, `emp-2`, … | ⚠️ PRD menulis `u-1` di `/me` tapi `emp-1` di rekap; FE menyeragamkan ke `emp-*` |
| Header yang dikirim FE | `Content-Type: application/json` pada `PUT`/`POST` | lihat `src/lib/api/client.ts` |
| Autentikasi | **belum ada** | ⚠️ BE harus menentukan (lihat di bawah) |
| Cookies lintas origin | FE **belum** mengirim `credentials` | ⚠️ kalau BE memakai cookie session, tambahkan `credentials: "include"` di `src/lib/api/client.ts` (1 baris) |

**Amplop galat** — semua respons non-2xx harus berbentuk:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Jam pulang harus setelah jam masuk.",
  "fields": { "workEnd": "Jam pulang harus setelah jam masuk." }
}
```

- `code` — string stabil untuk program. FE tidak mencocokkan `code` untuk menampilkan pesan, jadi **menambah kode baru tidak merusak FE**.
- `message` — 1 kalimat bahasa Indonesia, **langsung ditampilkan ke pengguna**. Kalau BE punya pesan lebih baik, FE memakainya.
- `fields` — **opsional**. Kalau ada, FE menempelkan tiap pesan ke kolom terkait (`workStart`, `workEnd`, `lateToleranceMinutes`, `type`, `startDate`, `endDate`, `reason`). Kalau tidak ada, pesan hanya muncul di toast.

**Kode galat yang sudah dipakai FE** (harap dipertahankan atau diumumkan perubahannya):

| HTTP | `code` | Kapan | Dipakai di |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | input tidak lolos validasi [§5.8](#58-aturan-validasi-harus-sama-di-fe--be) | US1, US3 |
| 400 | `INVALID_MONTH` | `month` bukan `YYYY-MM` | US5 |
| 409 | `ALREADY_CHECKED_IN` | check-in kedua di hari yang sama | US2 |
| 409 | `NOT_CHECKED_IN` | check-out tanpa check-in | US2 |
| 409 | `ALREADY_CHECKED_OUT` | check-out kedua | US2 |
| 409 | `NOT_CANCELLABLE` | membatalkan pengajuan yang sudah diproses | US3 |
| 404 | `NOT_FOUND` | pengajuan tidak ada / bukan milik pemohon | US3 |
| 0 | `NETWORK_ERROR` | dibuat FE sendiri saat `fetch` gagal | semua |

> PRD/README lama menyebut `INVALID_TIME_RANGE`. FE memakai `VALIDATION_ERROR` + `fields.workEnd` supaya pesan bisa menempel ke kolomnya. Kalau BE tetap ingin kode spesifik, kirim kode itu di `code` — FE tetap menampilkan `message`.

### 5.2 `GET /me` — identitas & role

**Dipakai:** AppShell (nama + penukar peran) dan guard halaman.

```json
{ "id": "emp-1", "name": "Rani Kusumawati", "role": "admin_hr" }
```

| Field | Tipe | Nilai | Dibaca FE untuk |
|---|---|---|---|
| `id` | string | `emp-*` | identitas pemakai |
| `name` | string | nama tampil | navbar + sapaan |
| `role` | string | `"admin_hr"` \| `"karyawan"` | **guard route** (mengarahkan ke halaman yang benar) |

- Role atasan **tidak dipakai** di M13 (PRD #7). Kalau BE menambah role lain, FE harus diperbarui di `src/lib/types/index.ts` (`Role`) + `nav-items.ts`.

### 5.3 `GET`/`PUT /attendance/work-settings` — M13-US1

**Dipakai:** US1 (form pengaturan) + US2 (info jam kerja & batas toleransi).

**Request `PUT`**

```json
{ "workStart": "08:00", "workEnd": "17:00", "lateToleranceMinutes": 15 }
```

**Response `GET` dan `PUT` (200)**

```json
{
  "workStart": "08:00",
  "workEnd": "17:00",
  "lateToleranceMinutes": 15,
  "timezone": "Asia/Jakarta",
  "updatedAt": "2026-10-05T10:00:00+07:00"
}
```

| Field | Tipe | Wajib di response | Dibaca FE untuk |
|---|---|---|---|
| `workStart` | `"HH:MM"` | ya | input jam masuk, teks "08:00–17:00" di US2 |
| `workEnd` | `"HH:MM"` | ya | input jam pulang, teks di US2 |
| `lateToleranceMinutes` | number (integer ≥ 0) | ya | input toleransi, teks di US2 |
| `timezone` | string | tidak | **tidak dibaca FE** (hanya diteruskan) |
| `updatedAt` | ISO string | ya | teks "Terakhir diperbarui: 5 Okt 2026, 17.01 WIB" |

**Galat `PUT`**

| HTTP | Kapan | `message` yang diharapkan |
|---|---|---|
| 400 | `workEnd <= workStart` | "Jam pulang harus setelah jam masuk." |
| 400 | ada field kosong | "Jam masuk wajib diisi." / "Jam pulang wajib diisi." / "Toleransi wajib diisi." |
| 400 | toleransi bukan integer | "Toleransi harus bilangan bulat, misalnya 15." |
| 400 | toleransi < 0 | "Toleransi tidak boleh negatif." |

**AC yang diuji:** US1-1 (tersimpan & dipakai perhitungan), US1-2 (`workEnd <= workStart` ditolak).

### 5.4 `GET /attendance/today`, `POST /attendance/check-in`, `POST /attendance/check-out` — M13-US2

**Request:** tanpa body (identitas pemakai diambil dari sesi/token).

**Response `GET /attendance/today` (200)** — juga bentuk response `check-in` (`201`) dan `check-out` (`200`):

```json
{
  "date": "2026-10-05",
  "checkInAt": "2026-10-05T08:17:00+07:00",
  "checkOutAt": null,
  "status": "terlambat",
  "isLate": true,
  "lateMinutes": 2
}
```

| Field | Tipe | Nilai | Dibaca FE untuk |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | hari ini (WIB) | judul kartu "Senin, 5 Okt 2026" |
| `checkInAt` | ISO string \| `null` | jam masuk | baris "Masuk", penentu tombol **Check-out** vs **Check-in** |
| `checkOutAt` | ISO string \| `null` | jam pulang | baris "Pulang", penentu "kehadiran sudah lengkap" |
| `status` | `"hadir"` \| `"terlambat"` \| `"izin"` \| `"sakit"` \| `"cuti"` \| `"alpa"` \| `null` | status hari ini | badge status (`null` = belum check-in) |
| `isLate` | boolean | terlambat atau tidak | teks "Anda terlambat N menit." + toast |
| `lateMinutes` | number | menit lewat batas | teks jumlah menit terlambat |

**Aturan terlambat — mohon dikunci di BE:**

```
batas       = workStart + lateToleranceMinutes
terlambat   = checkIn > batas
lateMinutes = checkIn - batas
```

Contoh acuan (dari PRD 5.2): `workStart 08:00`, toleransi `15`, check-in `08:17` → `terlambat`, `lateMinutes: 2`.

**Galat**

| Endpoint | HTTP | `code` | `message` |
|---|---|---|---|
| `check-in` | 409 | `ALREADY_CHECKED_IN` | "Anda sudah check-in hari ini." |
| `check-out` | 409 | `NOT_CHECKED_IN` | "Anda belum check-in hari ini." |
| `check-out` | 409 | `ALREADY_CHECKED_OUT` | "Anda sudah check-out hari ini." |

**AC yang diuji:** US2-1 (check-in melewati toleransi → `terlambat`), US2-2 (check-in kedua ditolak, tidak ada entri ganda).

> FE tidak pernah menampilkan tombol Check-in dua kali, jadi `409 ALREADY_CHECKED_IN` hanya muncul kalau ada dua tab/perangkat atau pemanggilan API langsung. BE tetap **wajib** menjaga keunikan (`UNIQUE(employee_id, date)`).

### 5.5 `GET`/`POST /attendance/absence-requests`, `DELETE /attendance/absence-requests/{id}` — M13-US3

**Request `POST`**

```json
{ "type": "izin", "startDate": "2026-10-06", "endDate": "2026-10-06", "reason": "Keperluan keluarga" }
```

**Response `GET` (200, array, terbaru dulu) & `POST` (201, satu objek)**

```json
[
  {
    "id": "abs-1",
    "employeeId": "emp-2",
    "type": "izin",
    "startDate": "2026-10-06",
    "endDate": "2026-10-06",
    "reason": "Keperluan keluarga",
    "status": "pending",
    "createdAt": "2026-10-05T10:10:00+07:00"
  }
]
```

| Field | Tipe | Nilai | Dibaca FE untuk |
|---|---|---|---|
| `id` | string | id pengajuan | key tabel + target `DELETE` |
| `employeeId` | string | `emp-*` | memastikan milik pemohon |
| `type` | `"izin"` \| `"sakit"` | jenis | kolom "Jenis" |
| `startDate`, `endDate` | `YYYY-MM-DD` | rentang | kolom "Tanggal" ("6 Okt 2026" / "6 Okt 2026 – 7 Okt 2026") |
| `reason` | string | alasan | kolom "Alasan" (dipotong 1 baris) |
| `status` | `"pending"` \| `"approved"` \| `"rejected"` | status persetujuan | badge + tombol "Batalkan" (hanya `pending`) |
| `createdAt` | ISO string | waktu kirim | urutan riwayat |

**`DELETE`** → `204` tanpa body.

**Galat**

| Endpoint | HTTP | `code` | Kapan |
|---|---|---|---|
| `POST` | 400 | `VALIDATION_ERROR` | `type` tidak valid, tanggal kosong/salah, `endDate < startDate`, atau `reason` kosong (spasi dianggap kosong) |
| `DELETE` | 404 | `NOT_FOUND` | pengajuan tidak ada / bukan milik pemohon |
| `DELETE` | 409 | `NOT_CANCELLABLE` | status sudah `approved`/`rejected` |

**AC yang diuji:** US3-1 (tersimpan sebagai `izin`/`sakit`), US3-2 (`reason` kosong ditolak + validasi tampil).

> ⚠️ `DELETE` (#9) **tidak ada di PRD**, tetapi `design.md` 4.3 mewajibkan kolom "Aksi" pada tabel riwayat dan `design.md` 3.6 mewajibkan dialog konfirmasi. FE menafsirkan aksi = "batalkan pengajuan `pending`". Perlu konfirmasi SA: kalau BE tidak menyediakan `DELETE`, FE akan menghapus kolom Aksi + tombolnya.
> ⚠️ Alur persetujuan (siapa yang menyetujui, kapan) **di luar M13**. Pengajuan baru selalu `pending`; itulah sebabnya izin baru belum menambah kolom `izin` di rekap sampai disetujui.

### 5.6 `GET /attendance/monthly-summary?month=YYYY-MM` — M13-US5 (+ M13-US4)

**Query:** `month` wajib, format `YYYY-MM` (mis. `2026-10`).

**Response (200)**

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
  ]
}
```

| Field | Tipe | Dibaca FE untuk |
|---|---|---|
| `month` | `YYYY-MM` | keterangan "Oktober 2026" |
| `hasData` | boolean | kalau `false` → tampil banner "Belum ada data kehadiran pada bulan ini." bersama angka nol |
| `rows[].employeeId` | string | key baris |
| `rows[].name` | string | kolom "Karyawan" + pencarian |
| `rows[].division` | string | kolom "Divisi" + pencarian |
| `rows[].present` | number | kolom "Hadir" (rata kanan) |
| `rows[].late` | number | kolom "Terlambat" |
| `rows[].izin` | number | kolom "Izin" |
| `rows[].sakit` | number | kolom "Sakit" |
| `rows[].cuti` | number | kolom "Cuti" — **dari cuti disetujui M12** |
| `rows[].alpa` | number | kolom "Alpa" |
| `rows[].totalWorkDays` | number | kolom "Total hari kerja" |

**Invarian yang harus dijaga BE:**

```
present + late + izin + sakit + cuti + alpa == totalWorkDays
present      = hadir tepat waktu (late dihitung terpisah, bukan bagian dari present)
alpa         = totalWorkDays - (present + late + izin + sakit + cuti), minimal 0
izin, sakit  = hanya dari pengajuan berstatus approved
cuti         = hanya dari cuti berstatus disetujui (kontrak M12)
```

**Bulan tanpa data:** kirim **baris karyawan dengan angka 0** dan `hasData: false`.

```json
{
  "month": "2026-08",
  "hasData": false,
  "rows": [
    { "employeeId": "emp-1", "name": "Rani Kusumawati", "division": "HR",
      "present": 0, "late": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpa": 0, "totalWorkDays": 0 }
  ]
}
```

> Alasan: AC2 US5 berbunyi "tampil **nol** & pesan kosong (bukan error)". `rows: []` (seperti contoh PRD 5.4) juga tidak error, tapi tidak menampilkan nol. FE sudah menangani keduanya; yang diharapkan adalah bentuk di atas.

**Galat**

| HTTP | `code` | Kapan |
|---|---|---|
| 400 | `INVALID_MONTH` | `month` bukan `YYYY-MM` |

**AC yang diuji:** US5-1 (semua kolom status tampil), US5-2 (bulan kosong → nol + pesan), US4-1 (cuti disetujui → `cuti` naik, `alpa` tidak), US4-2 (cuti `pending`/`rejected` → tidak dihitung cuti).

### 5.7 `GET /leave/approved?from=YYYY-MM-DD&to=YYYY-MM-DD` — kontrak M12 (M13-US4)

**Status: MOCK, menunggu kontrak final M12.**

```json
[
  { "employeeId": "emp-2", "date": "2026-10-07" },
  { "employeeId": "emp-2", "date": "2026-10-08" }
]
```

| Field | Tipe | Dibaca FE untuk |
|---|---|---|
| `employeeId` | string | mencocokkan cuti ke karyawan di rekap |
| `date` | `YYYY-MM-DD` | menghitung jumlah hari cuti bulan itu |

- Satu baris = **satu tanggal** cuti yang **sudah disetujui**. Cuti `pending`/`rejected` **tidak boleh** muncul di sini.
- Yang dibutuhkan FE minimal: `employeeId` + tanggal. Nama field boleh berbeda asal diberitahukan ([§6](#6-titik-revisi-kontrak--satu-perubahan-satu-file)).
- Halaman `/kehadiran/rekap` juga memanggil endpoint ini untuk menampilkan keterangan "N hari cuti berstatus disetujui dari modul M12 ikut dihitung sebagai cuti".

⚠️ Setelah kontrak M12 final, perubahan hanya di 2 tempat: `getApprovedLeave()` di `src/lib/api/kehadiran.ts` dan perhitungan `cuti` di `src/app/api/mock/attendance/monthly-summary/route.ts`.

### 5.8 Aturan validasi (harus sama di FE & BE)

Sumber tunggal: `src/lib/validation/index.ts` — **dipakai form DAN route handler mock**, jadi tidak ada dua versi aturan yang bisa berbeda.

**Pengaturan jam kerja**

| Field | Aturan | Pesan yang ditampilkan |
|---|---|---|
| `workStart` | wajib, `HH:MM` 00:00–23:59 | "Jam masuk wajib diisi." · "Format jam harus HH:MM, misalnya 08:00." |
| `workEnd` | wajib, `HH:MM` 00:00–23:59 | "Jam pulang wajib diisi." |
| `workEnd` | harus **>** `workStart` | "Jam pulang harus setelah jam masuk." |
| `lateToleranceMinutes` | wajib, integer, ≥ 0 | "Toleransi wajib diisi." · "Toleransi harus bilangan bulat, misalnya 15." · "Toleransi tidak boleh negatif." |

**Izin/sakit**

| Field | Aturan | Pesan yang ditampilkan |
|---|---|---|
| `type` | wajib, `izin`/`sakit` | "Pilih jenis pengajuan." |
| `startDate` | wajib, `YYYY-MM-DD` | "Tanggal mulai wajib diisi." · "Tanggal mulai tidak valid." |
| `endDate` | wajib, ≥ `startDate` | "Tanggal selesai wajib diisi." · "Tanggal selesai tidak boleh sebelum tanggal mulai." |
| `reason` | wajib (spasi = kosong), maks 500 karakter | "Alasan wajib diisi." · "Alasan maksimal 500 karakter." |

Pola validasi UI: cek saat **blur** dan saat **kirim**, tidak saat mengetik (`design.md` 3.3).

---

## 6. Titik revisi kontrak — satu perubahan, satu file

Tidak ada komponen halaman yang perlu disentuh saat kontrak berubah.

| Kalau BE mengubah… | Ubah file ini saja |
|---|---|
| Path endpoint | `src/lib/api/kehadiran.ts` (11 fungsi, satu baris per endpoint) |
| Base URL | `.env.local` → `NEXT_PUBLIC_API_BASE_URL` |
| Bentuk field request/response | `src/lib/types/index.ts` + `src/lib/api/kehadiran.ts` |
| Nama field pada amplop galat (`fields`) | `src/lib/api/client.ts` (`ApiError.fields`) |
| Aturan validasi | `src/lib/validation/index.ts` |
| Status baru | `src/lib/types/index.ts` + `ATTENDANCE`/`APPROVAL` di `src/components/ui/Badge.tsx` (harus dipetakan ke 5 warna baku) |
| Warna badge `cuti` (`info` → `neutral`) | **satu baris**: `ATTENDANCE.cuti.tone` di `src/components/ui/Badge.tsx` (`design.md` TBD) |
| Endpoint cuti M12 final | `getApprovedLeave()` di `src/lib/api/kehadiran.ts` + perhitungan `cuti` di `src/app/api/mock/attendance/monthly-summary/route.ts` |
| Autentikasi (token/header/cookie) | `src/lib/api/client.ts` (tambah header atau `credentials`) |
| Kode galat baru | **tidak ada perubahan FE** — FE hanya menampilkan `message` dari BE |
| Format tanggal/jam/angka | `src/lib/format/index.ts` |
| Token desain | `src/styles/tokens.css` + `tailwind.config.ts` |

Urutan aman saat kontrak berubah: **kontrak → `types` → `api/kehadiran.ts` → (kalau perlu) `validation` → `npm run build`.**

---

## 7. Mock: cara kerja & batasnya

Semua di prefix `/api/mock`, **khusus dev**. Semua `force-dynamic` supaya tidak ter-prerender saat build.

| Endpoint mock | Method | Keterangan |
|---|---|---|
| `/api/mock/me` | GET | session dari cookie `araya_role` (fallback `NEXT_PUBLIC_DEFAULT_ROLE`) |
| `/api/mock/attendance/work-settings` | GET, PUT | US1 |
| `/api/mock/attendance/today` | GET | US2 |
| `/api/mock/attendance/check-in` | POST | US2, 409 bila ganda |
| `/api/mock/attendance/check-out` | POST | US2 |
| `/api/mock/attendance/absence-requests` | GET, POST | US3 |
| `/api/mock/attendance/absence-requests/{id}` | DELETE | batalkan pengajuan `pending` |
| `/api/mock/attendance/monthly-summary?month=YYYY-MM` | GET | US5 + US4 |
| `/api/mock/leave/approved?from=&to=` | GET | kontrak cuti M12 (mock) |
| `/api/mock/reset` | POST | kembalikan data seed |

**Seed data** (`src/mocks/store.ts`):

> ⚠️ **Fixture sementara, bukan sumber kebenaran.** Isinya dirancang **perlu** agar tiap AC bisa dibuktikan tanpa input manual: AC2 US5 butuh bulan berisi + bulan kosong, AC2 US4 butuh cuti `approved` + pengajuan `pending` pada orang berbeda, AC1/2 US2 butuh hari ini **kosong**. Jangan dikosongkan (demo jadi tidak bisa dibuktikan) dan **jangan ditambah** (showcase memakai data yang sama dengan data uji). Setelah ERD/API contract SA keluar, cukup sesuaikan nama field & nilai di file ini — halaman tidak perlu diubah ([§6](#6-titik-revisi-kontrak--satu-perubahan-satu-file)).

- Pengaturan: 08:00–17:00, toleransi 15 menit.
- 3 karyawan: `emp-1` Rani Kusumawati (**admin_hr**, HR), `emp-2` Budi Santoso (**karyawan**, Keuangan), `emp-3` Sinta Maharani (karyawan, Operasional).
- Kehadiran hari ini **kosong** untuk `emp-2` supaya alur check-in → deteksi terlambat → check-out bisa didemokan utuh.
- Pengajuan izin/sakit: campuran `approved` / `pending` / `rejected` (6 baris).
- Cuti disetujui M12: 2 hari untuk `emp-2` → `cuti: 2`, `alpa: 0`.
- `emp-3` punya izin **pending** 2 hari → tetap `alpa` (bukti AC2 US4).
- Rekap bulan berjalan: `emp-1` (hadir 20, terlambat 1, sakit 1, alpa 1), `emp-2` (18 / 2 / izin 1 / cuti 2 / alpa 0), `emp-3` (15 / 1 / sakit 1 / alpa 6). Bulan lain = kosong.

**Batas mock yang harus diketahui:**

- Store **in-memory** → hilang saat server restart, tidak dibagi antar instance/serverless. Cukup untuk demo.
- Karyawan yang login selalu `emp-2` (satu orang per role). `emp-3` hanya muncul di rekap.
- Persetujuan izin/sakit tidak diotomasi (selalu `pending`).
- Waktu memakai jam server (WIB), bukan jam browser.

### Demo `terlambat` tanpa bergantung jam

1. **Alami** — check-in setelah pukul `08:15 WIB`.
2. **Deterministik** — sebagai Admin HR buka `/kehadiran/pengaturan`, set **jam masuk `00:00` + toleransi `0`**, simpan; lalu check-in sebagai Karyawan. Ini sekaligus membuktikan AC1 US1 ("aturan tersimpan dan **dipakai perhitungan kehadiran**").

---

## 8. Uji manual & otomatis

### 8.1 Uji manual per Acceptance Criteria

Jalankan `npm run dev`. Ganti peran lewat penukar peran di navbar.

| AC | Langkah | Harapan |
|---|---|---|
| US1-1 | Admin → Pengaturan → isi 08:00 / 17:00 / 15 → Simpan | toast hijau "Pengaturan tersimpan", "Terakhir diperbarui" berubah; nilai ikut dipakai di halaman Hari ini |
| US1-2 | Set jam pulang **lebih awal** dari jam masuk → Simpan | kolom jam pulang merah + "Jam pulang harus setelah jam masuk.", **tidak tersimpan** |
| US1 (validasi) | Jam masuk dikosongkan → Simpan | "Jam masuk wajib diisi." |
| US1 (validasi) | Toleransi `-1` atau `1.5` → Simpan | "Toleransi tidak boleh negatif." · "Toleransi harus bilangan bulat, misalnya 15." |
| US2-1 | Karyawan → Hari ini → Check-in setelah batas toleransi | badge kuning **Terlambat** + "Anda terlambat N menit." |
| US2-2 | Check-in dua kali (panggil API, atau dua tab) | `409 ALREADY_CHECKED_IN` "Anda sudah check-in hari ini."; tombol berubah jadi Check-out sehingga tidak bisa dobel dari UI |
| US2 (lanjutan) | Check-out | jam "Pulang" terisi, tombol hilang, muncul "Kehadiran hari ini sudah lengkap." |
| US3-1 | Karyawan → Izin & sakit → Jenis Izin, 2 tanggal, alasan → Kirim | toast "Pengajuan terkirim", muncul di riwayat dengan badge **Menunggu** |
| US3-2 | Alasan dikosongkan → Kirim | "Alasan wajib diisi." + tidak terkirim |
| US3 (validasi) | Tanggal selesai < tanggal mulai | "Tanggal selesai tidak boleh sebelum tanggal mulai." |
| US5-1 | Admin → Rekap → pilih bulan berjalan | tabel hadir/terlambat/izin/sakit/cuti/alpa/total per karyawan |
| US5-2 | Pilih bulan tanpa data (mis. 2026-08) | semua angka **0** + banner "Belum ada data kehadiran pada bulan ini." (bukan galat) |
| US4-1 | Rekap bulan berjalan | `emp-2` `cuti: 2`, `alpa: 0` — dari 2 hari cuti disetujui M12 |
| US4-2 | Rekap bulan berjalan | `emp-3` `cuti: 0` walau ada izin **pending** → tetap masuk `alpa` |
| Guard | Admin buka `/kehadiran/hari-ini` | dialihkan ke `/kehadiran/pengaturan` (dan sebaliknya) |
| Responsif | Perkecil ke 400px | tidak ada scroll horizontal halaman; tabel bergulir di dalam kartunya |

### 8.2 Cek otomatis yang sudah dijalankan

- `npm run build` → **hijau** (4 halaman + 11 route mock, type check lolos).
- 16/16 skenario AC terhadap route handler mock: US1 simpan/ditolak, US2 check-in terlambat + 409 ganda + check-out, US3 kirim + 400 alasan kosong + batalkan (409 untuk `approved`, 404 untuk milik orang lain), US5 rekap berisi + bulan kosong (`hasData:false`, semua 0), US4 cuti disetujui dihitung + cuti `pending` jadi alpa, guard role 307, halaman 200.
- Audit kepatuhan panduan: 0 hex di `src/`, 0 ukuran font manual, 0 spacing di luar skala, 0 `<button>` mentah di luar `src/components/ui`.

**Belum ada test otomatis (unit/e2e).** Cek di atas dijalankan manual lewat `curl`. Perlu ditambah bila modul dilanjutkan.

---

## 9. Yang belum dikerjakan / menunggu keputusan

| Item | Status |
|---|---|
| Kirim payload rekap ke M14 (penggajian) — endpoint #12 | **belum**, menunggu kontrak (PRD #6) |
| Kontrak cuti M12 final — endpoint #11 | **mock**, menunggu BE (PRD #5) |
| `DELETE` pengajuan (endpoint #9) + kolom Aksi | interpretasi FE, menunggu konfirmasi SA |
| Autentikasi nyata (token/header/cookie) | belum; mock pakai cookie role |
| Ekspor rekap (CSV/XLSX) | **tidak dikerjakan** — P1 (PRD #8) |
| **Riwayat kehadiran karyawan + status `cuti` & legenda** (Sprint Plan `US4-06`, PIC FE, 1 Nov) | **belum ada halamannya.** Kolom `cuti` di rekap tidak menutup ini. Butuh daftar riwayat + legenda status → endpoint baru (ambil 7 hari terakhir sebagai basis, P1 di PRD, belum ada endpoint) |
| Riwayat 7 hari terakhir di halaman Hari ini | **tidak dikerjakan** — P1, belum ada endpoint |
| Role atasan | **tidak dipakai** di M13 (PRD #7) |
| Warna badge `cuti`: `info` atau `neutral` | sementara **`info`**; ubah 1 baris di `Badge.tsx` (`design.md` TBD) |
| Kolom "Total Jam Kerja" di rekap | belum, `design.md` TBD |
| Pencarian global di navbar | tampil tapi **nonaktif** (di luar scope M13) |
| Tombol "Simpan" di header halaman (design.md 4.1) | **tidak dipasang** — `design.md` 4.1 menggambar 2 tombol utama sedangkan Panduan UI melarang >1 tombol utama per layar. **PDF menang**; satu tombol utama ada di kanan bawah form. |
| Focus trap penuh di Dialog | tidak ada; cukup fokus awal ke "Batal" + Escape |
| Test otomatis | belum ada |

---

## 10. Cara ganti mock → BE asli

1. Set `NEXT_PUBLIC_USE_MOCK=false` dan `NEXT_PUBLIC_API_BASE_URL` ke BE.
2. Pastikan BE mengikuti [§5](#5-kontrak-api--daftar-endpoint-yang-dibutuhkan-be) (termasuk amplop galat + `fields`).
3. Kalau ada beda nama field/path, sesuaikan **hanya** `src/lib/api/kehadiran.ts` dan `src/lib/types/index.ts` ([§6](#6-titik-revisi-kontrak--satu-perubahan-satu-file)).
4. Kalau BE memakai cookie session, tambahkan `credentials: "include"` di `src/lib/api/client.ts`.
5. Jalankan smoke test manual per AC di [§8.1](#81-uji-manual-per-acceptance-criteria).
6. Mock boleh tetap hidup (tidak dipanggil) — tidak perlu dihapus.

---

## 11. Deploy (Netlify)

1. Connect repo → preset **Next.js**.
2. Build command `npm run build`, publish dir `.next` (ditangani Next.js runtime Netlify).
3. Env di Netlify: `NEXT_PUBLIC_USE_MOCK=true` (cukup untuk demo kampus), `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_DEFAULT_ROLE`.
4. ⚠️ Tidak dikonfigurasi/diuji di komputer ini.

---

## 12. Konvensi commit

- `feat(m13-usX): ...`
- `fix(...)`, `chore(...)`, `docs(readme): ...`

Kalau kontrak BE berubah, commit-nya **wajib** menyentuh README §5/§6 agar perjanjian tetap sinkron dengan kode.
