import type { Analytic } from "netlify/edge-functions/types/analytic";

declare global {
	interface Window {
		bwm: string;
	}
}

(function () {
	function page() {
		send();
	}

	function send() {
		const searchParams = new URL(window.location.href).searchParams;
		const utm_campaign = searchParams.get("utm_campaign");
		const utm_medium = searchParams.get("utm_medium");
		const utm_source = searchParams.get("utm_source");

		const param: Analytic = {
			id: window.bwm,
			host: window.location.host,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			path: window.location.pathname,
			xy: screensize(),
			utm_campaign: utm_campaign ? utm_campaign : undefined,
			utm_medium: utm_medium ? utm_medium : undefined,
			utm_source: utm_source ? utm_source : undefined,
		};

		fetch(path(), {
			method: "post",
			mode: "no-cors",
			body: JSON.stringify(param),
		}).catch((err) => console.log("Error:", err));
	}

	function screensize() {
		const w = window.screen.width;
		const h = window.screen.height;
		return `${Math.round(w / 100) * 100}x${Math.round(h / 100) * 100}`;
	}

	function path(): string {
		return `${window.location.protocol}//${window.location.host}/api/heyo`;
	}

	page();
})();
