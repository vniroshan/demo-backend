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
          model: "countries",
          unique: "code",
          rows: [
            {
              uuid:'d5fe2e19-1da2-464a-a500-cc35791fdb88',
              name: "Australia",
              code: "AU",
              currency: "AUD"
            },
             {
              uuid:'42e1fa68-9629-41d6-9577-8fa3b2d808d4',
              name: "United Kingdom",
              code: "UK",
              currency: "GBP"
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
