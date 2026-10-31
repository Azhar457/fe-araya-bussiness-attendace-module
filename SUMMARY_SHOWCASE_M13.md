# Catatan Showcase M13 — 1 Nov 2026

FE M13 (Next.js 15, repo `fe-araya-bussiness-attendace-module`). Login memakai
**endpoint M12** sesuai kesepakatan: FE → `POST /api/m12/auth/login` (proxy) →
M12 `POST /api/login`. Token M12 disimpan di cookie `araya_token`.

Route demo `/user` dan `/hr` **sudah dihapus** (commit `8c499e4`) — tidak ada
akses demo tanpa login lagi.

## Akun untuk demo

| Peran | Email | Password | Halaman awal |
|---|---|---|---|
| Admin HR | `hr@araya.com` | `password123` | `/kehadiran/pengaturan` |
| Employee | `andi@araya.com` | `password123` | `/kehadiran/hari-ini` |

Sesi M12 (`GET /api/m12/auth/me`) → `employee_id` 8 (Admin HR) dan 9 (Employee),
role M12 `Admin HR` / `Employee` dinormalisasi jadi `admin_hr` / `karyawan`.

## Peta halaman

| Peran | URL | Isi |
|---|---|---|
| Karyawan | `/kehadiran/hari-ini` | kartu presensi hari ini, tombol check-in/out, ringkasan bulan |
| Karyawan | `/kehadiran/detail` | riwayat per tanggal + detail per hari |
| Karyawan | `/kehadiran/izin` | form ajukan izin/sakit |
| Karyawan | `/kehadiran/izin/detail` | daftar izin + detail per pengajuan |
| Karyawan | `/kehadiran/izin/riwayat` | riwayat pengajuan penuh |
| Karyawan | `/kehadiran/rekap` | rekap bulanan sendiri |
| Admin HR | `/kehadiran/pengaturan` | jam kerja + toleransi |
| Admin HR | `/kehadiran/rekap` | rekap seluruh tim + tombol "Kirim ke M14" |
| Admin HR | `/kehadiran/rekap/detail` | rekap per hari (butuh endpoint baru BE) |

Guard peran ada di server (`requireRole`): peran yang salah di-redirect ke
halaman utama perannya, bukan 403.

## Known blocker — BE M13 menolak token M12 (401)

BE M13 memverifikasi Bearer token dengan `JWT_SECRET` miliknya sendiri
(`src/lib/auth.js` → `jwtVerify(token, getSecret())`). Token dari M12 ditandatangani
dengan secret M12, jadi verifikasi gagal → `resolveIdentity` mengembalikan `null`
→ **401** pada semua endpoint M13 yang dilindungi:

```
GET /api/attendance/today            → 401
GET /api/attendance?month=YYYY-MM     → 401
GET /api/leave-permissions            → 401
GET /api/attendance/recap/daily       → 404 (endpoint belum ada di BE yang live)
```

Endpoint publik M13 (tanpa token) tetap jalan: `GET /api/working-hours`,
`GET /api/attendance/recap`, `GET /api/docs`.

### Kontrak yang dibutuhkan dari BE M13

Satu endpoint tukar token (dipanggil FE lewat proxy, server-to-server):

```
POST /api/auth/exchange
Authorization: Bearer <token M12>
→ 200 { "token": "<token M13>", "role": "admin_hr|karyawan", "karyawan_id": 1 }
→ 401 { "error": { "code": "UNAUTHORIZED", ... } }
```

Implementasi di BE M13: verifikasi token M12 → `GET {M12_API_BASE_URL}/api/me` →
terbitkan token M13 (HS256, `sub` = `karyawan_id` M13, `role` dinormalisasi).
FE sudah siap: token hasil exchange dipakai untuk semua request ke BE M13.

Alternatif (kurang ideal): BE M13 menerima token M12 langsung lewat
verifikasi ke M12 — butuh konfigurasi secret bersama.

## Catatan lain

- `GET /api/attendance/recap/daily` sudah ditulis di repo BE M13 (commit `44c1e98`)
  tapi belum ada di deployment Vercel → HR "Rekap detail per hari" masih kosong.
- Tombol "Kirim ke M14" nonaktif sampai `M14_RECAP_ENDPOINT` disepakati.
- `favicon.ico` masih 404 (kosmetik).
