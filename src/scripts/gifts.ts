import tippy from "tippy.js";

document.addEventListener("DOMContentLoaded", () => {

	tippy("ul.gifts li", {allowHTML:true});

	document.querySelectorAll("ul.ranks li").forEach((a) => {
		a.addEventListener("click", (e: Event) => {
			e.preventDefault();

			const buttons = document.querySelectorAll("ul.ranks li");
			buttons.forEach((button) => {
				button.removeAttribute("class");
			});

			a.setAttribute("class", "active");
			const rank = a.getAttribute("data-rank");

			const gifts = document.querySelectorAll("ul.gifts li");
			gifts.forEach((gift) => {
				const ranks = gift.getAttribute("data-prize")!.split(",");
				gift.removeAttribute("class");
				if (ranks.includes(rank!)) {
					gift.setAttribute("class", "active");
				}
			});
		});
	});
});
