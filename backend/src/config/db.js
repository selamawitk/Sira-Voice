import mongoose from "mongoose";

const connectDB= async()=>{
    try {
        let uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MongoURI;
        if (!uri) {
            throw new Error('Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in your .env');
        }
        uri = uri.replace(/[?&]serverSelectionTryOnce=[^&]*/g, '').replace(/[?&]&/, '?')
        const conn= await mongoose.connect(uri)
        console.log(`MongoDB Connected: ${conn.connection.host}`)
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}

export default connectDB;