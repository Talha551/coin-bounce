const mongoose = require('mongoose');
const {MONGODB_CONNECTION_STRING} = require ('../config/index')

async function dbConnect() {
  try {
    const conn = await mongoose.connect(MONGODB_CONNECTION_STRING);
    console.log(`Database connected to host : ${conn.connection.host}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

module.exports = { dbConnect };