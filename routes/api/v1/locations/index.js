"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

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
          id: 27,
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
            { country_code: { contains: search, mode: "insensitive" } },
          ],
        };
        const items = await fastify.prisma.locations.findMany({
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
            slug: true,
            email: true,
            mobile: true,
            address: true,
            country_code: true,
            logo: true,
            technicians: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
          },
        });
        const totalCount = await fastify.prisma.locations.count({
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
          required: [
            "name",
            "email",
            "mobile",
            "country_code",
            "address",
            "open_days",
            "coor_lat",
            "coor_long",
          ],
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
            address: {
              type: "string",
            },
            open_days: {
              type: "string",
            },
            coor_lat: {
              type: "string",
            },
            coor_long: {
              type: "string",
            },
            description: {
              type: "string",
            },
            technician_uuid: {
              type: "string",
            },
            website_link: {
              type: "string",
            },
            review_link: {
              type: "string",
            },
            place_id: {
              type: "string",
            },
            logo: {
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
          id: 26,
          name: "Create",
        });
        const itemOld = await fastify.prisma.locations.findUnique({
          where: {
            slug: generateSlug(request.body.name),
          },
        });
        if (itemOld) {
          throw new Error("The location alredy in our system.");
        }
        const item = await fastify.prisma.locations.create({
          data: {
            uuid: uuidv4(),
            name: request.body.name,
            email: request.body.email,
            mobile: request.body.mobile,
            slug: generateSlug(request.body.name),
            address: request.body.address,
            open_days: request.body.open_days,
            country_code: request.body.country_code,
            coor_lat: request.body.coor_lat,
            coor_long: request.body.coor_long,
            description: request.body.description || null,
            technician_uuid: request.body.technician_uuid || null,
            website_link: request.body.website_link || null,
            review_link: request.body.review_link || null,
            place_id: request.body.place_id || null,
            logo: request.body.logo || null,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Create a new location "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "locations",
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
            "name",
            "email",
            "mobile",
            "country_code",
            "address",
            "open_days",
            "coor_lat",
            "coor_long",
          ],
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
            address: {
              type: "string",
            },
            open_days: {
              type: "string",
            },
            coor_lat: {
              type: "string",
            },
            coor_long: {
              type: "string",
            },
            description: {
              type: "string",
            },
            technician_uuid: {
              type: "string",
            },
            website_link: {
              type: "string",
            },
            review_link: {
              type: "string",
            },
            place_id: {
              type: "string",
            },
            logo: {
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
          id: 28,
          name: "Update",
        });
        const itemOld = await fastify.prisma.locations.findUnique({
          where: {
            slug: generateSlug(request.body.name),
          },
        });
        if (itemOld && itemOld.uuid != request.body.uuid) {
          throw new Error("The location alredy in our system.");
        }
        const item = await fastify.prisma.locations.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            name: request.body.name,
            email: request.body.email,
            slug: generateSlug(request.body.name),
            mobile: request.body.mobile,
            address: request.body.address,
            open_days: request.body.open_days,
            country_code: request.body.country_code,
            coor_lat: request.body.coor_lat,
            coor_long: request.body.coor_long,
            description: request.body.description || null,
            technician_uuid: request.body.technician_uuid || null,
            website_link: request.body.website_link || null,
            review_link: request.body.review_link || null,
            place_id: request.body.place_id || null,
            logo: request.body.logo || null,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update location "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "locations",
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
          id: 27,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.locations.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          include: {
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
          id: 29,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.locations.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Delete location "${item.name}"`;
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
