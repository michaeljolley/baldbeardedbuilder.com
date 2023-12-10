const button = document.querySelector("[data-theme-toggle]")!;
const localStorageTheme = localStorage.getItem("theme");
const systemSettingDark = window.matchMedia("(prefers-color-scheme: dark)");

function calculateSettingAsThemeString(
	localStorageTheme: string | null,
	systemSettingDark: MediaQueryList,
): string {
	if (localStorageTheme !== null) {
		return localStorageTheme;
	}

	if (systemSettingDark.matches) {
		return "dark";
	}

	return "light";
}

function updateThemeOnHtmlEl(theme: string) {
	document.querySelector("html")!.setAttribute("data-theme", theme);
}

let currentThemeSetting = calculateSettingAsThemeString(
	localStorageTheme,
	systemSettingDark,
);

updateThemeOnHtmlEl(currentThemeSetting);

button.addEventListener("click", () => {
	const newTheme = currentThemeSetting === "dark" ? "light" : "dark";
	localStorage.setItem("theme", newTheme);
	updateThemeOnHtmlEl(newTheme);

	currentThemeSetting = newTheme;
});
