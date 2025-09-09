# Cara Fix Google App Verification

## Masalah:
Error "Google belum memverifikasi aplikasi ini" muncul karena aplikasi Firebase Anda belum diverifikasi oleh Google untuk mengakses scopes sensitif seperti Google Drive.

## Solusi Cepat (Untuk Testing):
1. Klik "Lanjutkan" pada halaman warning Google
2. Kemudian klik "Kembali ke tempat aman" 
3. Lalu klik "Advanced" atau "Lanjutan" 
4. Klik "Go to xraider-73afe.firebaseapp.com (unsafe)" atau "Lanjutkan ke xraider-73afe.firebaseapp.com"

## Solusi Permanen:
Untuk menghilangkan warning ini secara permanen, Anda perlu:

### 1. Verifikasi Domain di Google Cloud Console:
- Buka https://console.cloud.google.com/
- Pilih project "xraider-73afe"
- Pergi ke "APIs & Services" > "Credentials"
- Edit OAuth 2.0 client
- Tambahkan domain authorized:
  - `http://localhost:5173` (untuk development)
  - `https://xraider-73afe.firebaseapp.com` (untuk production)

### 2. Verifikasi Aplikasi untuk Google Drive API:
- Di Google Cloud Console, pergi ke "APIs & Services" > "OAuth consent screen"
- Ubah status dari "Testing" ke "In production"
- Atau tambahkan email Anda ke "Test users" jika masih dalam mode testing

### 3. Domain Verification:
- Pergi ke Google Search Console (https://search.google.com/search-console)
- Tambahkan dan verifikasi domain `xraider-73afe.firebaseapp.com`

### 4. Request Verification (untuk production):
- Di OAuth consent screen, klik "Submit for verification"
- Isi form dengan detail aplikasi
- Tunggu review dari Google (biasanya 1-2 minggu)

## Untuk Sekarang:
Aplikasi akan tetap berfungsi meskipun ada warning. User bisa klik "Advanced" > "Go to site anyway" untuk melanjutkan.

## Catatan Keamanan:
Warning ini muncul karena aplikasi meminta akses ke Google Drive (scope sensitif). Ini normal untuk aplikasi dalam development.
