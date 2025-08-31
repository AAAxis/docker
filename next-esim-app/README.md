# React eSIM Application with Firebase

A modern React application for eSIM management with Firebase backend, featuring real-time data synchronization, Stripe payments, and QR code generation.

## 🚀 Features

- **Modern React UI** with Tailwind CSS and Framer Motion
- **Firebase Integration** for authentication, database, and hosting
- **Stripe Payments** with secure payment processing
- **eSIM Management** with QR code generation
- **Real-time Data Sync** from DataPlans API
- **Responsive Design** for mobile and desktop
- **TypeScript Support** for better development experience

## 📋 Prerequisites

- Node.js 16+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore, Auth, and Functions enabled
- Stripe account for payments
- DataPlans API access (optional)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd react-esim-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your Firebase and Stripe credentials.

4. **Initialize Firebase**
   ```bash
   firebase login
   firebase init
   ```

5. **Deploy Firebase Functions**
   ```bash
   cd functions
   pip install -r requirements.txt
   cd ..
   firebase deploy --only functions
   ```

6. **Start development server**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication, Firestore, Functions, and Storage
3. Add your Firebase config to `.env`

### Stripe Setup

1. Create a Stripe account
2. Get your publishable and secret keys
3. Add publishable key to `.env`
4. Add secret key to Firebase Functions config:
   ```bash
   firebase functions:config:set stripe.test_secret_key="sk_test_..."
   firebase functions:config:set stripe.live_secret_key="sk_live_..."
   ```

### DataPlans API (Optional)

1. Get API token from DataPlans
2. Add to Firebase Functions config:
   ```bash
   firebase functions:config:set dataplans.api_token="your_token"
   ```

## 📁 Project Structure

```
react-esim-app/
├── src/
│   ├── components/          # React components
│   │   ├── EsimPlans.jsx    # eSIM plans display
│   │   ├── Checkout.jsx     # Payment checkout
│   │   ├── EsimQrCode.jsx   # QR code display
│   │   └── ...
│   ├── services/            # API services
│   │   ├── esimService.js   # eSIM operations
│   │   └── paymentService.js # Payment operations
│   ├── contexts/            # React contexts
│   │   └── AuthContext.jsx  # Authentication context
│   ├── firebase/            # Firebase configuration
│   │   └── config.js        # Firebase setup
│   └── App.jsx              # Main app component
├── functions/               # Firebase Functions
│   ├── main.py             # Main functions file
│   ├── config.py           # Functions configuration
│   └── requirements.txt    # Python dependencies
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
└── package.json            # Node.js dependencies
```

## 🔌 API Endpoints

### eSIM Functions

- `createOrder` - Create new eSIM order
- `getEsimQrCode` - Generate QR code for eSIM
- `checkEsimCapacity` - Check plan availability
- `syncCountriesFromApi` - Sync countries from DataPlans
- `syncRegionsFromApi` - Sync regions from DataPlans
- `syncPlansFromApi` - Sync plans from DataPlans

### Payment Functions

- `createPaymentIntent` - Create Stripe payment intent
- `processWalletPayment` - Process wallet payment
- `confirmPayment` - Confirm payment status

## 🚀 Deployment

### Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Deploy Functions

```bash
firebase deploy --only functions
```

### Deploy Everything

```bash
firebase deploy
```

## 🔒 Security

- Firestore rules protect user data
- Storage rules secure file uploads
- Authentication required for sensitive operations
- Stripe handles secure payment processing

## 📱 Usage

1. **Browse Plans** - Users can view available eSIM plans
2. **Select Plan** - Choose a plan and proceed to checkout
3. **Payment** - Complete payment with Stripe
4. **QR Code** - Receive QR code for eSIM activation
5. **Activate** - Scan QR code to activate eSIM

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

## 🔄 Migration from Laravel

This React app replaces the Laravel eSIM application with:

- **Frontend**: React instead of Laravel Blade
- **Backend**: Firebase Functions instead of Laravel controllers
- **Database**: Firestore instead of PostgreSQL
- **Authentication**: Firebase Auth instead of Laravel Sanctum
- **Payments**: Direct Stripe integration instead of Laravel packages

### Key Benefits

- **Scalability**: Serverless architecture
- **Performance**: CDN hosting and real-time updates
- **Cost**: Pay-per-use pricing model
- **Development**: Faster iteration with hot reloading
- **Mobile**: Better mobile experience with PWA capabilities
