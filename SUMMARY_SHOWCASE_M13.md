# Catatan Showcase M13 — 29 Okt 2026

## Yang bisa didemo BESOK (100% jalan, tanpa nunggu BE M12/M13 login sehat)

Akses demo tanpa login (FE baru commit `62325c1`):

| URL | Peran | Halaman awal |
|-----|-------|--------------|
| `GET /user` | Karyawan (employeeId 101, "Dimas Pratama") | `/kehadiran/hari-ini` |
| `GET /hr` | Admin HR (employeeId 1, "Rani") | `/kehadiran/pengaturan` |

Mekanisme: cookie demo `araya_demo` + fallback header `X-Employee-Id` ke BE M13.
Tidak bergantung login M12 (Kel. C3) maupun login M13 (Ikmal).

### Alur demo yang disarankan

1. **`/hr`** → `/kehadiran/pengaturan`
   - Prefill otomatis dari BE live (`GET /api/working-hours`): 08:00 / 17:00 / 15
   - Ubah jam masuk/pulang & toleransi → **Simpan** → BE `POST /api/working-hours` 200
   - Coba jam pulang lebih awal dari jam masuk → ditolak 400 (AC US1 #2)
2. **`/hr`** → `/kehadiran/rekap`
   - Tabel rekap per karyawan (hadir, terlambat, izin/sakit, cuti, alpa)
   - Tombol **Kirim ke M14** (nonaktif sampai M14 endpoint disepakati — saat ini membalas `{ sent:false }`)
3. **`/user`** → `/kehadiran/hari-ini`
   - Presensi masuk / keluar live (data asli dari BE, bukan mockup)
   - Ulangi presensi → ditolak 409 (AC US2 #2)
4. **`/user`** → `/kehadiran/izin`
   - Ajukan izin/sakit: alasan kosong → ditolak 400 (AC US3 #2); isi alasan → tersimpan + muncul di riwayat
5. **`/user`** → `/kehadiran/izin/riwayat`
   - Daftar pengajuan izin/sakit milik karyawan

Tombol "Masuk sebagai Karyawan / Admin HR" juga sudah di halaman `/masuk`, jadi
penguji bisa klik dari sana (bukan ketik URL).

### Yang sudah verified (smoke test E2E 29/10)
- `/user` → redirect `hari-ini` HTTP 200, cookie ter-set
- `/hr` → redirect `pengaturan` HTTP 200 + `rekap` HTTP 200
- BE live via `X-Employee-Id`: `today`(101)=200, `check-in`=201, `check-out`=200,
  `leave` GET/POST=200/201, `working-hours` GET=200 & POST(admin_hr 1)=200,
  `working-hours` POST(karyawan 101)=403 (benar), `recap`=200, `DELETE leave`=200 (fixed)
- CORS BE allow `X-Employee-Id` dari origin FE
- `tsc --noEmit` + `next build` hijau
- Data uji (izin test) sudah di-cleanup di DB

---

## Yang HARUS ditanyakan/dikerjakan Ikmal (BE M13) — tidak memblokir demo,
tapi perlu untuk "login asli" + Swagger sesuai Panduan API

1. **`POST /api/auth/login` → 500.** Akar: env `JWT_SECRET` belum di-set di Vercel
   project BE. Minta set 1 nilai string acak, deploy. Setelah itu login
   nik+password jalan (akun seed: `EMP101/araya123` karyawan, `EMP001/araya123` admin_hr).
2. **Swagger deployed belum update.** `public/swagger.json` + halaman `/api/docs`
   di live masih versi 4 endpoint lama (tanpa `today`, `check-out`,
   `GET working-hours`, `auth/*`). Re-deploy setelah set `JWT_SECRET` supaya
   file OpenAPI cocok kode baru — sesuai Panduan API bab 7 ("kontrak sah hanya
   bila tertulis di file OpenAPI").
3. **`JWT_SECRET` juga perlu env di Vercel BE.** Lihat `VERCEL_ENV_BE.txt` di repo FE.
4. **Kontrak Panduan API (Dokumen Teknis bab 3.5):**
   - **K-12** M12→M13: data karyawan aktif (`GET /api/m12/v1/employees?status=aktif`)
     — FE M13 tarik via proxy `/api/m12/karyawan-aktif`. Saat ini degraded graceful.
   - **K-13** M12→M13: event `leave.approved` — FE M13 belum implementasi receiver.
   - **K-14** M13→M14: rekap bulanan (`GET /api/m13/v1/attendance-recaps?month=`)
     — FE M13 push via `/api/m14/rekap` (M14_ENDPOINT masih kosong).
   - Catatan: nama endpoint di studi kasus lama M4→M7/M4→M10 sudah ganti.
     Pakai nomor di Panduan API v1.0 + studi kasus terbaru.

---

## Catatan teknis untuk FE

- `.env` lokal sudah di-commit dengan `NEXT_PUBLIC_API_BASE_URL` = BE live.
- Untuk deploy Vercel FE, set env sama (lihat `VERCEL_ENV.txt`).
- Login asli (M12) tetap jalan lewat proxy `/api/m12/auth/*` — tidak berubah.
  Jalur demo (`/user`, `/hr`) hanya fallback untuk showcase.
