PANDUAN LENGKAP BUILD & PEMASANGAN APK ANDROID — KERAJAAN 1066
====================================================================

Paket ZIP ini berisi seluruh kode sumber Kerajaan 1066 (React + Vite + Capacitor +
GitHub Actions) yang siap diubah menjadi file instalasi Android (.apk).

--------------------------------------------------------------------
METODE 1: BUILD APK OTOMATIS LEWAT GITHUB ACTIONS (TANPA ANDROID STUDIO / BISA DARI HP)
--------------------------------------------------------------------
1. Ekstrak file `kerajaan-1066-apk-project.zip` ke folder di komputer atau HP kamu.
2. Buat repositori baru di https://github.com (boleh Public atau Private).
3. Unggah (upload) SEMUA isi folder hasil ekstrak ke repositori tersebut.
   PENTING: Pastikan folder tersembunyi `.github` (berisi `.github/workflows/build-apk.yml`)
   ikut terunggah, bersama `src/`, `public/`, `assets/`, `package.json`,
   `capacitor.config.json`, `vite.config.ts`, `tsconfig.json`, dan `index.html`.
   (Jika mengunggah lewat browser HP/PC dengan drag-and-drop, pastikan folder `.github`
   tidak terlewat, atau gunakan Git CLI:
     git init
     git add .
     git commit -m "Kerajaan 1066"
     git branch -M main
     git remote add origin https://github.com/USERNAME/NAMA-REPO.git
     git push -u origin main
   )
4. Buka repositori GitHub kamu -> klik tab **Actions**.
5. Pilih workflow **Build Android APK** di panel kiri -> klik **Run workflow** -> **Run workflow**.
6. Tunggu ±4–5 menit hingga centang hijau muncul.
7. Klik run yang sudah selesai, gulir ke bawah ke bagian **Artifacts**, lalu unduh
   **`kerajaan-1066-apk`**.
8. Ekstrak ZIP artifak tersebut untuk mendapatkan file **`app-debug.apk`**.

--------------------------------------------------------------------
METODE 2: BUILD APK LOKAL DI KOMPUTER (NODE.JS + ANDROID STUDIO)
--------------------------------------------------------------------
Prasyarat: Node.js 20+, Java JDK 17, dan Android Studio (dengan Android SDK).
1. Ekstrak `kerajaan-1066-apk-project.zip`, buka terminal di dalam foldernya.
2. Jalankan perintah berikut berurutan:
   npm install --legacy-peer-deps
   npm run build
   rm -f dist/*.zip && rm -rf dist/assets/aistudio
   npm install --legacy-peer-deps @capacitor/core@6.1.2 @capacitor/cli@6.1.2 @capacitor/android@6.1.2
   npx cap add android
   npx cap sync android
3. Build APK:
   - Lewat Android Studio: jalankan `npx cap open android`, tunggu Gradle sync selesai,
     lalu pilih menu **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
   - Atau lewat terminal:
     cd android
     ./gradlew assembleDebug
4. File APK berada di:
   `android/app/build/outputs/apk/debug/app-debug.apk`

--------------------------------------------------------------------
CARA MEMASANG APK DI HP ANDROID
--------------------------------------------------------------------
1. Salin `app-debug.apk` ke penyimpanan internal HP Android (folder Download).
2. Ketuk file `app-debug.apk` melalui File Manager / Files di HP.
3. Jika muncul peringatan keamanan *"Demi keamanan, ponsel tidak diizinkan menginstal
   aplikasi tidak dikenal"*, ketuk **Setelan (Settings)** -> aktifkan **Izinkan dari sumber ini**
   (Allow from this source), lalu kembali dan ketuk **Instal (Install)**.
4. Jika muncul peringatan Google Play Protect (*"Aplikasi tidak dikenal / Unrecognized app"*),
   ketuk **Detail selengkapnya (More details)** -> **Tetap instal (Install anyway)**
   (hal ini normal karena debug APK belum ditandatangani Play Store).
5. Buka aplikasi **Kerajaan 1066** dari layar beranda. Seluruh progres save game tersimpan
   otomatis secara offline di perangkat (dan bisa diekspor/impor lewat file `.json`).
