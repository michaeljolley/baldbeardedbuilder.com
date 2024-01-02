import type { Analytic } from "../types/analytics";
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
			host: window.location.host,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			path: window.location.pathname,
			xy: screensize(),
			session: session(),
			utm_campaign: utm_campaign ? utm_campaign : undefined,
			utm_medium: utm_medium ? utm_medium : undefined,
			utm_source: utm_source ? utm_source : undefined,
		};

		fetch(path(), {
			method: "POST",
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
		return `/api/hiya`;
	}

	function session() {
		let bwmSess = document.cookie
			.split("; ")
			.find((row) => row.startsWith("bwm="))
			?.split("=")[1];
		if (!bwmSess) {
			bwmSess = uuidv4();
		}
		document.cookie = `bwm=${bwmSess}; expires=${exp()};`;
		return bwmSess;
	}

	function uuidv4(): string {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (<any>[1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
			/[018]/g,
			(c: number) =>
				(
					c ^
					(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
				).toString(16),
		);
	}

	function exp() {
		return new Date(new Date().getTime() + 300000).toUTCString();
	}

	page();
})();
