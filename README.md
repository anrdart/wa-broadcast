# WhatsApp Broadcast Tool

<<<<<<< HEAD
Alat otomatisasi berbasis web untuk mengirimkan broadcast WhatsApp ke semua kontak, baik yang tersimpan maupun yang tidak tersimpan.

## Fitur

- ✅ Interface web yang mudah digunakan
- ✅ Koneksi WhatsApp Web melalui QR Code
- ✅ Daftar semua kontak (tersimpan dan tidak tersimpan)
- ✅ Filter dan pencarian kontak
- ✅ Pilih kontak secara individual atau semua sekaligus
- ✅ Kirim pesan teks dan media (gambar, video, dokumen)
- ✅ Progress tracking pengiriman pesan
- ✅ Delay otomatis antar pesan untuk menghindari spam

## Persyaratan

- Node.js versi 18.0.0 atau lebih baru
- Browser modern (Chrome, Firefox, Edge)
- Koneksi internet yang stabil

## Instalasi

1. Pastikan semua dependencies sudah terinstall:
=======
A modern web-based WhatsApp broadcast tool that allows you to send messages to multiple contacts simultaneously through a clean and intuitive interface.

## Features

- **Real-time WhatsApp Connection**: Connect to WhatsApp Web using QR code scanning
- **Contact Management**: Import, filter, and manage your WhatsApp contacts
- **Bulk Messaging**: Send messages to up to 256 contacts at once
- **Media Support**: Send text messages with optional media attachments
- **Progress Tracking**: Real-time progress monitoring during broadcast sending
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with Tailwind CSS utilities
- **Icons**: Font Awesome
- **Communication**: WebSocket for real-time backend communication
- **Deployment**: Vercel-ready configuration

## Project Structure

```
wa-broadcast/
├── index.html          # Main HTML file
├── script.js           # JavaScript application logic
├── style.css           # CSS styles and animations
├── package.json        # Project configuration
├── vercel.json         # Vercel deployment configuration
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for development server)
- WhatsApp account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wa-broadcast
   ```

2. Install dependencies:
>>>>>>> 8099e9b (Optimized WhatsApp Broadcast Tool - Complete refactor with improved code structure, documentation, and maintainability)
   ```bash
   npm install
   ```

<<<<<<< HEAD
2. Jalankan server:
   ```bash
   npm start
   ```
   
   Atau untuk development dengan auto-reload:
=======
3. Start the development server:
>>>>>>> 8099e9b (Optimized WhatsApp Broadcast Tool - Complete refactor with improved code structure, documentation, and maintainability)
   ```bash
   npm run dev
   ```

<<<<<<< HEAD
3. Buka browser dan akses:
   ```
   http://localhost:3000
   ```

## Cara Penggunaan

### 1. Koneksi WhatsApp
- Buka aplikasi di browser
- Scan QR Code yang muncul dengan WhatsApp di ponsel Anda
- Tunggu hingga status berubah menjadi "Connected"

### 2. Memuat Kontak
- Setelah terhubung, klik tombol "Load Contacts"
- Tunggu hingga semua kontak dimuat
- Gunakan filter untuk mencari kontak tertentu

### 3. Memilih Kontak
- Pilih kontak secara individual dengan mencentang checkbox
- Atau gunakan "Select All" untuk memilih semua kontak
- Kontak yang dipilih akan ditampilkan di bagian "Selected Contacts"

### 4. Mengirim Broadcast
- Tulis pesan di area "Message Content"
- (Opsional) Upload file media jika ingin mengirim gambar/video/dokumen
- Klik "Send Broadcast" untuk memulai pengiriman
- Monitor progress pengiriman di bagian "Broadcast Progress"

## Struktur File

```
wa-broadcast/
├── public/
│   ├── index.html      # Interface web utama
│   ├── style.css       # Styling aplikasi
│   └── script.js       # Logic frontend
├── server.js           # Server backend
├── package.json        # Dependencies dan scripts
└── BROADCAST_README.md # Dokumentasi aplikasi broadcast
```

## Konfigurasi

### Delay Pengiriman
Untuk menghindari deteksi spam, aplikasi menggunakan delay 2-5 detik antar pesan. Anda dapat mengubah nilai ini di file `server.js`:

```javascript
const delay = Math.random() * 3000 + 2000; // 2-5 detik
```

### Port Server
Secara default server berjalan di port 3000. Untuk mengubahnya, edit file `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
```

### Error "Session Terminated"
- Logout dari WhatsApp Web di browser lain
- Hapus folder `.wwebjs_auth` jika ada
- Restart server dan scan ulang QR Code

## Keamanan dan Etika

⚠️ **Penting**: Gunakan tool ini dengan bijak dan bertanggung jawab

- Jangan spam kontak dengan pesan yang tidak relevan
- Hormati privasi dan preferensi penerima
- Gunakan delay yang cukup antar pesan
- Patuhi terms of service WhatsApp
- Jangan gunakan untuk tujuan ilegal atau merugikan

## 🚀 Deployment & Production

### ⚠️ PENTING: Masalah Vercel

**Aplikasi ini TIDAK DAPAT di-deploy ke Vercel** karena:
- Missing Chrome dependencies (`libnss3.so`, dll)
- Serverless limitations untuk persistent connections
- Memory & timeout constraints

### ✅ Platform Deployment yang Didukung

#### 1. **Docker (Recommended)**
```bash
# Quick start
npm run docker:compose:up

# Rebuild (Windows)
npm run docker:rebuild

# Rebuild (PowerShell)
npm run docker:rebuild:ps1

# Rebuild (Linux/Mac)
npm run docker:rebuild:bash

# Manual build
npm run docker:build
npm run docker:run
```

