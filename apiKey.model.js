import { Schema, model } from "mongoose";
import crypto from "crypto";

const apiKeySchema = new Schema({
	key: { type: String, unique: true, required: true },
	createdAt: { type: Date, default: Date.now() },
	lastUsed: { type: Date },
});

apiKeySchema.statics.generateKey = () => {
	return crypto.randomBytes(32).toString("hex");
};

export const ApiKey = model("ApiKey", apiKeySchema);
