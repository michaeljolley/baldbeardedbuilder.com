import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
	
  const data = await request.formData();

	const bot = data.get("bot-field");
	const first_name = data.get("firstName");
	const email = data.get("email");

	if (!bot && first_name && email) {

		const body = {
			first_name,
			email
		}

		await fetch("https://api.convertkit.com/v3/forms/5311675/subscribe", {
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
