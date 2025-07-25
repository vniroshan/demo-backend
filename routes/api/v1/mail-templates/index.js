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
          id: 64,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          technician_uuid: request.user.technician_uuid,
        };
        const items = await fastify.prisma.technician_mail_templates.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            body: true,
            is_default: true,
          },
        });
        const totalCount = await fastify.prisma.technician_mail_templates.count(
          {
            where: where,
          }
        );

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
          id: 64,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.technician_mail_templates.findUnique({
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
    "/new",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["body", "is_default"],
          properties: {
            body: {
              type: "string",
            },
            is_default: {
              type: "boolean",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 63,
          name: "Create",
        });
        // Check if user is trying to unset default from a currently default template
        if (!request.body.is_default) {
          // Count how many default templates exist for this technician
          const defaultCount =
            await fastify.prisma.technician_mail_templates.count({
              where: {
                technician_uuid: request.user.technician_uuid,
                is_default: true,
              },
            });

          // If this is the only default template, don't allow unsetting it
          if (defaultCount != 1) {
            throw new Error("At least one default mail template is required.")
          }
        }
        if (request.body.is_default) {
          await fastify.prisma.technician_mail_templates.updateMany({
            where: {
              technician_uuid: request.user.technician_uuid,
            },
            data: {
              is_default: false,
            },
          });
        }

        const item = await fastify.prisma.technician_mail_templates.create({
          data: {
            uuid: uuidv4(),
            technician_uuid: request.user.technician_uuid,
            body: request.body.body,
            is_default: request.body.is_default,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });

        reply.send(item);
        let message = `Create a new template "${item.uuid}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "technician_mail_templates",
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
          required: ["uuid", "body", "is_default"],
          properties: {
            body: {
              type: "string",
            },
            uuid: {
              type: "string",
            },
            is_default: {
              type: "boolean",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 65,
          name: "Update",
        });

        // Get the current template being edited
        const currentTemplate =
          await fastify.prisma.technician_mail_templates.findUnique({
            where: {
              uuid: request.body.uuid,
            },
          });

        // Check if user is trying to unset default from a currently default template
        if (currentTemplate.is_default && !request.body.is_default) {
          // Count how many default templates exist for this technician
          const defaultCount =
            await fastify.prisma.technician_mail_templates.count({
              where: {
                technician_uuid: request.user.technician_uuid,
                is_default: true,
              },
            });

          // If this is the only default template, don't allow unsetting it
          if (defaultCount === 1) {
            throw new Error("Cannot remove default status. At least one default mail template is required.")
          }
        }

        // If setting as default, remove default from all other templates
        if (request.body.is_default) {
          await fastify.prisma.technician_mail_templates.updateMany({
            where: {
              technician_uuid: request.user.technician_uuid,
            },
            data: {
              is_default: false,
            },
          });
        }

        const item = await fastify.prisma.technician_mail_templates.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            body: request.body.body,
            is_default: request.body.is_default,
            modified_at: moment().toISOString(),
          },
        });

        reply.send(item);
        let message = `Update template "${item.uuid}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Update",
          "technician_mail_templates",
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
    "/delete",
    {
      schema: {
        tags: ["User"],
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
          id: 66,
          name: "Delete",
        });

        const item = await fastify.prisma.technician_mail_templates.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            is_default: false,
            deleted_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });

        reply.send(item);
        let message = `Delete template "${item.uuid}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "technician_mail_templates",
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
