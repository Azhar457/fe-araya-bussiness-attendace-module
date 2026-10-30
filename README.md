# M13 — Modul Kehadiran / Presensi (FE)

Frontend Next.js 15 untuk **M13** pada Studi Kasus Capstone Project Kelas C (Kel. C4).

- **BE M13 (live):** https://laboratorium-backend.vercel.app
- **BE M12 (live):** https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app
- **SSOT:** `Studi Kasus Capstone Project -- KELAS C.pdf` — M13 hanya punya **5 user story**
- **Tidak ada mock.** Seluruh data berasal dari BE live. Fitur yang belum punya endpoint
  menampilkan keterangan, bukan data palsu.

---

## 1. Menjalankan

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev                  # http://localhost:3000
npm run build && npm run start
```

### Environment

| Variabel | Wajib | Isi |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ya | Base URL BE M13 (dipakai browser) |
| `M12_API_BASE_URL` | ya | Base URL BE M12 (server-side saja) |
| `M14_RECAP_ENDPOINT` | tidak | Endpoint penerima rekap M14. Kosong → push dianggap belum aktif |
| `NEXT_PUBLIC_USE_MOCK` | tidak | Warisan; tidak dibaca kode lagi |

M12 **tidak mengirim header CORS**, jadi browser tidak boleh memanggilnya langsung.
FE memakai route handler sendiri (`/api/m12/*`) sebagai proxy same-origin.

---

## 2. Peta user story → halaman

| US | Halaman | Peran | Status |
|---|---|---|---|
| M13-US1 atur jam kerja & toleransi | `/kehadiran/pengaturan` | Admin HR | ✅ `POST /api/working-hours` |
| M13-US2 check-in / check-out + terlambat | `/kehadiran/hari-ini` | Karyawan | ✅ `GET /api/attendance/today`, `POST .../check-in`, `POST .../check-out` |
| M13-US3 ajukan izin / sakit | `/kehadiran/izin` | Karyawan | ✅ `GET`/`POST /api/leave-permissions` |
| M13-US3 riwayat pengajuan | `/kehadiran/izin/riwayat` | Karyawan | ✅ daftar milik sendiri |
| M13-US4 cuti disetujui → status cuti | kolom **cuti** di rekap | Sistem | ⛔ menunggu kontrak cuti M12 (lihat §4) |
| M13-US5 rekap bulanan per karyawan | `/kehadiran/rekap` | Admin HR (semua) / Karyawan (milik sendiri) | ✅ `GET /api/attendance/recap?bulan=&tahun=` + tombol kirim ke M14 |

Fitur di luar SSOT **tidak dibangun**: persetujuan izin oleh HR, hari libur nasional,
aturan per jabatan, GPS, koreksi presensi, audit log, generate/lock rekap.

---

## 3. Masuk (login) dan identitas

**Satu-satunya sumber auth: M12 (Kel. C3)** — sesuai kesepakatan antar modul.
FE memanggil M12 via proxy same-origin (`/api/m12/auth/*`), tidak langsung
karena M12 tidak mengirim header CORS.

Alur `/masuk`:

1. Form email + password → `POST /api/m12/auth/login` (proxy → M12 `POST /api/login`).
2. Respons M12: `{ success, token, role, employee_id, name, nik, ... }`.
3. Token M12 disimpan di cookie non-HttpOnly `araya_token`.
4. Semua request ke BE M13 memakai `Authorization: Bearer <token M12>` (shared `neondb`).
5. Guard `getSession()` memvalidasi sesi via `GET /api/m12/auth/me` (proxy → M12).
6. Role M12 ("Admin HR" | "Employee") dinormalisasi ke role internal FE
   (`admin_hr` | `karyawan`) oleh `normalizeRole()` di `src/lib/api/kehadiran.ts`.

Catatan:

- Cookie `araya_token` **bukan HttpOnly** dan bisa diubah dari browser.
  Ini bukan kontrol keamanan, hanya cara membawa identitas sampai M12
  mengadopsi HttpOnly + refresh token.
- Peran dari M12 (`role` string) sudah sesuai (Admin HR / Employee);
  tidak perlu derivasi dari kolom `jabatan` lagi.
---

## 4. Integrasi antar modul

Dokumen kontrak yang dikirim ke kelompok lain:

- [`Kontrak_M13_ke_M12.md`](../Kontrak_M13_ke_M12.md) — CORS, endpoint cuti, kesepakatan identitas
- [`Kontrak_M13_ke_M14.md`](../Kontrak_M13_ke_M14.md) — bentuk rekap, 5 vs 6 kategori, pull/push

### 4.1 Pull dari M12

```
Browser → /api/m12/karyawan-aktif (route handler FE) → M12 /api/karyawan/aktif
```

Dipakai untuk: daftar pilihan di `/masuk` dan nama karyawan pada rekap.
Route selalu membalas `200`; bila M12 mati, `data` kosong dan `error` berisi alasannya
sehingga UI tetap bisa dipakai.

### 4.2 Push ke M14

```
Browser → POST /api/m14/rekap {bulan, tahun}
        → tarik GET /api/attendance/recap dari BE M13
        → POST payload ke M14_RECAP_ENDPOINT (bila diisi)
```

Selama `M14_RECAP_ENDPOINT` kosong, route membalas `{ sent: false, message, detail }`
berisi payload siap kirim. Ini bukan mock — data rekap benar-benar diambil dari BE.

Tombol **Kirim ke M14** hanya muncul untuk Admin HR dan nonaktif bila rekap kosong.

### 4.3 Rekap: 5 kategori

`hadir`, `terlambat`, `izin_sakit`, `cuti`, `alpa` — sesuai SSOT M13-US5.
Dokumen SA v3 memecah izin dan sakit; itu tidak dipakai.

Untuk Admin HR, tabel menampilkan **semua karyawan aktif M12**, termasuk yang belum punya
presensi (semua kolom 0). Baris rekap dengan id yang tidak ada di M12 tetap ditampilkan
dengan label `Karyawan #<id>` agar data tidak hilang.

---

## 5. Batasan yang diketahui (per 26 Oktober 2026)

| Batasan | Dampak | Penanganan di FE |
|---|---|---|
| BE tidak punya `GET /api/working-hours` (405) | Aturan yang berlaku tidak bisa dimuat ulang | Banner keterangan; HR mengisi nilai baru lalu simpan |
| M12 belum punya endpoint cuti | M13-US4 tidak bisa jalan; kolom `cuti` selalu 0 | Keterangan di bawah tabel rekap |
| Identitas M12 (`1,2,3,5`) ≠ data uji M13 (`101,102`) | Rekap bisa berisi baris tanpa nama | Negosiasi di `Kontrak_M13_ke_M12.md` §4; baris asing tetap tampil |
| Tidak ada endpoint auth | Peran bisa diubah siapa saja | Dicatat sebagai batasan, bukan fitur |
| Tidak ada endpoint riwayat harian, hari libur, approval izin | Di luar SSOT | Tidak dibangun |
| BE tidak memvalidasi keberadaan karyawan | Id asal-asalan tetap diterima | FE hanya menawarkan karyawan aktif M12 |

Tiga bentuk error dari BE sudah dinormalisasi di `src/lib/api/client.ts`:
`{ error: { code, message, fields } }`, `{ error: "pesan" }`, dan `{ code, message, fields }`.

---

## 6. Struktur

```
src/
  app/
    (app)/kehadiran/
      hari-ini/       # US2
      izin/           # US3 (+ izin/riwayat)
      pengaturan/     # US1 (admin_hr)
      rekap/          # US5
    api/
      m12/auth/login/     # proxy M12 login (email+password → token)
      m12/auth/me/        # proxy M12 /me (validasi sesi + identitas)
      m12/auth/logout/    # proxy M12 logout
      m12/karyawan-aktif/ # proxy pull M12
      m14/rekap/          # push rekap ke M14
    masuk/                  # halaman login
  components/
    auth/ kehadiran/ layout/ ui/
  lib/
    api/client.ts       # fetch + normalisasi error + X-Employee-Id
    api/kehadiran.ts    # satu fungsi = satu endpoint
    auth/               # cookie sesi + guard peran
    format.ts           # WIB, label bulan, dsb.
    types/              # tipe wire BE
```

Guard peran ada di layout server: halaman `admin_hr` mengalihkan karyawan ke
`/kehadiran/hari-ini`, dan sebaliknya ke `/kehadiran/pengaturan`.

---

## 7. Alur demo

## 7.1 Login

Kredensial demo M12:

- **Admin HR**: `hr@araya.com` / `password123`
- **Karyawan**: (email M12 — hubungi Kel. C3 untuk kredensial karyawan aktif)

Setelah login, pengguna diarahkan ke home page sesuai role
(`admin_hr` → `/kehadiran/pengaturan`, `karyawan` → `/kehadiran/hari-ini`).

### Alur demo yang disarankan

1. **Admin HR** masuk → `/kehadiran/pengaturan` → ubah jam masuk/pulang & toleransi → simpan.
   Coba juga isi jam pulang lebih awal dari jam masuk → ditolak (AC US1 #2).
2. Masuk sebagai **Karyawan** → `/kehadiran/hari-ini` → presensi masuk.
   Ulangi presensi masuk → ditolak `409 ALREADY_CHECKED_IN` (AC US2 #2).
   Presensi keluar → status berubah.
3. `/kehadiran/izin` → ajukan izin dengan alasan kosong → ditolak (AC US3 #2), lalu isi
   alasan → tersimpan dan muncul di riwayat.
4. `/kehadiran/rekap` sebagai **Admin HR** → pilih bulan → tabel per karyawan
   (`hadir`, `terlambat`, `izin/sakit`, `cuti`, `alpa`) → tombol **Kirim ke M14**.
5. Pilih bulan tanpa data → tabel kosong dengan pesan, bukan error (AC US5 #2).
