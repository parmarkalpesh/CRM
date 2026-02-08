# Vikalp CRM - Electronics & Refrigeration Management System

A professional, industrial-grade CRM built for **Vikalp Electronics & Refrigeration** to manage customers, track service complaints, and generate professional GST-compliant invoices.

![Vikalp CRM](https://vikalp-crm.vercel.app/admin/dashboard)

## 🚀 Live Demo
- **Frontend**: [https://vikalp-crm.vercel.app/](https://vikalp-crm.vercel.app/)
- **Backend**: [https://vikalp-crm-backend.vercel.app/](https://vikalp-crm-backend.vercel.app/)

## ✨ Key Features

### 👤 Customer Management
- Maintain a structured database of all service customers.
- Quick search and filtering by name or mobile number.
- Detailed customer profiles with service history.

### 🛠️ Service Complaint Tracking
- Register and track status of service requests (AC, Fridge, CCTV, etc.).
- Categorization by service type and urgency.
- Real-time status updates from "Pending" to "Completed".

### 📄 Professional Invoice Generation
- **GST-Compliant**: Automatic calculation of CGST, SGST, and Grand Totals.
- **Tally-style Layout**: Clean and professional invoice design optimized for branding.
- **Multi-item Support**: Add multiple service items with custom rates, quantities, and discounts.

### 📥 PDF Export
- High-quality PDF generation for client sharing.
- Fixed-height tables and precise alignment for a premium look.
- Client-side and server-side download options.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS (v4), Framer Motion (animations), Lucide React (icons).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **Authentication**: JSON Web Tokens (JWT).
- **PDF Generation**: jsPDF, html2canvas (client), PDFKit (server).

## 📂 Project Structure

```text
CRM/
├── client/           # React frontend application
│   ├── src/
│   │   ├── api/      # API configurations
│   │   ├── comp/     # Reusable components
│   │   ├── context/  # Auth & Global state
│   │   └── pages/    # Main application views
├── server/           # Node.js Express backend
│   ├── config/       # Database & system configs
│   ├── controllers/  # Request handlers
│   ├── models/       # Database schemas
│   └── routes/       # API endpoints
```

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/vikalp-crm.git
cd vikalp-crm
```

### 2. Backend Setup
```bash
cd server
npm install
```
Create a `.env` file in the `server` folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@vikalp.com
ADMIN_PASSWORD=your_secure_password
```
Run the backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```
Create a `.env` file in the `client` folder:
```env
VITE_API_URL=http://localhost:5000/api
```
Run the frontend:
```bash
npm run dev
```

## 🌐 Environment Variables for Vercel

When deploying to Vercel, ensure the following variables are set:

- **Frontend Project**:
  - `VITE_API_URL`: `https://vikalp-crm-backend.vercel.app/api`

- **Backend Project**:
  - `FRONTEND_URL`: `https://vikalp-crm.vercel.app`
  - `MONGODB_URI`: Your production MongoDB URI.
  - `JWT_SECRET`: A long random string.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License
This project is for internal use by Vikalp Electronics & Refrigeration.
