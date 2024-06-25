import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { ApiKey } from "./apiKey.model.js";
import connectToDB from "./db.js";
import { validateEmail } from "./emailValidation.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

connectToDB();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// API key middleware
const apiKeyAuth = async (req, res, next) => {
	const apiKey = req.headers["x-api-key"];
	if (!apiKey) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const keyDoc = await ApiKey.findOne({ key: apiKey });
		if (!keyDoc) {
			return res.status(401).json({ error: "Invalid API Key" });
		}

		keyDoc.lastUsed = new Date();
		await keyDoc.save();
		next();
	} catch (err) {
		res.status(500).json({ error: "Unexpected error" });
	}
};

// Validate Email
app.post("/v1/validate-email", apiKeyAuth, async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).json({ error: "Email is required" });
	}

	try {
		const validationResult = await validateEmail(email);
		res.json(validationResult);
	} catch (error) {
		res.status(500).json({ error: "An error occurred during validation" });
	}
});

// Generate API Key
app.post("/generate-api-key", async (req, res) => {
	try {
		const newKey = ApiKey.generateKey();
		const apiKey = new ApiKey({ key: newKey });
		await apiKey.save();
		res.json({ apiKey: newKey });
	} catch (err) {
		res.status(500).json({ error: "Failed to generate API Key" });
	}
});

app.listen(port, "0.0.0.0", () => {
	console.log(`Server running on port ${port}`);
});
