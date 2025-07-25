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
          model: "utils",
          unique: {
            key_country_code: ["key", "country_code"],
          },
          rows: [
            {
              uuid: "d5fe2e19-1da2-464a-a500-cc35791fdb88",
              key: "TECHNICIAN_SALARY",
              value: 20,
              country_code: "AU",
            },
            {
              uuid: "42e1fa68-9629-41d6-9577-8fa3b2d808d4",
              key: "TECHNICIAN_SALARY",
              value: 20,
              country_code: "UK",
            },
            {
              uuid: "e3535822-41c4-4630-a440-643506d07bc9",
              key: "VAT/GST",
              value: 10,
              country_code: "AU",
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
