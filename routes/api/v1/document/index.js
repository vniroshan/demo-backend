"use strict";
const moment = require("moment");
const fastifyMultipart = require("fastify-multipart");

module.exports = async function (fastify, opts) {
  await fastify.register(fastifyMultipart);
  //BOC:[upload]
  fastify.get(
    "/upload",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        query: {
          type: "object",
          properties: {
            type: { type: "string", default: "image/png" },
            model_name: { type: "string", default: "products" },
          },
          required: ["type", "model_name"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { type, model_name } = request.query;
        const urls = await fastify.getPresignedUrl(type, model_name);
       
        reply.send(urls);
      } catch (error) {
        reply.send(error);
      }
    }
  );
};
