"use strict";

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["Data"],
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
        const items = await fastify.prisma.technicians.findMany({
          where: {
            deleted_at: null,
            OR: [
              {
                users: {
                  none: {},
                },
              },
              {
                users: {
                  some: {
                    deleted_at: {
                      not: null,
                    },
                  },
                },
              },
            ],
          },
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
  fastify.get(
    "/wise",
    {
      schema: {
        tags: ["Data"],
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
        const items = await fastify.prisma.technicians.findMany({
          where: {
            deleted_at: null,
          },
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
  fastify.get(
    "/:country_code",
    {
      schema: {
        tags: ["Data"],
      },
      params: {
        type: "object",
        properties: {
          country_code: {
            type: "string",
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
        const items = await fastify.prisma.technicians.findMany({
          where: {
            deleted_at: null,
            country_code: request.params.country_code,
          },
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
