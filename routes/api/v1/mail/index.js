"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.post(
    "/send",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["subject", "message", "recipients"],
          properties: {
            subject: {
              type: "string",
            },
            message: {
              type: "string",
            },
            recipients: {
              type: "array",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 0,
          name: "Create",
        });
        await fastify.email.sendSimpleEmail({
          user_uuid:request.user.uuid,
          cc_email: "contact@tapestodigital.com",
          title: request.body.subject,
          message: request.body.message,
          recipients:  request.body.recipients,
        });

        reply.send({message:'Success'});
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
