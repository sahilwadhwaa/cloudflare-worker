/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { build_url, create_origin, has_trailing_slash, Matcher } from "./helpers";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { origin, hostname, pathname, search } = new URL(request.url);
		console.log(request.url, pathname,hostname, "request.url")
		const main_origin = create_origin(env.DOMAIN);

		const paths = pathname.split('/').filter(Boolean);

		const matcher = new Matcher(env.SUBDOMAINS);

		// Handle asset rewriting
		if (hostname === env.DOMAIN) {
			console.log("if rnannn")
			// Rewrite requests for static assets to app.example.com
			if (pathname.includes('_next') || pathname.includes('/static/') || pathname.includes('/images/')) {
				let asset_url = request.url.replace(env.DOMAIN, `app.${env.DOMAIN}`);
				console.log(asset_url, "asset url before removing '/app/'");
		
				// Remove '/app/' from the URL if it is present
				if (pathname.includes('/images/') && pathname.includes('/app/')) {
					asset_url = asset_url.replace('/app/', '/'); // Remove '/app/' from the URL
					console.log(asset_url, "asset url after removing '/app/'");
				}
		
				return fetch(asset_url);
			}
		}
		// Handle trailing slashes
		if (paths.length && has_trailing_slash(pathname)) {
			const redirect_url = build_url([origin, paths], search);

			return Response.redirect(redirect_url, 301);
		}

		// Path matches reverse proxied subdomain
		const match = matcher.path_to_subdomain(paths);
		console.log(match, paths, "match 2")
		if (match) {
			console.log("matcher.path_to_subdomain(paths);")
			const { subdomain, wildcard_paths } = match;
			const target_origin = create_origin(`${subdomain}.${env.DOMAIN}`);
			console.log(target_origin, "target_origin")
			const target_url = build_url([target_origin, wildcard_paths], search);
			console.log(target_url, "target_url")
			const response = await fetch(target_url);
			console.log(response, "response")

			// Serve the content directly, maintaining the current URL
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});
			//return response;
		}
		/* if(paths.includes("_next")){

		} */
		console.log("modified reuqest yoo")
		return fetch(request);
	},
} satisfies ExportedHandler<Env>;
