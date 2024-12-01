export const prerender = false;
import type { APIRoute } from "astro";
import { registerSub } from "../../../lib/supabase";
import { authData } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {

	const authedUser = await authData(cookies);
		
	if (!authedUser) {
		return redirect("/gifting/#gift-me?bad-auth=1");
	}

	const form = await request.formData();

	const bot = form.get("bot-field");

	if (bot && bot.toString().length > 0) {
		return redirect("/gifting/#gift-me?bad-auth=2");
	}

	const userId = form.get("id");
	const user = form.get("user");
	const firstName = form.get("firstName");
	const lastName = form.get("lastName");
	const email = form.get("email");
	const address = form.get("address");
	const city = form.get("city");
	const state = form.get("state");
	const zip = form.get("zip");
	const tshirt = form.get("tshirt");

	await registerSub({
		userId,
		user,
		firstName,
		lastName,
		email,
		address,
		city,
		state,
		zip,
		tshirt,
	});

  return redirect("/gifting/#gift-me");
};


