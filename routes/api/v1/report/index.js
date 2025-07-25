"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/:country_code",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            country_code: {
              type: "string",
              default: "AU",
            },
          },
        },
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
          id: 68,
          name: "Read",
        });
        //  check access end

        const { country_code } = request.params;
        const { page, limit, search } = request.query;
        const skip = (page - 1) * limit;

        let locationWhere = {
          deleted_at: null,
          country_code: country_code,
        };

        if (search && search.trim() !== "") {
          locationWhere.name = {
            contains: search.trim(),
            mode: "insensitive",
          };
        }

        // Get locations with technician orders
        const locations = await fastify.prisma.locations.findMany({
          where: locationWhere,
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
            address: true,
            technicians: {
              where: {
                deleted_at: null,
              },
              select: {
                uuid: true,
                technician_orders: {
                  where: {
                    deleted_at: null,
                  },
                  select: {
                    id: true,
                    status: true,
                    technician_order_products: {
                      where: {
                        deleted_at: null,
                      },
                      select:{
                        id: true,
                        quantity: true
                      }
                    },
                  },
                },
              },
            },
          },
        });

        // Process the data to calculate counts
        const processedData = locations.map((location) => {
          let activeOrdersCount = 0;
          let totalOrdersCount = 0;
           let activeProductsCount = 0;
          if (location.technicians) {
            location.technicians.technician_orders.forEach((order) => {
              totalOrdersCount++;
              if (order.status == "converting") {
                activeOrdersCount++;
                 order.technician_order_products.forEach((product) => {
              activeProductsCount = activeProductsCount + product.quantity;
            });
              }
            });
          }

          return {
            location: {
              id: location.id,
              uuid: location.uuid,
              name: location.name,
              slug: location.slug,
              address: location.address,
            },
            activeOrdersCount,
            totalOrdersCount,
            activeProductsCount,
          };
        });

        const totalCount = await fastify.prisma.locations.count({
          where: locationWhere,
        });

        const totalPages = Math.ceil(totalCount / limit);

        // Calculate summary
        let totalActiveOrders = 0;
        let totalAllOrders = 0;
        let totalActiveProducts = 0;
        processedData.forEach((item) => {
          totalActiveOrders += item.activeOrdersCount;
          totalAllOrders += item.totalOrdersCount;
          totalActiveProducts += item.activeProductsCount;
        });

        const response = {
          page: page,
          limit: limit,
          totalPages: totalPages,
          totalCount: totalCount,
          summary: {
            totalActiveOrders,
            totalAllOrders,
            totalLocations: totalCount,
          },
          data: processedData,
        };

        reply.send(response);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
