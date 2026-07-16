# Panduan Lengkap Deploy Aplikasi React ke VPS (Ubuntu)
Panduan ini berasumsi Anda menggunakan VPS dengan sistem operasi **Ubuntu 20.04 atau 22.04** (OS paling umum untuk VPS).
## Persiapan Awal
 1. Anda sudah memiliki akses ke VPS (berupa *IP Address*, *Username* biasanya root, dan *Password*).
 2. Anda memiliki aplikasi SSH (Terminal di Mac/Linux, atau PuTTY/Command Prompt di Windows).
 3. Anda sudah menginstal Node.js di **komputer lokal/laptop Anda**.
## TAHAP 1: Menyiapkan Aplikasi di Komputer Lokal (Laptop Anda)
Sebelum diunggah ke VPS, kita harus mem-*build* aplikasi React menjadi file statis yang siap produksi.
**1. Buat Proyek Baru (Jika belum ada)**
Buka terminal/CMD di laptop Anda, jalankan:
```bash
npm create vite@latest portal-reward -- --template react
cd portal-reward
npm install

```
**2. Install Library yang Dibutuhkan**
Karena kode kita menggunakan ikon dari Lucide, install library-nya:
```bash
npm install lucide-react

```
**3. Masukkan Kode**
Copy kode App.jsx dari *preview* sebelumnya dan *paste* ke dalam file src/App.jsx di proyek lokal Anda.
**4. Build Aplikasi**
Jalankan perintah ini di terminal lokal Anda:
```bash
npm run build

```
Setelah proses selesai, akan muncul sebuah folder baru bernama **dist** di dalam folder proyek Anda. Folder dist inilah yang berisi file siap tayang dan akan kita unggah ke VPS.
## TAHAP 2: Konfigurasi VPS (Instalasi Web Server)
Sekarang, kita beralih ke VPS Anda. Buka terminal dan masuk ke VPS via SSH:
```bash
ssh root@IP_VPS_ANDA

```
*(Ganti IP_VPS_ANDA dengan IP asli VPS Anda)*
**1. Update Sistem VPS**
Pastikan sistem VPS *up-to-date*:
```bash
sudo apt update && sudo apt upgrade -y

```
**2. Install Nginx (Web Server)**
Nginx berfungsi untuk menyajikan file statis aplikasi Anda ke internet agar bisa diakses browser.
```bash
sudo apt install nginx -y

```
**3. Buat Folder untuk Aplikasi Anda**
Buat folder khusus untuk menyimpan file React Anda di direktori web Nginx:
```bash
sudo mkdir -p /var/www/portal-reward
sudo chown -R $USER:$USER /var/www/portal-reward
sudo chmod -R 755 /var/www/portal-reward

```
## TAHAP 3: Upload File ke VPS
Anda perlu memindahkan isi dari folder **dist** (dari laptop Anda) ke dalam folder /var/www/portal-reward di VPS. Anda bisa menggunakan beberapa cara:
**Opsi A: Menggunakan SCP (Via Command Prompt / Terminal)**
Buka terminal baru di laptop Anda (jangan di jendela VPS), pastikan Anda berada di folder proyek portal-reward, lalu jalankan:
```bash
scp -r dist/* root@IP_VPS_ANDA:/var/www/portal-reward/

```
**Opsi B: Menggunakan Aplikasi FileZilla / WinSCP (Lebih mudah secara visual)**
 1. Buka FileZilla / WinSCP.
 2. Login menggunakan IP VPS, Username (root), dan Password Anda (Port: 22).
 3. Di sisi kanan (VPS), buka folder /var/www/portal-reward/.
 4. Di sisi kiri (Laptop), buka folder proyek Anda -> folder dist.
 5. *Drag and drop* (Tarik) semua isi di dalam folder dist ke sisi kanan (VPS).
## TAHAP 4: Mengatur Nginx di VPS
Kembali ke jendela terminal SSH (VPS) Anda. Kita perlu memberi tahu Nginx di mana letak aplikasi Anda.
**1. Buat File Konfigurasi Nginx**
```bash
sudo nano /etc/nginx/sites-available/portal-reward

```
**2. Masukkan Konfigurasi Berikut**
*(Copy dan paste kode di bawah ini ke editor nano. Ganti domain_atau_IP_anda dengan IP VPS atau nama domain jika ada)*:
```nginx
server {
    listen 80;
    server_name domain_atau_IP_anda; # Contoh: 103.123.45.67 atau namadomain.com

    root /var/www/portal-reward;
    index index.html;

    # Konfigurasi ini penting untuk React Router / SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}

```
*Untuk menyimpan di editor Nano: Tekan Ctrl + X, lalu ketik Y, lalu tekan Enter.*
**3. Aktifkan Konfigurasi**
Buat *symlink* ke folder sites-enabled:
```bash
sudo ln -s /etc/nginx/sites-available/portal-reward /etc/nginx/sites-enabled/

```
**4. Test dan Restart Nginx**
Pastikan tidak ada salah ketik di konfigurasi:
```bash
sudo nginx -t

```
Jika hasilnya *Syntax OK*, restart Nginx agar konfigurasi berjalan:
```bash
sudo systemctl restart nginx

```
## TAHAP 5: Selesai! 🎉
Sekarang, buka browser di HP atau Laptop Anda, dan ketikkan IP Address VPS atau Domain Anda di kolom URL.
Aplikasi **Portal Reward 3D Printer** Anda sudah *live* dan bisa diakses dari mana saja oleh pemain game!
*(Opsional)* Jika ke depannya Anda ingin mengamankan website dengan HTTPS (Gembok hijau), Anda bisa menginstal Certbot di VPS:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domainanda.com

```
