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
          id: 50,
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
            { author_name: { contains: search, mode: "insensitive", } },
            { text: { contains: search, mode: "insensitive", } },
          ],
        };
        const items = await fastify.prisma.google_reviews.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            author_name: "asc",
          },
          select: {
            id: true,
            uuid: true,
            author_name: true,
            rating: true,
            text: true,
            relative_time_description: true,
            profile_image_url: true,
            locations:{
              select:{
                id: true,
                uuid: true,
                name: true
              }
            }
          },
        });
        const totalCount = await fastify.prisma.google_reviews.count({
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
          required: ["location_uuid","author_name", "rating", "text", "relative_time_description"],
          properties: {
            location_uuid: {
              type: "string",
            },
            author_name: {
              type: "string",
            },
            rating: {
              type: "number",
            },
            text: {
              type: "string",
            },
             relative_time_description: {
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
          id: 48,
          name: "Create",
        });
        //  check access end
 
        const item = await fastify.prisma.google_reviews.create({
          data: {
            uuid: uuidv4(),
            author_name: request.body.author_name,
            rating: request.body.rating,
            text: request.body.text,
            location_uuid: request.body.location_uuid,
            relative_time_description: request.body.relative_time_description,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Create a new review "${item.author_name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "google_reviews",
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
          required: ["uuid", "location_uuid","author_name", "rating", "text", "relative_time_description"],
          properties: {
            uuid: {
              type: "string",
            },
            location_uuid: {
              type: "string",
            },
            author_name: {
              type: "string",
            },
            rating: {
              type: "number",
            },
            text: {
              type: "string",
            },
             relative_time_description: {
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
          id: 51,
          name: "Update",
        });
        //  check access end

        const item = await fastify.prisma.google_reviews.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            author_name: request.body.author_name,
            rating: request.body.rating,
            text: request.body.text,
            location_uuid: request.body.location_uuid,
            relative_time_description: request.body.relative_time_description,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update review "${item.author_name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "google_reviews",
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
          id: 50,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.google_reviews.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          include:{
            locations: true
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
          id: 52,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.google_reviews.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Delete review "${item.author_name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "google_reviews",
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
