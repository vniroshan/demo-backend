"use strict";

const fp = require("fastify-plugin");
const { Storage } = require("@google-cloud/storage");
const moment = require("moment");
const path = require("path");

module.exports = fp(async function (fastify, opts) {
  const GCS_PROJECT_ID = fastify.config.GOOGLE_PROJECT_ID;
  const GCS_BUCKET_NAME = fastify.config.GOOGLE_BUCKET_NAME;
  const GCS_KEYFILE = path.resolve(__dirname, 'tapes_to_digital_main.json') // path to service-account.json
  const SPACE_DIR = fastify.config.SPACE_DIR;

  const storage = new Storage({
    projectId: GCS_PROJECT_ID,
    keyFilename: path.resolve(GCS_KEYFILE),
  });

  const bucket = storage.bucket(GCS_BUCKET_NAME);

  fastify.decorate("getPresignedUrl", async (type, modelName) => {
    const ext = type.split("/")[1] || "bin";
    const fileName = `${SPACE_DIR}/${modelName}/${moment().format("x")}.${ext}`;
    const file = bucket.file(fileName);

    const options = {
      version: "v4",
      action: "write",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: type,
    };

    const [uploadUrl] = await file.getSignedUrl(options);
    const downloadUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${fileName}`;

    return {
      uploadUrl,
      downloadUrl,
      fileKey: fileName,
    };
  });
});
