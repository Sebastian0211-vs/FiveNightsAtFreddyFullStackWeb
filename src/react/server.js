import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();

app.use(cors({ origin: 'https://fnaf.sy-baubau.ch' })); // ou * en dev
app.use(express.json());
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connecté BAUBAU!!'))
    .catch(err => console.error(err));

app.listen(3002, () => console.log('Server on :3002'));