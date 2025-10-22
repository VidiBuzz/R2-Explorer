import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppContext } from "../../types";

export class GetObject extends OpenAPIRoute {
	schema = {
		operationId: "get-bucket-object",
		tags: ["Buckets"],
		summary: "Get Object",
		request: {
			params: z.object({
				bucket: z.string(),
				key: z.string().describe("base64 encoded file key"),
			}),
		},
		responses: {
			"200": {
				description: "File binary",
				schema: z.string().openapi({ format: "binary" }),
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucketName = data.params.bucket;
		const bucket = c.env[bucketName] as R2Bucket | undefined;

		if (!bucket) {
			throw new HTTPException(500, {
				message: `Bucket binding not found: ${bucketName}`,
			});
		}

		let filePath;
		try {
			// First try: assume it's base64 encoded
			filePath = decodeURIComponent(escape(atob(data.params.key)));
		} catch (e) {
			try {
				// Second try: maybe it's double-encoded (URL then base64)
				filePath = decodeURIComponent(escape(atob(decodeURIComponent(data.params.key))));
			} catch (e2) {
				// Third try: just URL decode it
				try {
					filePath = decodeURIComponent(data.params.key);
				} catch (e3) {
					// Last resort: use raw key
					filePath = data.params.key;
				}
			}
		}

		const object = await bucket.get(filePath);

		if (object === null) {
			return Response.json({ msg: "Object Not Found" }, { status: 404 });
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("etag", object.httpEtag);
		headers.set(
			"Content-Disposition",
			`attachment; filename="${filePath.split("/").pop()}"`,
		);

		return new Response(object.body, {
			headers,
		});
	}
}
