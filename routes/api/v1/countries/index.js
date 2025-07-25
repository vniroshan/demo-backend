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
          id: 20,
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
            { code: { contains: search, mode: "insensitive" } },
          ],
        };
        const items = await fastify.prisma.countries.findMany({
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
            code: true,
            currency: true,
            _count: {
              select: {
                technicians: {
                  where: {
                    deleted_at: null,
                  },
                },
                admins: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
            },
          },
        });
        const totalCount = await fastify.prisma.countries.count({
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
          required: ["name", "code", "currency"],
          properties: {
            name: {
              type: "string",
            },
            code: {
              type: "string",
            },
            currency: {
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
          id: 19,
          name: "Create",
        });
        //  check access end
        const itemOld = await fastify.prisma.countries.findUnique({
          where: {
            code: request.body.code,
          },
        });
        if (itemOld) {
          throw new Error("The country alredy in our system.");
        }

        const item = await fastify.prisma.countries.create({
          data: {
            uuid: uuidv4(),
            name: request.body.name,
            code: request.body.code,
            currency: request.body.currency,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Create a new country "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "countries",
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
          id: 20,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.countries.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            code: true,
            currency: true,
            created_at: true,
            modified_at: true,
            _count: {
              select: {
                technicians: {
                  where: {
                    deleted_at: null,
                  },
                },
                admins: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
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
          id: 21,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.countries.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });

        const admins = await fastify.prisma.admins.findMany({
          where: { country_code: item.code },
          select: { uuid: true },
        });
        const adminIds = admins.map((a) => a.uuid);

        const technicians = await fastify.prisma.technicians.findMany({
          where: { country_code: item.code },
          select: { uuid: true },
        });
        const technicianIds = technicians.map((t) => t.uuid);

        await fastify.prisma.users.updateMany({
          where: {
            OR: [
              { admin_uuid: { in: adminIds } },
              { technician_uuid: { in: technicianIds } },
            ],
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });

        await fastify.prisma.admins.updateMany({
          where: {
            country_code: item.code,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        await fastify.prisma.technicians.updateMany({
          where: {
            country_code: item.code,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });

        reply.send(item);
        let message = `Delete country "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "countries",
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
