"use strict";

const _ = require("lodash");
const moment = require("moment");

module.exports = async function (fastify, opts) {
fastify.post(
    "/income-chart",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          properties: {}, // no need for input
        },
      },
    },
    async (request, reply) => {
      try {
        // Access check
        await fastify.access.isAuth(request, {
          id: 0,
          name: "General",
        });

        // Get current year range
        const start_date = moment().startOf("year").toDate();   // Jan 1, 00:00
        const end_date = moment().endOf("year").toDate();       // Dec 31, 23:59

        // Fetch income data for the year
        const items = await fastify.prisma.technician_invoices.findMany({
          where: {
            deleted_at: null,
            created_at: {
              gte: start_date,
              lte: end_date,
            },
          },
          select: {
            price: true,
            created_at: true,
          },
        });

        // Group items by month abbreviation (e.g., Jan, Feb)
        const grouped = _.groupBy(items, (item) =>
          moment(item.created_at).format("MMM")
        );

        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];

        const incomeChartData = months.map((month) => {
          const total = _.sumBy(grouped[month], "price");
          return total || 0;
        });

        reply.send({
          incomeChartCategories: months,
          incomeChartData,
        });
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
  fastify.post(
    "/key-metrics",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          properties: {
           
          },
        },
      },
    },
    async (request, reply) => {

      try {
         // Access check
        await fastify.access.isAuth(request, {
          id: 0,
          name: "General",
        });
        let location = await fastify.prisma.locations.findFirst({
          where:{
            deleted_at: null,
            technician_uuid: request.user.technician_uuid
          },
          include:{
            countries: true
          }
        })
        const [totalRevenueResult, totalOrder, totalProducts, totalReviews] =
          await Promise.all([
            fastify.prisma.technician_invoices.aggregate({
              _sum: { price: true },
              where: {
                deleted_at: null,
                technician_uuid: request.user.technician_uuid
              },
            }),

            fastify.prisma.technician_orders.count({
               where: {
                deleted_at: null,
                 technician_uuid: request.user.technician_uuid
              },
            }),

            fastify.prisma.technician_products.count({
              where: {
                deleted_at: null,
                technician_uuid: request.user.technician_uuid
              },
            }),

            fastify.prisma.google_reviews.count({
               where: {
                deleted_at: null,
                location_uuid: location.uuid
              },
            }),
          ]);

        const totalRevenue = totalRevenueResult._sum.price || 0;

        reply.send({
          currency: location.countries.currency,
          keyMetrics: {
            totalRevenue,
            totalOrder,
            totalProducts,
            totalReviews,
          },
        });
      } catch (error) {
        reply.status(500).send({ error: error.message });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};

function getColorFromName(name) {
  const colors = [
    "primary",
    "secondary",
    "info",
    "warning",
    "error",
    "success",
  ];
  const index =
    Math.abs(
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % colors.length;
  return colors[index];
}
