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
          id: 6,
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
            { mobile: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        };
        const items = await fastify.prisma.technicians.findMany({
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
            deal_map_name: true,
            country_code: true,
          },
        });
        const totalCount = await fastify.prisma.technicians.count({
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
          id: 5,
          name: "Create",
        });
        //  check access end
        const itemOld = await fastify.prisma.technicians.findUnique({
          where: {
            email: request.body.email,
          },
        });
        if (itemOld) {
          throw new Error("The email address alredy in our system.");
        }

        const item = await fastify.prisma.technicians.create({
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
        let message = `Create a new technician "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "technicians",
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
          required: [
            "uuid",
            "deal_map_name",
            "name",
            "email",
            "mobile",
            "country_code",
            "google_group_link"
          ],
          properties: {
            uuid: {
              type: "string",
            },
            name: {
              type: "string",
            },
            deal_map_name: {
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
             google_group_link: {
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
          id: 7,
          name: "Update",
        });
        //  check access end
        const itemOld = await fastify.prisma.technicians.findUnique({
          where: {
            email: request.body.email,
          },
        });
        if (itemOld && itemOld.uuid != request.body.uuid) {
          throw new Error("The email address alredy in our system.");
        }

        const item = await fastify.prisma.technicians.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            name: request.body.name,
            email: request.body.email,
            deal_map_name: request.body.deal_map_name,
            mobile: request.body.mobile,
            country_code: request.body.country_code,
            google_group_link: request.body.google_group_link,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update technician "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "technicians",
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
          id: 6,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.technicians.findUnique({
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
          id: 8,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.technicians.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Delete technician "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "technicians",
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