#### 2. **VPS/Dedicated Server**
```bash
# Auto setup (Ubuntu/Debian)
npm run setup:prod

# Manual PM2
npm run pm2:start
```

#### 3. **Cloud Platforms**
- DigitalOcean App Platform
- Google Cloud Run
- AWS ECS/Fargate
- Railway
- Render

### Masalah Umum di Production

Jika aplikasi berjalan normal di localhost tetapi gagal terhubung di production server, kemungkinan penyebabnya:

1. **Konfigurasi Puppeteer tidak sesuai untuk server production**
2. **Missing dependencies Chrome/Chromium di server Linux**
3. **Konfigurasi sandbox dan security yang berbeda**

### Solusi Otomatis

Proyek ini sudah dilengkapi dengan konfigurasi otomatis untuk production:

- Deteksi environment production secara otomatis
- Konfigurasi Puppeteer yang dioptimalkan untuk server
- Auto-detect system Chrome/Chromium
- Support untuk custom environment variables

### Quick Setup untuk Production (Linux)

1. **Jalankan script setup otomatis:**
   ```bash
   chmod +x setup-production.sh
   ./setup-production.sh
   ```

2. **Atau setup manual:**
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install -y nodejs npm google-chrome-stable
   
   # Install project dependencies
   npm install
   
   # Install PM2
   npm install -g pm2
   
   # Start dengan PM2
   npm run pm2:start
   ```

### Environment Variables

Buat file `.env` dari template:
```bash
cp .env.example .env
```

Konfigurasi untuk production:
```env
NODE_ENV=production
PORT=3000
CHROME_PATH=/usr/bin/google-chrome-stable
SESSION_PATH=/app/sessions
```

### Scripts NPM untuk Production

```bash
# Start production mode
npm run prod

# PM2 commands
npm run pm2:start    # Start dengan PM2
npm run pm2:stop     # Stop aplikasi
npm run pm2:restart  # Restart aplikasi
npm run pm2:logs     # Lihat logs
npm run pm2:monit    # Monitor resource
```

## Troubleshooting

### Error "Failed to launch browser process"

**Penyebab:** Missing Chrome dependencies di server Linux

**Solusi:**
```bash
# Install Chrome dependencies
sudo apt install -y libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2

# Install Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable
```

### Error "No usable sandbox"

**Solusi:** Sudah ditangani otomatis dengan flag `--no-sandbox` di production

### Session Issues

**Solusi:**
```bash
# Hapus session yang corrupt
rm -rf .wwebjs_auth

# Restart aplikasi
npm run pm2:restart
```

### Memory Issues

**Solusi:**
- Gunakan server dengan minimal 2GB RAM
- Monitor dengan `npm run pm2:monit`
- Restart otomatis sudah dikonfigurasi di PM2

## Dokumentasi Lengkap

- [Panduan Deployment](./DEPLOYMENT_GUIDE.md) - Panduan lengkap deployment production
- [Konfigurasi PM2](./ecosystem.config.js) - Konfigurasi process manager
- [Setup Script](./setup-production.sh) - Script otomatis setup production

## Bug

- Fitur import kontak dari CSV tidak berfungsi

## Lisensi

Apache-2.0 License

## Kontribusi

Kontribusi dan saran perbaikan sangat diterima. Silakan buat issue atau pull request.

## Disclaimer

Proyek ini menggunakan library unofficial WhatsApp Web.js. Tidak ada jaminan tidak akan di-block oleh WhatsApp. Gunakan dengan bijak dan sesuai Terms of Service WhatsApp.
=======
4. Open your browser and navigate to `http://localhost:3000`

### Production Deployment

The project is configured for easy deployment on Vercel:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Deploy automatically with zero configuration

Alternatively, you can serve the static files using any web server.

## Usage

1. **Connect to WhatsApp**:
   - Open the application in your browser
   - Scan the QR code with your WhatsApp mobile app
   - Wait for the connection to be established

2. **Import Contacts**:
   - Use the CSV import feature to upload your contact list
   - Or manually add contacts through the interface

3. **Compose Message**:
   - Write your message in the text area
   - Optionally attach media files (images, videos, documents)
   - Select target contacts from the sidebar

4. **Send Broadcast**:
   - Click the "Send Broadcast" button
   - Monitor progress in the real-time progress dialog
   - Review delivery status for each contact

## Configuration

The application includes several configurable constants in `script.js`:

```javascript
static CONFIG = {
    BACKEND_URL: 'ws://localhost:8080',
    MAX_CONTACTS: 256,
    QR_SIZE: 256,
    NOTIFICATION_TIMEOUT: 3000
};
```

### Backend URL
Update the `BACKEND_URL` to point to your WebSocket server endpoint.

### Contact Limits
Modify `MAX_CONTACTS` to change the maximum number of contacts that can be selected for a single broadcast.

## File Descriptions

### `index.html`
The main HTML structure containing:
- Application layout and components
- Contact management sidebar
- Message composer interface
- Modal dialogs for progress and confirmations

### `script.js`
Core JavaScript application featuring:
- `WhatsAppBroadcastApp` class with modular architecture
- WebSocket communication handling
- Contact management and filtering
- Message composition and sending
- UI state management and animations

### `style.css`
Comprehensive styling including:
- Modern gradient backgrounds and glassmorphism effects
- Responsive design for all screen sizes
- Smooth animations and transitions
- Component-specific styling for all UI elements

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.

## Disclaimer

This tool is for educational and legitimate business purposes only. Please ensure compliance with WhatsApp's Terms of Service and applicable laws regarding bulk messaging in your jurisdiction.
>>>>>>> 8099e9b (Optimized WhatsApp Broadcast Tool - Complete refactor with improved code structure, documentation, and maintainability)
