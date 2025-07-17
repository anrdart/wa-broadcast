# WhatsApp Broadcast Tool

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
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

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