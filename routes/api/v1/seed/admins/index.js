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
          model: "admins",
          unique: "email",
          rows: [
            {
              uuid:'cb60a272-f3f3-481b-8ef9-8d7783ffd321',
              name: "Niroshan Vijayarasa",
              email: "nnirosh448@gmail.com",
              mobile: "+94776287184",
              country_code:'AU'
            },
             {
              uuid:'545b847f-574c-4053-8026-a34104f2e601',
              name: "Logan Peranavan",
              email: "logan@tapestodigital.com.au",
              mobile: "+61433595884",
              country_code:'AU'
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
