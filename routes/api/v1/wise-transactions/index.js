"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        query: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              default: 1,
            },
            limit: {
              type: "integer",
              default: 10,
            },
            search: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 41,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [
            { wise_transfer_id: { contains: search, mode: "insensitive" } },
          ],
        };
        const items = await fastify.prisma.wise_transactions.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "asc",
          },
          select: {
            id: true,
            uuid: true,
            amount: true,
            currency: true,
            status: true,
            technicians: {
              select:{
                id: true,
                uuid: true,
                name: true,
              }
            },
          },
        });
        const totalCount = await fastify.prisma.wise_transactions.count({
          where: where,
        });

        const totalPages = Math.ceil(totalCount / limit);

        var res = {};
        res.page = page;
        res.limit = limit;
        res.totalPages = totalPages;
        res.totalCount = totalCount;
        res.data = items;
        reply.send(res);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.get(
    "/:uuid",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 41,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.wise_transactions.findUnique({
          where: {
            uuid: request.params.uuid,
          },
           select: {
            id: true,
            uuid: true,
            amount: true,
            currency: true,
            status: true,
            wise_transfer_id: true,
            reference: true,
            created_at: true,
            modified_at: true,
            technicians: {
              select:{
                id: true,
                uuid: true,
                name: true,
              }
            },
          },
        });
        reply.send(item);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
