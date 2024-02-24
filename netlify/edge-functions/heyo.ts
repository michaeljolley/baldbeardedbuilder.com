import type { Config } from "https://edge.netlify.com/";
import type { Analytic } from "./types/analytic.ts";
import { updateAnalytic } from "./scripts/supabase.ts";

export default async function handler(req: Request) {
	const analytic: Analytic = await req.json();

	if (!analytic) {
		return new Response(JSON.stringify({}), {
			status: 400,

			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	await updateAnalytic(analytic);

	return new Response(JSON.stringify({}), {
		status: 200,

		headers: {
			"Content-Type": "application/json",
		},
	});
}

export const config: Config = {
	path: "/api/heyo",
};
