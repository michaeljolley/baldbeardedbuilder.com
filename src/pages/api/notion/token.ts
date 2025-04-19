export const prerender = false;
import type { APIRoute } from "astro";

const notionClientId = import.meta.env.NOTION_CLIENT_ID;
const notionClientSecret = import.meta.env.NOTION_CLIENT_SECRET;
const notionAuthUrl = "https://api.notion.com/v1/oauth/token";

export const GET: APIRoute = async ({ request, redirect }) => {

	const authCode = new URL(request.url).searchParams.get("code");
	const authError = new URL(request.url).searchParams.get("error");

	if (authError) {
		return new Response(`There was a problem authenticating with Notion. Please try again later.\n\n ${authError}`, { status: 500 });
	}

	if (!authCode)
	{
		return new Response(`There was a problem authenticating with Notion. Please try again later. No code found in the response.`, { status: 400 });
	}

	const authData = await getAccessToken(authCode);
	const { access_token, error, error_description } = authData;

	const redirect_uri = `cmdpalnotionext://oauth_redirect_uri/?access_token=${access_token}&error=${error}&error_description=${error_description}`;

	return new Response(`
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Successfully Signed in to Notion</title>
        <style>
            html, body {
                display: flex;
                flex-direction: column;
                gap: 2rem;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                font-family: Arial, Helvetica, sans-serif;
            }
            h1 {
                font-size: 2rem;
                color: #222;
            }
            p {
                font-size: 1.2rem;
                color: #555;
            }
        </style>
    </head>
    <body>
        <h1>You are now logged in!</h1>
        <p>You can now close this window and reopen Command Palette to access your Notion account.</p>
        <script type='text/javascript'>
            window.location.href = '${redirect_uri}';
        </script>
    </body>
    </html>`, {status: 200, headers: { "Content-Type": "text/html" } });

};

const getAccessToken = async (code: string) => {
	const response = await fetch(notionAuthUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"Notion-Version": "2022-06-28",
			"Authorization": `Basic ${btoa(`${notionClientId}:${notionClientSecret}`)}`,
		},
		body: JSON.stringify({
			code,
			grant_type: "authorization_code",
			redirect_uri: "https://baldbeardedbuilder.com/api/notion/token/",
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to get access token: ${await response.text()}`);
	}

	return response.json();
}
