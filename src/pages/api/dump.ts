import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
	
  const data = await request.formData();

	const bot = data.get("bot-field");
	const first_name = data.get("firstName");
	const email = data.get("email");
	const api_key = import.meta.env.CONVERTKIT_API_KEY;

	if ((!bot || bot.toString().length > 0) && first_name && email) {

		const body = {
			api_key,
			first_name,
			email
		}

		const response = await fetch("https://api.convertkit.com/v3/forms/5311675/subscribe", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(body)
		});
	}

	return Response.redirect("http://baldbeardedbuilder.com/brain-dump/thanks/", 301);
}
