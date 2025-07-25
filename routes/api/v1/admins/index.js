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
          id: 2,
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
            { name: { contains: search, mode: "insensitive", } },
            { mobile: { contains: search, mode: "insensitive", } },
            { email: { contains: search, mode: "insensitive", } },
          ],
        };
        const items = await fastify.prisma.admins.findMany({
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
            mobile: true,
            country_code: true,
          },
        });
        const totalCount = await fastify.prisma.admins.count({
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

  fastify.post(
    "/new",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name", "email", "mobile", "country_code"],
          properties: {
            name: {
              type: "string",
            },
            email: {
              type: "string",
            },
            mobile: {
              type: "string",
            },
            country_code: {
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
          id: 1,
          name: "Create",
        });
        //  check access end
        const itemOld = await fastify.prisma.admins.findUnique({
          where: {
            email: request.body.email,
          },
        });
        if (itemOld) {
          throw new Error("The email address alredy in our system.");
        }

        const item = await fastify.prisma.admins.create({
          data: {
            uuid: uuidv4(),
            name: request.body.name,
            email: request.body.email,
            mobile: request.body.mobile,
            country_code: request.body.country_code,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Create a new admin "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "admins",
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

  fastify.post(
    "/edit",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid", "name", "email", "mobile", "country_code"],
          properties: {
            uuid: {
              type: "string",
            },
            name: {
              type: "string",
            },
            email: {
              type: "string",
            },
            mobile: {
              type: "string",
            },
            country_code: {
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
          id: 3,
          name: "Update",
        });
        //  check access end
        const itemOld = await fastify.prisma.admins.findUnique({
          where: {
            email: request.body.email,
          },
        });
        if (itemOld && itemOld.uuid != request.body.uuid) {
          throw new Error("The email address alredy in our system.");
        }

        const item = await fastify.prisma.admins.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            name: request.body.name,
            email: request.body.email,
            mobile: request.body.mobile,
            country_code: request.body.country_code,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update admin "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "admins",
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
          id: 2,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.admins.findUnique({
          where: {
            uuid: request.params.uuid,
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

  fastify.post(
    "/delete",
    {
      schema: {
        tags: ["Main"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid"],
          properties: {
            uuid: {
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
          id: 4,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.admins.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Delete admin "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "admins",
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
