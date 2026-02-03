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

	let lastThumbnail =
		videos && videos.length > 0 ? videos[0].thumbnail_url : "";
	lastThumbnail = lastThumbnail
		.replace("%{width}", "960")
		.replace("%{height}", "540");

	const lastStreamUrl = `https://www.twitch.tv/videos/${videos[0].id}`;
	const lastStreamTitle = videos && videos.length > 0 ? videos[0].title : "";
	const lastStreamDuration = videos && videos.length > 0 ? videos[0].duration : "";
	const lastStreamDate = videos && videos.length > 0 ? videos[0].created_at : "";

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
