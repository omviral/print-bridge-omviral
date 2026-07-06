# Thermal Print Bridge - Flutter Project

Proyek Flutter ini berfungsi sebagai **Print Bridge** untuk mencetak berkas PDF yang dibagikan via menu "Share" Android langsung ke Printer Bluetooth Thermal (ESC/POS).

## Fitur Utama
1. **Android Share Target**: Muncul secara otomatis di menu pilihan "Share" ketika pengguna membagikan file bertipe `.pdf`.
2. **Koneksi Bluetooth Otomatis**: Mendeteksi, menyambungkan, dan menyimpan status koneksi printer Bluetooth thermal secara cerdas.
3. **Konversi PDF-to-Raster**: Merender halaman PDF berbasis vektor menjadi bit-map grayscale monochrome yang ramah printer thermal.
4. **Mencegah Buffer Bluetooth Overflow (Chunking)**: Mengirimkan array byte print job dalam kemasan-kemasan kecil (paket byte) bertahap sehingga modul Bluetooth printer murah tidak hang.

---

## Struktur Folder Project
```
/flutter_project
  ├── pubspec.yaml                       # Deklarasi library (pdfx, flutter_blue_plus, receive_sharing_intent)
  ├── lib/
  │    └── main.dart                     # Logika UI, Bluetooth scan, stream sharing, & konversi piksel
  └── android/app/src/main/
       └── AndroidManifest.xml           # Konfigurasi izin akses Bluetooth & Android Intent Filter
```

---

## Langkah-Langkah Menjalankan Proyek

### 1. Prasyarat (Prerequisites)
Pastikan Anda sudah menginstal:
* **Flutter SDK** (Versi >= 3.2.0)
* **Android Studio / VS Code** lengkap dengan emulator atau perangkat fisik Android yang siap debug.

### 2. Mengunduh Dependencies
Jalankan perintah berikut di root folder `/flutter_project`:
```bash
flutter pub get
```

### 3. Izin Android 12+ (Bluetooth Permissions)
Pastikan izin lokasi dan Bluetooth aktif saat menjalankan aplikasi di perangkat Android fisik. Aplikasi ini telah menyertakan konfigurasi izin modern di `AndroidManifest.xml`.

### 4. Menjalankan Aplikasi
Hubungkan handphone Android fisik Anda via kabel data / ADB Wireless, kemudian jalankan:
```bash
flutter run
```

---

## Cara Melakukan Pengetesan (Testing Workflow)
1. Nyalakan **Printer Bluetooth Thermal** Anda (baik ukuran 58mm maupun 80mm).
2. Buka aplikasi **Print Bridge Thermal** yang baru terpasang di HP Anda.
3. Klik tombol **Scan Printer** lalu pilih printer Anda dari daftar bluetooth yang terdeteksi untuk menyambungkannya.
4. Sekarang, buka file PDF apa saja di HP Anda (misal dari aplikasi WhatsApp, File Manager, Adobe Acrobat, dll).
5. Klik ikon **Share / Bagikan** pada file PDF tersebut.
6. Pilih aplikasi **Kirim ke Printer Thermal (Print Bridge)** yang muncul di daftar tujuan Share.
7. Aplikasi akan otomatis terbuka, menerima file PDF, melakukan konversi gambar, dan langsung mencetaknya ke printer Bluetooth thermal Anda!
