/* eslint-disable linebreak-style */
/* global QRCode, Papa */

/**
 * WhatsApp Broadcast Application
 * Manages WhatsApp connection, contacts, and broadcast messaging
 */
class WhatsAppBroadcastApp {
    // Configuration constants
    static CONFIG = {
        MAX_CONTACTS: 256,
        NOTIFICATION_TIMEOUT: 3000,
        PROGRESS_MODAL_AUTO_CLOSE: 3000,
        QR_SIZE: 256
    };

    // WebSocket message types
    static MESSAGE_TYPES = {
        QR_CODE: 'qr_code',
        AUTHENTICATED: 'authenticated',
        READY: 'ready',
        CONTACTS: 'contacts',
        BROADCAST_PROGRESS: 'broadcast_progress',
        BROADCAST_COMPLETE: 'broadcast_complete',
        DISCONNECTED: 'disconnected',
        ERROR: 'error',
        SEND_BROADCAST: 'send_broadcast',
        LOGOUT: 'logout'
    };

    constructor() {
        this.initializeConfiguration();
        this.initializeState();
        this.initializeElements();
        this.attachEventListeners();
        this.connectToServer();
    }

    /**
     * Initialize backend configuration based on environment
     */
    initializeConfiguration() {
        const isLocalhost = window.location.hostname === 'localhost';
        this.BACKEND_URL = isLocalhost 
            ? 'http://localhost:3000' 
            : 'https://wa-broadcast.ekalliptus.my.id/';
        this.WS_URL = isLocalhost
            ? 'ws://localhost:3000'
            : 'wss://wa-broadcast.ekalliptus.my.id/';
    }

    /**
     * Initialize application state
     */
    initializeState() {
        this.socket = null;
        this.contacts = [];
        this.selectedContacts = new Set();
        this.isConnected = false;
        this.isSending = false;
        
    }

    /**
     * Initialize DOM elements and create necessary input elements
     */
    initializeElements() {
        this.initializeStatusElements();
        this.initializeQRElements();
        this.initializeContactElements();
        this.initializeMessageElements();
        this.initializeModalElements();
        this.createCsvFileInput();
    }

