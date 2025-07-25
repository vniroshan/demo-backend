"use strict";

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["Data"],
        query: {
          type: "object",
          properties: {
            technician_uuid: {
              type: "string",
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
          name: "Read",
        });
        //  check access end
        let where = {
          deleted_at: null,
          technician_orders: {
            some: {
              status: {
                not: "completed",
              },
            },
          },
        };
        if (request.query.technician_uuid) {
          where.technician_uuid = request.query.technician_uuid;
        }
        const items = await fastify.prisma.deals.findMany({
          where: where,
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        });
        reply.send(items);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
