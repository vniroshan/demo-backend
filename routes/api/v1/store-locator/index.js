"use strict";

module.exports = async function (fastify, opts) {
  fastify.get(
    "/:country_code",
    {
      schema: {
        tags: ["Main"],
        params: {
          type: "object",
          properties: {
            country_code: {
              type: "string",
              default: "AU",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const items = await fastify.prisma.locations.findMany({
          where: {
             deleted_at: null,
             country_code: request.params.country_code
          },
          orderBy: {
            name: "asc",
          },
       
        });
        var res = {};
        res.locations = items;
        reply.send(res);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
