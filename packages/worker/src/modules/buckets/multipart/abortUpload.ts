import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../../types";

export class AbortUpload extends OpenAPIRoute {
	schema = {
		operationId: "post-multipart-abort-upload",
		tags: ["Multipart"],
		summary: "Abort upload",
		request: {
			params: z.object({
				bucket: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							uploadId: z.string(),
							key: z.string().describe("base64 encoded file key"),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucket = c.env[data.params.bucket];

		const uploadId = data.body.uploadId;
		const key = decodeURIComponent(escape(atob(data.body.key)));

		const multipartUpload = bucket.resumeMultipartUpload(key, uploadId);

		try {
			await multipartUpload.abort();

			return {
				success: true,
				message: "Upload aborted successfully",
			};
		} catch (error: any) {
			return Response.json({ msg: error.message }, { status: 400 });
		}
	}
}
