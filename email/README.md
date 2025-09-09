# Email Management Frontend

A modern Next.js application for managing email templates and campaigns, built with Firebase authentication and Firestore database.

## Features

- 🔐 Firebase Authentication
- 📧 Email Template Management
- 📁 Project Organization
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive Design
- 🔄 Real-time Data Sync

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **State Management**: React Context
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Firebase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your Firebase configuration and API URL.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API Configuration
NEXT_PUBLIC_API_URL=https://api.theholylabs.com
```

## Project Structure

```
nextjs-app/
├── app/                    # Next.js 13+ app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard
│   ├── LoginForm.tsx      # Authentication form
│   ├── ProjectList.tsx    # Project listing
│   ├── ProjectDetail.tsx  # Project details
│   └── ...               # Other components
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Authentication context
│   └── ProjectContext.tsx # Project management context
├── lib/                   # Utility libraries
│   ├── firebase.ts        # Firebase configuration
│   └── api.ts            # API client
└── ...                   # Configuration files
```

## Deployment

### Docker

Build and run with Docker:

```bash
docker build -t email-management-frontend .
docker run -p 3000:3000 email-management-frontend
```

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## API Integration

The frontend integrates with the backend API at `api.theholylabs.com` for:
- Email sending functionality
- File uploads
- Template processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
