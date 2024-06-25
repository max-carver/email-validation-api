import dns from "dns";
import net from "net";

export async function validateEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { isValid: false, reason: "Invalid email format" };
	}

	const [, domain] = email.split("@");
	const knownProviders = [
		"gmail.com",
		"outlook.com",
		"icloud.com",
		"yahoo.com",
		"projectexodus.net",
	];

	const isKnownProvider = knownProviders.includes(domain.toLowerCase());
	const hasMxRecord = await checkMxRecord(domain);
	const smtpCheck = await performSmtpCheck(email);

	return {
		isValid: hasMxRecord && smtpCheck.isValid,
		domain,
		isKnownProvider,
		hasMxRecord,
		smtpCheck: smtpCheck.details,
	};
}

export function checkMxRecord(domain) {
	return new Promise((resolve) => {
		dns.resolveMx(domain, (error, addresses) => {
			resolve(!error && addresses && addresses.length > 0);
		});
	});
}

export async function performSmtpCheck(email) {
	const [, domain] = email.split("@");

	try {
		const mxRecords = await getMxRecords(domain);
		if (mxRecords.length === 0) {
			return { isValid: false, details: "No MX records found" };
		}

		const smtpServer = mxRecords[0].exchange;
		const socket = await connectToSmtp(smtpServer);
		await sendCommand(socket, null, 220);
		await sendCommand(socket, `HELO ${domain}\r\n`, 250);
		await sendCommand(socket, `MAIL FROM:<check@${domain}>\r\n`, 250);
		const rcptResponse = await sendCommand(
			socket,
			`RCPT TO:<${email}>\r\n`,
			[250, 251, 550, 553, 554]
		);

		socket.destroy();

		if (rcptResponse.startsWith("250") || rcptResponse.startsWith("251")) {
			return { isValid: true, details: "Email address exists" };
		} else {
			return { isValid: false, details: "Email address does not exist" };
		}
	} catch (error) {
		return { isValid: false, details: `SMTP check failed` };
	}
}

export function getMxRecords(domain) {
	return new Promise((resolve, reject) => {
		dns.resolveMx(domain, (err, addresses) => {
			if (err) {
				reject(err);
			} else {
				resolve(addresses.sort((a, b) => a.priority - b.priority));
			}
		});
	});
}

export function connectToSmtp(server) {
	return new Promise((resolve, reject) => {
		const socket = net.createConnection(25, server);
		socket.on("connect", () => resolve(socket));
		socket.on("error", (err) => reject(err));
	});
}

export function sendCommand(socket, command, expectedCodes) {
	return new Promise((resolve, reject) => {
		if (command) {
			socket.write(command);
		}

		socket.once("data", (data) => {
			const response = data.toString();
			const responseCode = parseInt(response.substring(0, 3), 10);

			if (
				Array.isArray(expectedCodes) &&
				expectedCodes.includes(responseCode)
			) {
				resolve(response);
			} else if (responseCode === expectedCodes) {
				resolve(response);
			} else {
				reject(new Error(`Unexpected SMTP response: ${response}`));
			}
		});
	});
}
