import mongoose from "mongoose";
import { ENV } from "../lib/ENV.ts";

export const connectDB = async() => {
    try {
        await mongoose.connect(ENV.MONGODB_URI);
        console.log("Connected to MongoDB successfully");

    } catch (err:any) {
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1);
    }
}