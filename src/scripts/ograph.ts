export function getOgraphURL(title: string, subtitle?: string) {

	const encodedTitle = encodeURI(title.replaceAll(",", "%2C").replaceAll("#", "%23"));
	let subheadLayer = '';

	if (subtitle) {
		const encodedSubTitle = encodeURI(subtitle.replaceAll(",", "%2C").replaceAll(/(#)/g, "%23"));
		subheadLayer = `/g_south_west,x_50,y_100,w_1000,c_fit,co_%23444444,l_text:Poppins_36_line_spacing_-20:${encodedSubTitle}`;
	}
	
	const ograph = `https://res.cloudinary.com/dk3rdh3yo/image/upload/g_south_west,x_50,y_175,w_1000,c_fit,co_white,l_text:Poppins_56_line_spacing_-20:${encodedTitle}${subheadLayer}/q_auto,f_auto/v1/website-assets/1200x630`;
	return ograph;
}
