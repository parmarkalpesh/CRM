const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
const Admin = require('./models/Admin');

// Initialize app
const app = express();

// Connect to Database & Seed Admin
const initDB = async () => {
    try {
        await connectDB();

        // Seed Admin if credentials provided in .env
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (adminEmail && adminPassword) {
            const adminExists = await Admin.findOne({ email: adminEmail });
            if (!adminExists) {
                await Admin.create({
                    name: 'System Admin',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'Admin'
                });
                console.log(`[SEED] Admin account created for: ${adminEmail}`);
            }
        }
    } catch (error) {
        console.error('Database/Seeding error:', error.message);
    }
};
initDB();

// Middlewares
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL, 'https://vikalp-crm.vercel.app']
        : true,
    credentials: true
})); // Secure CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Body parser

// Rate Limiting (Production safeguard)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Basic Route
app.get('/', (req, res) => {
    res.send('Vikalp Electronics CRM API is running...');
});

// Routes usage
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Export app for serverless (Vercel)
module.exports = app;
