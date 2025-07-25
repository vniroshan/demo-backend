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
            account_type: {
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
          deleted_at:null,
        } 
        if(request.query.account_type){
          where.account_type = request.query.account_type 
        }
        const items = await fastify.prisma.roles.findMany({
          where: where,
          orderBy:{
            name:'asc'
          },
          select: {
            id: true,
            uuid: true,
            name:true,
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
