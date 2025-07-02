const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();


// Ensure the MONGODB_URL environment variable is set 
if (!process.env.DATABASE_URI) {
  console.error("Missing MongoDB connection string in .env file");
  process.exit(1); // Exit the application if the MongoDB connection string is not provided
} 

const connectToDatabase = async () => { 
  try {
    mongoose.set('strictQuery', false);
 await mongoose.connect(process.env.DATABASE_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4,
  serverSelectionTimeoutMS: 3000,
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 1000,
  },
});

    console.log("Connection successful");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // Exit the application if the connection fails
  }
};

connectToDatabase();
