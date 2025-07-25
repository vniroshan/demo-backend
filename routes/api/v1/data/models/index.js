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
        const items = await fastify.prisma.models.findMany({
          where: {
             deleted_at: null,
          },
          orderBy:{
            name:'asc'
          },
          select: {
            id: true,
            key: true,
            name:true,
            permissions:{
              select:{
                id: true,
                name: true,
                description: true
              }
            }
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
