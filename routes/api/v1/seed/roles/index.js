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
          model: "roles",
          unique: "uuid",
          rows: [
            {
              uuid:'a023fc9a-a6c8-4f32-9285-bc1b7706c570',
              account_type:'Admin',
              name: "Admin",
            },
            {
              uuid:'32af5eb3-6bc1-4be8-bb97-532412ca9179',
              account_type:'Technician',
              name: "Technician",
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
