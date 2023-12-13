import tippy from "tippy.js";

function copyLink(el: HTMLAnchorElement) {}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll("a.autolink-header").forEach((a) => {
		a.addEventListener("click", (e: Event) => {
			e.preventDefault();
			navigator.clipboard.writeText((a as HTMLAnchorElement).href);
			const t = tippy(a, {
				arrow: true,
				placement: "top",
				content: "Copied",
			});
			t.show();
			setTimeout(() => {
				t.hide();
			}, 1500);
		});
	});
});
