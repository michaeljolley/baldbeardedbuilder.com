import tippy from 'tippy.js';

function copyLink(el: HTMLAnchorElement) {
	const id = el.href;
	const url = window.location.href.replace(window.location.hash, '');
	navigator.clipboard.writeText(el.href);
}

document.addEventListener("DOMContentLoaded", (event) => {
	document.querySelectorAll("a.autolink-header").forEach((a) => {

		const t = tippy(a, {
			arrow: true,
			placement: "top",
		});

		a.addEventListener("click", (e: Event) => {
			e.preventDefault();
			t.setContent("Copied!");
			t.show();
			copyLink(a as HTMLAnchorElement);
			setTimeout(() => {
				t.setContent("Copy link");
			}, 1000);
		});
	});
});
