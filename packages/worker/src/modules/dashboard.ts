import type { AppContext } from "../types";

export async function dashboardIndex(c: AppContext) {
	if (c.env.ASSETS === undefined) {
		return c.text(
			"ASSETS binding is not defined, learn more here: https://r2explorer.com/guides/migrating-to-1.1/",
			500,
		);
	}

	// Serve the dashboard index.html from ASSETS
	const url = new URL(c.req.url);
	return c.env.ASSETS.fetch(new Request(url.origin + "/index.html"));
}

export async function dashboardRedirect(c: AppContext, next) {
	if (c.env.ASSETS === undefined) {
		return c.text(
			"ASSETS binding is not defined, learn more here: https://r2explorer.com/guides/migrating-to-1.1/",
			500,
		);
	}

	const url = new URL(c.req.url);

	if (!url.pathname.includes(".")) {
		return c.env.ASSETS.fetch(new Request(url.origin));
	}

	await next();
}
