import { supabase } from "./supabase";

export const authData = async (cookies: any) => {

	const accessToken = cookies.get("sb-access-token");
	const refreshToken = cookies.get("sb-refresh-token");
	
	if (!accessToken || !refreshToken) {
		return null;
	}
	
	let session;
	try {
		session = await supabase.auth.setSession({
			refresh_token: refreshToken.value,
			access_token: accessToken.value,
		});
		if (session.error) {
			cookies.delete("sb-access-token", {
				path: "/",
			});
			cookies.delete("sb-refresh-token", {
				path: "/",
			});
			return null;
		}
	} catch (error) {
		cookies.delete("sb-access-token", {
			path: "/",
		});
		cookies.delete("sb-refresh-token", {
			path: "/",
		});
		return null;
	}
	
	const id = session.data.user?.id;
	const nickname = session.data.user?.user_metadata.nickname;
	const user_id = session.data.user?.user_metadata.provider_id;
	const profileImg = session.data.user?.user_metadata.avatar_url;
	
	return {
		id,
		user_id,
		nickname,
		profileImg
	};
}
