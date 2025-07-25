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
          id: 14,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [{ name: { contains: search, mode: "insensitive" } }],
        };
        const items = await fastify.prisma.roles.findMany({
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
            account_type: true,
            _count: {
              select: {
                users: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
            },
          },
        });
        const totalCount = await fastify.prisma.roles.count({
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
          required: ["name", "account_type", "permissionIds"],
          properties: {
            name: {
              type: "string",
            },
            account_type: {
              type: "string",
            },
            permissionIds: {
              type: "array",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 13,
          name: "Create",
        });
        if (request.body.permissionIds.length == 0) {
          throw new Error("The role must have at least one permission.");
        }
        //  check access end
        const itemOld = await fastify.prisma.roles.findUnique({
          where: {
            name: request.body.name,
          },
        });
        if (itemOld) {
          throw new Error("The role name alredy in our system.");
        }

        const item = await fastify.prisma.roles.create({
          data: {
            uuid: uuidv4(),
            name: request.body.name,
            account_type: request.body.account_type,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        for (let i = 0; i < request.body.permissionIds.length; i++) {
          await fastify.prisma.role_permissions.create({
            data: {
              role_uuid: item.uuid,
              permission_id: request.body.permissionIds[i],
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            },
          });
        }
        reply.send(item);
        let message = `Create a new role "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "roles",
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
          required: ["uuid", "name", "account_type", "permissionIds"],
          properties: {
            uuid: {
              type: "string",
            },
            name: {
              type: "string",
            },
            account_type: {
              type: "string",
            },
            permissionIds: {
              type: "array",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 16,
          name: "Update",
        });
        if (request.body.permissionIds.length == 0) {
          throw new Error("The role must have at least one permission.");
        }
        //  check access end
        const itemOld = await fastify.prisma.roles.findUnique({
          where: {
            name: request.body.name,
          },
        });
        if (itemOld && itemOld.uuid != request.body.uuid) {
          throw new Error("The role name alredy in our system.");
        }

        const item = await fastify.prisma.roles.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            name: request.body.name,
            account_type: request.body.account_type,
            modified_at: moment().toISOString(),
          },
        });
        await fastify.prisma.role_permissions.deleteMany({
          where: {
            role_uuid: item.uuid,
          },
        });
        for (let i = 0; i < request.body.permissionIds.length; i++) {
          await fastify.prisma.role_permissions.create({
            data: {
              role_uuid: item.uuid,
              permission_id: request.body.permissionIds[i],
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            },
          });
        }
        reply.send(item);
        let message = `Update role "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "roles",
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
          id: 17,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.roles.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            account_type: true,
            created_at: true,
            modified_at: true,
            _count: {
              select: {
                users: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
            },
          },
        });

        const items = await fastify.prisma.models.findMany({
          where: { deleted_at: null },
          orderBy: { name: "asc" },
          select: {
            id: true,
            key: true,
            name: true,
            permissions: {
              select: {
                id: true,
                name: true,
                description: true,
                role_permissions: {
                  where: {
                    role_uuid: item.uuid,
                  },
                  select: { role_uuid: true },
                },
              },
            },
          },
        });
        const enriched = items.map((model) => ({
          ...model,
          permissions: model.permissions.map((p) => ({
            ...p,
            isChecked: p.role_permissions.length > 0,
          })),
        }));
        item.permissions = enriched;
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
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid", "new_role_uuid"],
          properties: {
            uuid: {
              type: "string",
            },
            new_role_uuid: {
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
          id: 18,
          name: "Delete",
        });
        //  check access end

        await fastify.prisma.users.updateMany({
          where: {
            role_uuid: request.body.uuid,
          },
          data: {
            role_uuid: request.body.new_role_uuid,
            modified_at: moment().toISOString(),
          },
        });

        const item = await fastify.prisma.roles.delete({
          where: {
            uuid: request.body.uuid,
          },
        });

        reply.send(item);
        let message = `Delete country "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "roles",
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
