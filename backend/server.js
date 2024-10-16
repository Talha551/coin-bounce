const express = require('express');
const  { dbConnect } = require('./database/index');
const {PORT} = require('./config/index');
const router =require('./routes/index');
const errorHandler =require('./middlewares/errorHandlers')
const cookieParser = require('cookie-parser');
const cors = require('cors');

const corsOptions = {
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };


const app = express();

app.use(cookieParser());

app.use(cors(corsOptions));

app.use(express.json());

app.use(router);

dbConnect();

app.use('/storage',express.static('storage'));

app.use(errorHandler);

app.listen(PORT, console.log(`Backend is running on port: ${PORT}`));