    /**
     * Initialize status-related DOM elements
     */
    initializeStatusElements() {
        this.statusElement = document.getElementById('connection-status');
        this.statusText = document.getElementById('status-text');
        this.connectBtn = document.getElementById('connect-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.importCsvBtn = document.getElementById('import-csv');
    }

    /**
     * Create hidden CSV file input element
     */
    createCsvFileInput() {
        this.csvFileInput = document.createElement('input');
        this.csvFileInput.type = 'file';
        this.csvFileInput.accept = '.csv';
        this.csvFileInput.style.display = 'none';
        document.body.appendChild(this.csvFileInput);
    }

    /**
     * Initialize QR code related elements
     */
    initializeQRElements() {
        this.qrSection = document.getElementById('qr-section');
        this.qrContainer = document.getElementById('qr-container');
    }

    /**
     * Initialize contact-related DOM elements
     */
    initializeContactElements() {
        this.contactsList = document.getElementById('contacts-list');
        this.totalContacts = document.getElementById('total-contacts');
        this.refreshContactsBtn = document.getElementById('refresh-contacts');
        this.searchContacts = document.getElementById('search-contacts');
        this.filterSaved = document.getElementById('filter-saved');
        this.filterCsv = document.getElementById('filter-csv');
    }

    /**
     * Initialize message composer elements
     */
    initializeMessageElements() {
        this.messageText = document.getElementById('message-text');
        this.includeMedia = document.getElementById('include-media');
        this.mediaFile = document.getElementById('media-file');
        this.selectMedia = document.getElementById('select-media');
        this.mediaUploadArea = document.getElementById('media-upload-area');
        this.mediaDropZone = document.getElementById('media-drop-zone');
        this.mediaPreview = document.getElementById('media-preview');
        this.selectedCount = document.getElementById('selected-count');
        this.sendBroadcast = document.getElementById('send-broadcast');
    }

    /**
     * Initialize modal-related DOM elements
     */
    initializeModalElements() {
        // Progress modal elements
        this.progressModal = document.getElementById('progress-modal');
        this.progressRingFill = document.getElementById('progress-ring-fill');
        this.progressText = document.getElementById('progress-text');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressStatus = document.getElementById('progress-status');
        this.progressLog = document.getElementById('progress-log');
        this.closeProgressBtn = document.getElementById('close-progress');
        
        // Confirm modal elements
        this.confirmModal = document.getElementById('confirm-modal');
        this.confirmMessage = document.getElementById('confirm-message');
        this.confirmOk = document.getElementById('confirm-ok');
        this.confirmCancel = document.getElementById('confirm-cancel');
    }

    /**
     * Attach event listeners to DOM elements
     */
    attachEventListeners() {
        this.attachConnectionEventListeners();
        this.attachContactEventListeners();
        this.attachMessageEventListeners();
        this.attachModalEventListeners();
    }

    /**
     * Attach connection-related event listeners
     */
    attachConnectionEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connectToServer());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.importCsvBtn.addEventListener('click', () => this.csvFileInput.click());
        this.csvFileInput.addEventListener('change', () => this.handleCsvImport());
    }

    /**
     * Attach contact-related event listeners
     */
    attachContactEventListeners() {
        this.refreshContactsBtn.addEventListener('click', () => this.refreshContacts());
        this.searchContacts.addEventListener('input', () => this.filterContacts());
        this.filterSaved.addEventListener('change', () => this.filterContacts());
        this.filterCsv.addEventListener('change', () => this.filterContacts());
        
        // Add select all functionality
        document.addEventListener('click', (e) => {
            if (e.target.id === 'select-all-contacts') {
                this.selectAllContacts(e.target.checked);
            }
        });
    }

    /**
     * Attach message composer event listeners
     */
    attachMessageEventListeners() {
        this.messageText.addEventListener('input', () => this.updateSendButton());
        this.includeMedia.addEventListener('change', () => this.toggleMediaSelection());
        if (this.selectMedia) {
            this.selectMedia.addEventListener('click', () => this.mediaFile.click());
        }
        this.mediaFile.addEventListener('change', () => this.handleMediaSelection());
        this.sendBroadcast.addEventListener('click', () => this.handleSendBroadcast());
        this.attachDragDropListeners();
    }

    /**
     * Attach modal event listeners
     */
    attachModalEventListeners() {
        if (this.closeProgressBtn) {
            this.closeProgressBtn.addEventListener('click', () => this.hideProgressModal());
        }
        
        if (this.confirmCancel) {
            this.confirmCancel.addEventListener('click', () => this.hideConfirmModal());
        }
    }

    /**
     * Attach drag and drop event listeners for media upload
     */
    attachDragDropListeners() {
        if (!this.mediaDropZone) return;
        
        this.mediaDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.mediaDropZone.style.borderColor = '#667eea';
            this.mediaDropZone.style.background = '#f0f4ff';
        });
        
        this.mediaDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.mediaDropZone.style.borderColor = '#e2e8f0';
            this.mediaDropZone.style.background = '#f8f9fa';
        });
        
        this.mediaDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.mediaDropZone.style.borderColor = '#e2e8f0';
            this.mediaDropZone.style.background = '#f8f9fa';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.mediaFile.files = files;
                this.handleMediaSelection();
            }
        });
    }

    /**
     * Establish WebSocket connection to the server
     */
    connectToServer() {
        try {
            this.updateStatus('connecting', 'Menghubungkan ke server...');
            this.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan...';
            this.connectBtn.disabled = true;
            
            this.socket = new WebSocket(this.WS_URL);
            this.attachWebSocketEventListeners();
        } catch (error) {
            console.error('Connection error:', error);
            this.handleError('Gagal terhubung ke server');
        }
    }

    /**
     * Attach WebSocket event listeners
     */
    attachWebSocketEventListeners() {
        this.socket.onopen = () => {
            console.log('Connected to WebSocket server');
            this.updateStatus('connecting', 'Terhubung ke server, menunggu QR code...');
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket connection closed');
            this.handleDisconnected('Koneksi terputus');
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleError('Gagal terhubung ke server');
        };
    }

    /**
     * Handle incoming WebSocket messages from server
     * @param {Object} data - Message data from server
     */
    handleServerMessage(data) {
        console.log('Received message from server:', data);
        
        const { MESSAGE_TYPES } = WhatsAppBroadcastApp;
        
        switch (data.type) {
        case MESSAGE_TYPES.QR_CODE:
            this.showQRCode(data.qr);
            break;
        case MESSAGE_TYPES.AUTHENTICATED:
            this.handleAuthenticated();
            break;
        case MESSAGE_TYPES.READY:
            this.handleReady();
            break;
        case MESSAGE_TYPES.CONTACTS:
            this.handleContacts(data.contacts);
            break;
        case MESSAGE_TYPES.BROADCAST_PROGRESS:
            this.handleBroadcastProgress(data);
            break;
        case MESSAGE_TYPES.BROADCAST_COMPLETE:
            this.handleBroadcastComplete(data);
            break;
        case MESSAGE_TYPES.DISCONNECTED:
            this.handleDisconnected(data.message);
            break;
        case MESSAGE_TYPES.ERROR:
            this.handleError(data.message);
            break;
        default:
            console.warn('Unknown message type:', data.type);
        }
    }

    /**
     * Display QR code for WhatsApp authentication
     * @param {string} qrData - QR code data string
     */
    showQRCode(qrData) {
        console.log('Displaying QR code:', qrData);
        this.updateStatus('connecting', 'Scan QR Code dengan WhatsApp');
        
        // Clear previous QR code and show section
        this.qrContainer.innerHTML = '';
        this.qrSection.style.display = 'block';
        
        // Check if QRCode library is available
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            this.qrContainer.innerHTML = '<p>Error: QR Code library tidak tersedia</p>';
            this.updateStatus('error', 'QRCode library tidak tersedia');
            return;
        }
        
        // Generate new QR code using library constructor
        try {
            new QRCode(this.qrContainer, {
                text: qrData,
                width: WhatsAppBroadcastApp.CONFIG.QR_SIZE,
                height: WhatsAppBroadcastApp.CONFIG.QR_SIZE,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            console.log('QR Code generated successfully');
        } catch (error) {
            console.error('Error generating QR code:', error);
            console.error('Error details:', error.stack);
            this.qrContainer.innerHTML = '<p>Error generating QR code: ' + error.message + '</p>';
            this.updateStatus('error', 'Gagal generate QR code: ' + error.message);
        }
    }

    handleAuthenticated() {
        this.qrSection.style.display = 'none';
        this.updateStatus('connecting', 'Autentikasi berhasil, memuat data...');
        this.showNotification('QR Code berhasil dipindai!', 'success');
    }

    handleReady() {
        this.isConnected = true;
        this.updateStatus('connected', 'Terhubung ke WhatsApp');
        this.connectBtn.innerHTML = '<i class="fas fa-check"></i> Terhubung';
        this.connectBtn.disabled = true;
        this.logoutBtn.style.display = 'inline-block';
        // Don't hide QR section
        // this.qrSection.style.display = 'none';
        this.showNotification('WhatsApp berhasil terhubung!', 'success');
        this.refreshContacts();
        console.log('WhatsApp ready');
        // Add connected indicator
        const connectedIcon = document.createElement('div');
        connectedIcon.className = 'connected-icon';
        connectedIcon.innerHTML = '<i class="fas fa-check-circle"></i> Terhubung';
        this.qrContainer.appendChild(connectedIcon);
    }

    handleContacts(contacts) {
        this.contacts = contacts;
        this.renderContacts();
        this.totalContacts.textContent = contacts.length;
    }

    handleCsvImport() {
        const file = this.csvFileInput.files[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const importedContacts = results.data.map(row => ({
                    id: row.number || row.phone,
                    name: row.name || null,
                    number: this.formatNumber(row.number || row.phone),
                    isMyContact: false,
                    isFromCSV: true
                }));
                // Deduplikasi berdasarkan number
                const uniqueImported = importedContacts.filter(imp => !this.contacts.some(existing => existing.number === imp.number));
                // Batasi jumlah import agar tidak melebihi sisa slot
                const availableSlots = this.MAX_CONTACTS - this.selectedContacts.size;
                const addedContacts = uniqueImported.slice(0, availableSlots);
                this.contacts = [...this.contacts, ...addedContacts];
                this.renderContacts();
                this.totalContacts.textContent = this.contacts.length;
                this.csvFileInput.value = '';
                if (uniqueImported.length > addedContacts.length) {
                    alert(`Hanya ${addedContacts.length} kontak baru ditambahkan. Sisa dibatasi karena limit maksimal.`);
                }
                this.filterCsv.checked = true;
                this.filterContacts();
            }
        });
    }

    formatNumber(number) {
        if (number.startsWith('62')) {
            return '0' + number.substring(2);
        }
        return number;
    }

    refreshContacts() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN && this.isConnected) {
            this.refreshContactsBtn.innerHTML = '<div class="loading"></div> Loading...';
            this.refreshContactsBtn.disabled = true;
            this.socket.send(JSON.stringify({ type: 'get_contacts' }));
            
            setTimeout(() => {
                this.refreshContactsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                this.refreshContactsBtn.disabled = false;
            }, 2000);
        }
    }

    renderContacts() {
        if (this.contacts.length === 0) {
            this.contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-users"></i>
                    <p>Belum ada kontak. Pastikan WhatsApp sudah terhubung.</p>
                </div>
            `;
            return;
        }

        const filteredContacts = this.getFilteredContacts();
        
        this.contactsList.innerHTML = filteredContacts.map(contact => `
            <div class="contact-item" data-id="${contact.id}">
                <input type="checkbox" class="contact-checkbox" data-id="${contact.id}">
                <div class="contact-avatar">
                    ${this.getContactInitials(contact.name || contact.number)}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name || 'Tidak Dikenal'}</div>
                    <div class="contact-number">${contact.number}</div>
                </div>
                <span class="contact-type ${contact.isMyContact ? 'contact-saved' : (contact.isFromCSV ? 'contact-csv' : 'contact-unsaved')}">
                    ${contact.isMyContact ? 'Tersimpan' : (contact.isFromCSV ? 'Dari CSV' : 'Tidak Tersimpan')}
                </span>
            </div>
        `).join('');

        // Attach checkbox event listeners
        this.contactsList.querySelectorAll('.contact-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleContactSelection(e));
        });

        // Attach contact item click listeners
        this.contactsList.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('.contact-checkbox');
                    checkbox.checked = !checkbox.checked;
                    this.handleContactSelection({ target: checkbox });
                }
            });
        });
    }

    getFilteredContacts() {
        let filtered = this.contacts;
        
        // Filter by search term
        const searchTerm = this.searchContacts.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(contact => 
                (contact.name && contact.name.toLowerCase().includes(searchTerm)) ||
                contact.number.includes(searchTerm)
            );
        }
        
        // Filter by type
        const showSaved = this.filterSaved.checked;
        const showCsv = this.filterCsv.checked;
        
        if (!showSaved || !showCsv) {
            filtered = filtered.filter(contact => {
                if (showSaved && contact.isMyContact) return true;
                if (showCsv && (contact.isFromCSV || !contact.isMyContact)) return true;
                return false;
            });
        }
        
        return filtered;
    }

    filterContacts() {
        this.renderContacts();
        this.updateSelectedContacts();
    }

    /**
     * Handle contact selection/deselection
     * @param {Event} e - Checkbox change event
     */
    handleContactSelection(e) {
        const contactId = e.target.dataset.id;
        const isChecked = e.target.checked;
        const maxContacts = WhatsAppBroadcastApp.CONFIG.MAX_CONTACTS;
        
        if (isChecked) {
            if (this.selectedContacts.size >= maxContacts) {
                e.target.checked = false;
                this.showNotification(`Maksimal ${maxContacts} kontak yang dapat dipilih.`, 'warning');
                return;
            }
            this.selectedContacts.add(contactId);
            e.target.closest('.contact-item').classList.add('selected');
        } else {
            this.selectedContacts.delete(contactId);
            e.target.closest('.contact-item').classList.remove('selected');
        }
        
        this.updateSelectedContacts();
    }

    /**
     * Update selected contacts count display
     */
    updateSelectedContacts() {
        const maxContacts = WhatsAppBroadcastApp.CONFIG.MAX_CONTACTS;
        this.selectedCount.textContent = `${this.selectedContacts.size}/${maxContacts}`;
        this.updateSendButton();
    }

    getContactInitials(name) {
        if (!name) return '?';
        const words = name.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    }

    toggleMediaSelection() {
        if (this.includeMedia.checked) {
            this.mediaUploadArea.style.display = 'block';
        } else {
            this.mediaUploadArea.style.display = 'none';
            this.mediaFile.value = '';
            this.mediaPreview.style.display = 'none';
            this.mediaDropZone.style.display = 'block';
        }
    }

    handleMediaSelection() {
        const file = this.mediaFile.files[0];
        if (file) {
            console.log('Media file selected:', file.name);
            this.showMediaPreview(file);
        }
    }
    
    showMediaPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            let previewHTML = '';
            
            if (file.type.startsWith('image/')) {
                previewHTML = `
                    <div class="preview-item">
                        <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                        <div class="preview-info">
                            <p><strong>${file.name}</strong></p>
                            <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button onclick="this.parentElement.parentElement.parentElement.style.display='none'; document.getElementById('media-drop-zone').style.display='block'; document.getElementById('media-file').value=''" class="btn btn-secondary btn-sm">
                                <i class="fas fa-times"></i> Hapus
                            </button>
                        </div>
                    </div>
                `;
            } else if (file.type.startsWith('video/')) {
                previewHTML = `
                    <div class="preview-item">
                        <video controls style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                            <source src="${e.target.result}" type="${file.type}">
                        </video>
                        <div class="preview-info">
                            <p><strong>${file.name}</strong></p>
                            <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button onclick="this.parentElement.parentElement.parentElement.style.display='none'; document.getElementById('media-drop-zone').style.display='block'; document.getElementById('media-file').value=''" class="btn btn-secondary btn-sm">
                                <i class="fas fa-times"></i> Hapus
                            </button>
                        </div>
                    </div>
                `;
            } else {
                previewHTML = `
                    <div class="preview-item">
                        <div class="file-icon">
                            <i class="fas fa-file" style="font-size: 3rem; color: #667eea;"></i>
                        </div>
                        <div class="preview-info">
                            <p><strong>${file.name}</strong></p>
                            <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button onclick="this.parentElement.parentElement.parentElement.style.display='none'; document.getElementById('media-drop-zone').style.display='block'; document.getElementById('media-file').value=''" class="btn btn-secondary btn-sm">
                                <i class="fas fa-times"></i> Hapus
                            </button>
                        </div>
                    </div>
                `;
            }
            
            this.mediaPreview.innerHTML = previewHTML;
            this.mediaPreview.style.display = 'block';
            this.mediaDropZone.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    /**
     * Select or deselect all contacts
     * @param {boolean} checked - Whether to select or deselect all
     */
    selectAllContacts(checked) {
        const checkboxes = this.contactsList.querySelectorAll('.contact-checkbox');
        const maxContacts = WhatsAppBroadcastApp.CONFIG.MAX_CONTACTS;
        
        if (checked) {
            let added = this.selectedContacts.size;
            checkboxes.forEach(checkbox => {
                if (added >= maxContacts) {
                    checkbox.checked = false;
                    return;
                }
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    const contactId = checkbox.dataset.id;
                    this.selectedContacts.add(contactId);
                    checkbox.closest('.contact-item').classList.add('selected');
                    added++;
                }
            });
        } else {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const contactId = checkbox.dataset.id;
                this.selectedContacts.delete(contactId);
                checkbox.closest('.contact-item').classList.remove('selected');
            });
        }
        
        this.updateSelectedContacts();
    }

    updateSendButton() {
        const hasMessage = this.messageText.value.trim().length > 0;
        const hasContacts = this.selectedContacts.size > 0;
        const canSend = hasMessage && hasContacts && this.isConnected && !this.isSending;
        
        this.sendBroadcast.disabled = !canSend;
    }

    handleSendBroadcast() {
        if (this.isSending) return;
        
        const message = this.messageText.value.trim();
        const selectedContactIds = Array.from(this.selectedContacts);
        
        if (!message || selectedContactIds.length === 0) {
            this.showNotification('Silakan masukkan pesan dan pilih kontak terlebih dahulu.', 'error');
            return;
        }
        
        // Show confirmation modal
        const confirmMessage = `Kirim pesan ke ${selectedContactIds.length} kontak?`;
        this.showConfirmModal(confirmMessage, () => {
            this.sendBroadcastMessage(message, selectedContactIds);
        });
    }
    
    /**
     * Send broadcast message to selected contacts
     * @param {string} message - Message text to send
     * @param {Array} selectedContactIds - Array of contact IDs
     */
    sendBroadcastMessage(message, selectedContactIds) {
        this.isSending = true;
        this.sendBroadcast.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Mengirim...</span>';
        this.sendBroadcast.disabled = true;
        
        this.showProgressModal();
        
        const broadcastData = {
            type: WhatsAppBroadcastApp.MESSAGE_TYPES.SEND_BROADCAST,
            message: message,
            contacts: selectedContactIds
        };
        
        if (this.includeMedia.checked && this.mediaFile.files[0]) {
            const file = this.mediaFile.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                broadcastData.media = {
                    data: reader.result.split(',')[1], // base64 data
                    mimetype: file.type,
                    filename: file.name
                };
                this.socket.send(JSON.stringify(broadcastData));
            };
            reader.readAsDataURL(file);
        } else {
            this.socket.send(JSON.stringify(broadcastData));
        }
        
        this.addLogEntry('info', 'Memulai pengiriman broadcast...');
    }
    
    showConfirmModal(message, onConfirm) {
        this.confirmMessage.textContent = message;
        this.confirmModal.style.display = 'flex';
        
        // Remove previous event listeners
        const newConfirmOk = this.confirmOk.cloneNode(true);
        this.confirmOk.parentNode.replaceChild(newConfirmOk, this.confirmOk);
        this.confirmOk = newConfirmOk;
        
        this.confirmOk.addEventListener('click', () => {
            this.hideConfirmModal();
            onConfirm();
        });
    }
    
    hideConfirmModal() {
        this.confirmModal.style.display = 'none';
    }
    
    showProgressModal() {
        this.progressModal.style.display = 'flex';
        // Reset progress
        this.progressRingFill.style.strokeDasharray = '0 327';
        this.progressPercentage.textContent = '0%';
        this.progressText.textContent = '0 / 0';
        this.progressStatus.textContent = 'Memulai...';
        this.progressLog.innerHTML = '';
    }
    
    hideProgressModal() {
        this.progressModal.style.display = 'none';
    }
    
    /**
     * Show notification message to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, error, warning)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        const colors = {
            success: '#25D366',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, WhatsAppBroadcastApp.CONFIG.NOTIFICATION_TIMEOUT);
    }

    handleBroadcastProgress(data) {
        const { current, total, contact, success, error } = data;
        const percentage = Math.round((current / total) * 100);
        
        // Update progress circle
        const circumference = 2 * Math.PI * 52; // radius = 52
        const offset = circumference - (percentage / 100) * circumference;
        this.progressRingFill.style.strokeDasharray = `${circumference} ${circumference}`;
        this.progressRingFill.style.strokeDashoffset = offset;
        
        // Update text elements
        this.progressText.textContent = `${current} / ${total}`;
        this.progressPercentage.textContent = `${percentage}%`;
        this.progressStatus.textContent = current === total ? 'Selesai' : 'Mengirim...';
        
        if (success) {
            this.addLogEntry('success', `✓ Berhasil kirim ke ${contact.name || contact.number}`);
        } else if (error) {
            this.addLogEntry('error', `✗ Gagal kirim ke ${contact.name || contact.number}: ${error}`);
        }
    }

    handleBroadcastComplete(data) {
        this.isSending = false;
        this.sendBroadcast.innerHTML = '<i class="fas fa-rocket"></i><span>Kirim Broadcast</span>';
        this.updateSendButton();
        
        const { successful, failed, total } = data;
        
        // Final progress update
        const circumference = 2 * Math.PI * 52;
        this.progressRingFill.style.strokeDasharray = `${circumference} ${circumference}`;
        this.progressRingFill.style.strokeDashoffset = 0;
        this.progressPercentage.textContent = '100%';
        this.progressStatus.textContent = 'Selesai!';
        
        // Add completion log
        this.addLogEntry('info', `Broadcast selesai! Berhasil: ${successful}, Gagal: ${failed}, Total: ${total}`);
        
        // Auto close modal after 3 seconds
        setTimeout(() => {
            this.hideProgressModal();
            this.showNotification(`Broadcast selesai! Berhasil: ${successful}, Gagal: ${failed}`, 'success');
        }, 3000);
        
        // Clear selections
        this.selectedContacts.clear();
        this.messageText.value = '';
        this.mediaFile.value = '';
        this.includeMedia.checked = false;
        this.toggleMediaSelection();
        this.renderContacts();
        this.updateSelectedContacts();
    }

    addLogEntry(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.progressLog.appendChild(logEntry);
        this.progressLog.scrollTop = this.progressLog.scrollHeight;
    }

    handleDisconnected(message) {
        this.isConnected = false;
        this.qrSection.style.display = 'none';
        this.updateStatus('disconnected', message || 'Terputus dari WhatsApp');
        this.connectBtn.innerHTML = '<i class="fas fa-play"></i> Mulai Koneksi';
        this.connectBtn.disabled = false;
        this.logoutBtn.style.display = 'none';
        this.contacts = [];
        this.selectedContacts.clear();
        this.renderContacts();
        this.updateSelectedContacts();
        this.totalContacts.textContent = '0';
        console.log('WhatsApp disconnected:', message);
    }

    handleLogout() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'logout' }));
        }
    }

    handleError(message) {
        console.error('Error:', message);
        this.addLogEntry('error', message);
        
        // Don't show alert for minor errors
        if (message.includes('Authentication failed') || message.includes('disconnected')) {
            this.updateStatus('disconnected', 'Error Koneksi');
            this.connectBtn.innerHTML = '<i class="fas fa-play"></i> Mulai Koneksi';
            this.connectBtn.disabled = false;
        }
    }

    updateStatus(status, text) {
        this.statusElement.className = `status-${status}`;
        this.statusText.textContent = text;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppBroadcastApp();
});
