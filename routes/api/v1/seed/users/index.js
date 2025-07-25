"use strict";

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["Seed"],
      },
    },
    async (request, reply) => {
      try {
        const data = {
          model: "users",
          unique: "email",
          rows: [
            {
              uuid:'cb60a272-f3f3-481b-8ef9-8d7783ffd321',
              email: "nnirosh448@gmail.com",
              admin_uuid:'cb60a272-f3f3-481b-8ef9-8d7783ffd321',
              role_uuid:'a023fc9a-a6c8-4f32-9285-bc1b7706c570',
            },
             {
              uuid:'545b847f-574c-4053-8026-a34104f2e601',
              email: "logan@tapestodigital.com.au",
              admin_uuid:'545b847f-574c-4053-8026-a34104f2e601',
              role_uuid:'a023fc9a-a6c8-4f32-9285-bc1b7706c570',
            },
          ],
        };
        const resp = await fastify.seed.create(data);
        reply.send(resp);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
