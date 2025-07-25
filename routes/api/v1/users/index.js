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
          id: 10,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [{ email: { contains: search, mode: "insensitive" } }],
        };
        const items = await fastify.prisma.users.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            email: true,
            profile_image_url: true,
            is_active: true,
            roles: {
              select: {
                id: true,
                uuid: true,
                name: true,
                account_type: true,
              },
            },
            admins: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
            technicians: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
          },
        });
        const totalCount = await fastify.prisma.users.count({
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
          required: ["account_type", "account_uuid", "role_uuid"],
          properties: {
            account_type: {
              type: "string",
            },
            account_uuid: {
              type: "string",
            },
            role_uuid: {
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
          name: "Create",
        });
        let user = {};

        if (request.body.account_type == "Admin") {
          user = await fastify.prisma.admins.findUnique({
            where: {
              uuid: request.body.account_uuid,
            },
          });
        } else {
          user = await fastify.prisma.technicians.findUnique({
            where: {
              uuid: request.body.account_uuid,
            },
          });
        }

        let data = {
          uuid: uuidv4(),
          email: user.email,
          role_uuid: request.body.role_uuid,
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        };
        let dataUpdate = {
          role_uuid: request.body.role_uuid,
          deleted_at: null,
          modified_at: moment().toISOString(),
        };
        if (request.body.account_type == "Admin") {
          data.admin_uuid = request.body.account_uuid;
        } else {
          data.technician_uuid = request.body.account_uuid;
        }
        let oldUser = await fastify.prisma.users.findUnique({
          where: {
            email: user.email,
          },
        });
        let item = {};
        if (oldUser) {
          item = await fastify.prisma.users.update({
            where: {
              uuid: oldUser.uuid,
            },
            data: dataUpdate,
          });
        } else {
          item = await fastify.prisma.users.create({
            data: data,
          });
        }
        reply.send(item);
        let message = `Create a new user "${user.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "users",
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
          required: ["uuid", "account_type", "account_uuid", "role_uuid"],
          properties: {
            uuid: {
              type: "string",
            },
            account_type: {
              type: "string",
            },
            account_uuid: {
              type: "string",
            },
            role_uuid: {
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
          id: 11,
          name: "Update",
        });

        let user = {};

        if (request.body.account_type == "Admin") {
          user = await fastify.prisma.admins.findUnique({
            where: {
              uuid: request.body.account_uuid,
            },
          });
        } else {
          user = await fastify.prisma.technicians.findUnique({
            where: {
              uuid: request.body.account_uuid,
            },
          });
        }

        let data = {
          email: user.email,
          role_uuid: request.body.role_uuid,
          modified_at: moment().toISOString(),
        };

        const item = await fastify.prisma.users.update({
          where: {
            uuid: request.body.uuid,
          },
          data: data,
        });
        reply.send(item);
        let message = `Update user "${user.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "users",
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
          id: 10,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.users.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            email: true,
            profile_image_url: true,
            is_active: true,
            last_login_at: true,
            created_at: true,
            modified_at: true,
            roles: {
              select: {
                id: true,
                uuid: true,
                name: true,
                account_type: true,
              },
            },
            admins: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
            technicians: {
              select: {
                id: true,
                uuid: true,
                name: true,
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
          id: 12,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.users.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Delete user "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "users",
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
    "/update-calendar-token",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["access_token"],
          properties: {
            access_token: {
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
          name: "General",
        });

        const item = await fastify.prisma.users.update({
          where: {
            uuid: request.user.uuid,
          },
          data: {
            google_calendar_token: request.body.access_token,
            modified_at: moment().toISOString()
          },
        });
        reply.send(item);
        let message = `Update user  calendar token of ${item.email}`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "users",
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
