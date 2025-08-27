import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './SRC/DB/database.js'
import router from './SRC/routes/index.js'

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TutorMatch API is running',
    timestamp: new Date().toISOString()
  });
});

console.log('About to load routes...');
try {
  app.use('/api/v1', router);
  console.log('Routes loaded successfully');
} catch (error) {
  console.error('Error loading routes:', error.message);
}


app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// const PORT = process.env.PORT || 3000;

const startServer  = async () => {
   const PORT  = process.env.PORT || 2345
   connectDB()
   try {
      app.listen(PORT,() => {console.log(`TUTOR_V1 IS RUNNING ON PORT: ${PORT}`);})
   } catch (error) {
      console.log(error);
   }
};

startServer();

export default app;