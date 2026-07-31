import { URLSearchParams } from "url";

const getAccessToken = async (): Promise<string> => {
	const opts = {
		client_id: import.meta.env["TWITCH_CLIENT_ID"],
		client_secret: import.meta.env["TWITCH_CLIENT_SECRET"],
		grant_type: "client_credentials",
		scopes: "",
	};

	const params = new URLSearchParams(opts).toString();

	const authResponse = await fetch(
		`https://id.twitch.tv/oauth2/token?${params}`,
		{
			method: "POST",
		},
	);
	const authBody = await authResponse.text();
	const authData = JSON.parse(authBody);
	return authData.access_token;
};

const getHeaders = async (): Promise<Headers> => {
	const accessToken = await getAccessToken();

	return {
		"Client-ID": import.meta.env["TWITCH_CLIENT_ID"] as string,
		Authorization: `Bearer ${accessToken}`,
	};
};

export async function getLastStream(): Promise<{
	lastStreamUrl: string;
	lastThumbnail: string;
	lastStreamTitle: string;
	lastStreamDuration: string;
	lastStreamDate: string;
}> {
	const headers = await getHeaders();
	const vidResponse = await fetch(
		`https://api.twitch.tv/helix/videos?user_id=279965339&sort=time`,
		{
			headers,
		},
	);
	const vidBody = await vidResponse.text();
	const { data: videos } = JSON.parse(vidBody);
	const latest = Array.isArray(videos) && videos.length > 0 ? videos[0] : null;

	// Every one of these guards existed except the URL, which meant an empty or errored
	// Twitch response took the whole site build down rather than just hiding one panel.
	let lastThumbnail = latest ? latest.thumbnail_url : "";
	lastThumbnail = lastThumbnail
		.replace("%{width}", "960")
		.replace("%{height}", "540");

	const lastStreamUrl = latest
		? `https://www.twitch.tv/videos/${latest.id}`
		: "https://www.twitch.tv/baldbeardedbuilder";
	const lastStreamTitle = latest ? latest.title : "";
	const lastStreamDuration = latest ? latest.duration : "";
	const lastStreamDate = latest ? latest.created_at : "";

	return {
		lastStreamUrl,
		lastThumbnail,
		lastStreamTitle,
		lastStreamDuration,
		lastStreamDate,
	};
}

export async function isOnline(): Promise<{
	isLive: boolean;
	liveThumbnail?: string;
	liveTitle?: string;
}> {
	const headers = await getHeaders();
	const response = await fetch(
		`https://api.twitch.tv/helix/streams?user_login=baldbeardedbuilder`,
		{
			headers,
		},
	);
	const body = await response.text();
	const { data: streams } = JSON.parse(body);

	const isLive = streams && streams.length > 0;
	let liveThumbnail = isLive ? streams[0].thumbnail_url : undefined;
	if (liveThumbnail) {
		liveThumbnail = liveThumbnail.replace("{width}", "960").replace("{height}", "540");
	}
	const liveTitle = isLive ? streams[0].title : undefined;

	return {
		isLive,
		liveThumbnail,
		liveTitle,
	};
}
