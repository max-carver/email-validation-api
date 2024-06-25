import mongoose from "mongoose";

const connectToDB = async () => {
	try {
		mongoose.connect(process.env.MONGO_URI);
	} catch (err) {
		console.error("Error connecting to DB:", err);
	}
};

export default connectToDB;
