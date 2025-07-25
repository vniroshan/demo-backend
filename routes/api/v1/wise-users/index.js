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
          id: 39,
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
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        };
        const items = await fastify.prisma.wise_users.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            email: true,
            is_default: true,
            country_code: true,
          },
        });
        const totalCount = await fastify.prisma.wise_users.count({
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
          id: 39,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.wise_users.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          include:{
            technicians: true
          }
        });
        reply.send(item);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/edit",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid", "is_default", "technician_uuid"],
          properties: {
            uuid: {
              type: "string",
            },
            is_default: {
              type: "boolean",
            },
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
          id: 40,
          name: "Update",
        });

        let is_default = request.body.is_default;

        let wise_users = await fastify.prisma.wise_users.findMany({
          where: {
            technician_uuid: request.body.technician_uuid,
          },
        });

        if(wise_users.length == 0){
          is_default = true
        }
        if (is_default) {
          await fastify.prisma.wise_users.updateMany({
            where: {
              technician_uuid: request.body.technician_uuid,
            },
            data: {
              is_default: false,
            },
          });
        }

        const item = await fastify.prisma.wise_users.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            is_default: is_default,
            technician_uuid: request.body.technician_uuid,
             modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update wise user "${user.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "wise_users",
          item.id,
          message
        );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
