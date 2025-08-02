const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    console.log("DB_URI is:", process.env.DB_URI);
    const conn = await mongoose.connect(`${process.env.DB_URI}`);
    console.log(`Database Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Database Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = { dbConnection };
