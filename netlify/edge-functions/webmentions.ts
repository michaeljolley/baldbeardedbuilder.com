import { insertMention } from "./scripts/supabase";

const WEBMENTION_IO_SECRET = Deno.env.get("WEBMENTION_IO_SECRET") as string;

function verifySignature(body) {
    if (body.secret !== WEBMENTION_IO_SECRET) {
        throw new Error("Invalid signature");
    }
}

export default async function handler(req: Request) {
	const body = await req.json();

	try {
		verifySignature(body);
	} catch (err) {
		return {
			statusCode: 200,
		};
	}

	await insertMention(body);

	return new Response(JSON.stringify({}), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

