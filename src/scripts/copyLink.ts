import tippy from 'tippy.js';

function copyLink(el: HTMLAnchorElement) {
	const id = el.href;
	const url = window.location.href.replace(window.location.hash, '');
	navigator.clipboard.writeText(el.href);
}

document.addEventListener("DOMContentLoaded", (event) => {
	document.querySelectorAll("a.autolink-header").forEach((a) => {
		a.addEventListener("click", (e: Event) => {
			e.preventDefault();
			copyLink(a as HTMLAnchorElement);

			const t = tippy(a, {
				arrow: true,
				placement: "top",
				content: "Copied"
			});
			t.show();
			setTimeout(() => {
				t.hide();
			}, 1500);
		});
	});
});
