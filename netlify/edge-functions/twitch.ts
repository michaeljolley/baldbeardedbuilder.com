import type { Config, Context } from "https://edge.netlify.com/";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";

export default async (request: Request, context: Context) => {
	const response = await context.next();
	const page = await response.text();

	let updatedPage = page;

	try {
		// Search for the placeholder
		const regex = /<!-- TWITCH_STATUS -->/i;

		// Replace the content
		let twitchEmbed = "";

		const isLive = await isLiveOnTwitch();

		if (isLive) {
			twitchEmbed = `<section class="liveOnTwitch">
			<div class="wrapper">
				<aside>
					Live Now
					<img src="/images/screen.svg" alt="Screen" />
				</aside>
				<iframe
					title="Streaming live on Twitch"
						src="https://player.twitch.tv/?channel=baldbeardedbuilder&parent=${Netlify.env.get("HOST")}"
						height="<height>"
						width="<width>"
						loading="lazy"
						allowfullscreen>
				</iframe>
			</div>
		</section>`;
		} else if (new URL(request.url).pathname === "/" || new URL(request.url).pathname === "/404/") {
			twitchEmbed = `<section class="twitchPanel">
			<div class="wrapper">
				<aside>
					<svg
						style="height: 10rem;"
						aria-hidden="true"
						class="fill"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
					>
						<path
							fill="currentColor"
							d="M391.2 103.5H352.5v109.7h38.63zM285 103H246.4V212.8H285zM120.8 0 24.31 91.42V420.6H140.1V512l96.53-91.42h77.25L487.7 256V0zM449.1 237.8l-77.22 73.12H294.6l-67.6 64v-64H140.1V36.58H449.1z"
						></path>
					</svg>
					Catch It Live
				</aside>
				<div class="p">
					<p>Q&amp;A's, how-to's, and plenty of shenanigans. Follow Triple B on <a href="https://twitch.tv/baldbeardedbuilder">Twitch</a> to be notified when he's live.</p>
					<h3>Latest Stream</h3>
					<div class="player">
						<iframe
							title="Latest Stream"
							loading="lazy"
							src="https://player.twitch.tv/?channel=baldbeardedbuilder&parent=${Netlify.env.get("HOST")}"
							allowfullscreen>
						</iframe>
					</div>
				</div>
			</div>
		</section>`;
		}

		updatedPage = page.replace(regex, twitchEmbed);
	} catch (error) {
		console.error(error);
	}
	return new Response(updatedPage, response);
};

const isLiveOnTwitch = async (): Promise<boolean> => {
	const opts = {
		client_id: Netlify.env.get("TWITCH_CLIENT_ID"),
		client_secret: Netlify.env.get("TWITCH_CLIENT_SECRET"),
		grant_type: "client_credentials",
		scopes: "",
	};
	const params = queryString.stringify(opts);

	const authResponse = await fetch(
		`https://id.twitch.tv/oauth2/token?${params}`,
		{
			method: "POST",
		},
	);
	const authBody = await authResponse.text();
	const authData = JSON.parse(authBody);

	const response = await fetch(
		`https://api.twitch.tv/helix/streams?user_login=baldbeardedbuilder`,
		{
			headers: {
				"Client-ID": Netlify.env.get("TWITCH_CLIENT_ID") as string,
				Authorization: `Bearer ${authData.access_token}`,
			},
		},
	);
	const body = await response.text();

	const { data: streams } = JSON.parse(body);

	return streams && streams.length > 0;
};

export const config: Config = {
	path: "/*",
	excludedPath: [
		"/api/*",
		"/*.css",
		"/*.js",
		"/*.svg",
		"/*.png",
		"/*.txt",
		"/*.mjs",
		"/*.tsx",
		"/*.ts",
		"/*.scss",
		"/@vite/*",
		"/site.webmanifest",
		"/*.astro",
		"/fonts/*",
		"/images/*",
	],
};
