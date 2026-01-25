const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedAdmin = async () => {
    try {
        await Admin.deleteMany({ email: 'admin@vikalp.com' });

        const admin = await Admin.create({
            name: 'Vikalp Admin',
            email: 'admin@vikalp.com',
            password: 'adminpassword123', // This will be hashed by the model pre-save hook
        });

        if (admin) {
            console.log('Admin user created successfully!');
            console.log('Email: admin@vikalp.com');
            console.log('Password: adminpassword123');
        }
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedAdmin();
