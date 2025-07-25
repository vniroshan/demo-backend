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
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            country_code: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { start_date, end_date, country_code } = request.body;

      try {
         // Access check
        await fastify.access.isAuth(request, {
          id: 67,
          name: "Read",
        });

        let country = await fastify.prisma.countries.findUnique({
          where:{
            code:  country_code
          }
        })
        const items = await fastify.prisma.deals.findMany({
          where: {
            deleted_at: null,
            country_code,
            created_at: {
              gte: new Date(start_date),
              lte: new Date(end_date),
            },
          },
          select: {
            price: true,
            created_at: true,
          },
        });

        // Group items by month (e.g. Jan, Feb, ...)
        const grouped = _.groupBy(items, (item) =>
          moment(item.created_at).format("MMM")
        );

        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        const incomeChartData = months.map((month) => {
          const total = _.sumBy(grouped[month], "price");
          return total || 0;
        });

        reply.send({
          currency: country.currency,
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
    "/country-orders",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
          },
          required: ["start_date", "end_date"],
        },
      },
    },
    async (request, reply) => {
      const { start_date, end_date } = request.body;

      try {
         // Access check
        await fastify.access.isAuth(request, {
          id: 67,
          name: "Read",
        });
        const items = await fastify.prisma.deals.findMany({
          where: {
            deleted_at: null,
            created_at: {
              gte: new Date(start_date),
              lte: new Date(end_date),
            },
          },
          select: {
            country_code: true,
            countries: {
              select: {
                name: true,
              },
            },
          },
        });
        // Group by country code
        const grouped = _.groupBy(items, "country_code");

        const branchLocationLabels = [];
        const branchLocationData = [];

        for (const [countryCode, deals] of Object.entries(grouped)) {
          const countryName = deals[0]?.countries?.name || countryCode;
          branchLocationLabels.push(countryName);
          branchLocationData.push(deals.length);
        }

        reply.send({
          branchLocationLabels,
          branchLocationData,
        });
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
  fastify.post(
    "/customer-growth",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["start_date", "end_date", "country_code"],
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            country_code: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { start_date, end_date, country_code } = request.body;

      try {
         // Access check
        await fastify.access.isAuth(request, {
          id: 67,
          name: "Read",
        });
        const start = moment(start_date);
        const end = moment(end_date);
        const rangeDays = end.diff(start, "days");

        const prevStart = start.clone().subtract(rangeDays + 1, "days");
        const prevEnd = start.clone().subtract(1, "days");

        // Current period
        const currentCount = await fastify.prisma.customers.count({
          where: {
            deleted_at: null,
            created_at: {
              gte: start.toDate(),
              lte: end.toDate(),
            },
          },
        });

        // Previous period
        const previousCount = await fastify.prisma.customers.count({
          where: {
            deleted_at: null,
            created_at: {
              gte: prevStart.toDate(),
              lte: prevEnd.toDate(),
            },
          },
        });

        let customerGrowthPercentage = 0;

        if (previousCount === 0 && currentCount > 0) {
          customerGrowthPercentage = 100;
        } else if (previousCount > 0) {
          customerGrowthPercentage =
            ((currentCount - previousCount) / previousCount) * 100;
        }

        reply.send({
          customerGrowthPercentage: Math.round(customerGrowthPercentage),
          currentCount,
          previousCount,
        });
      } catch (error) {
        reply.status(500).send({ error: error.message });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/top-customers",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["start_date", "end_date", "country_code", "count"],
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            country_code: { type: "string" },
            count: { type: "number" },
          },
        },
      },
    },
    async (request, reply) => {

      const { start_date, end_date, country_code, count } = request.body;

      try {
         // Access check
        await fastify.access.isAuth(request, {
          id: 67,
          name: "Read",
        });
        const deals = await fastify.prisma.deals.findMany({
          where: {
            deleted_at: null,
            country_code,
            created_at: {
              gte: new Date(start_date),
              lte: new Date(end_date),
            },
          },
          select: {
            price: true,
            customer_uuid: true,
            customers: {
              select: {
                uuid: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        });

         let country = await fastify.prisma.countries.findUnique({
          where:{
            code:  country_code
          }
        })

        // Group deals by customer UUID
        const grouped = _.groupBy(deals, "customer_uuid");

        // Build result array
        const customerList = Object.entries(grouped).map(([uuid, orders]) => {
          const customer = orders[0]?.customers;

          const fullName = `${customer?.first_name || ""} ${
            customer?.last_name || ""
          }`.trim();
          const initials = `${customer?.first_name?.[0] || ""}${
            customer?.last_name?.[0] || ""
          }`.toUpperCase();
          const revenue = _.sumBy(orders, "price");
          const email = customer?.email || "";
          const orderCount = orders.length;

          return {
            name: fullName || "Unknown",
            email,
            currency: country.currency,
            initials: initials || "NA",
            color: getColorFromName(fullName),
            revenue,
            orders: orderCount,
          };
        });

        // Sort by revenue and return top `count`
        const topCustomers = _.orderBy(
          customerList,
          ["revenue"],
          ["desc"]
        ).slice(0, count);

        reply.send(topCustomers);
      } catch (error) {
        reply.status(500).send({ error: error.message });
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
          required: ["start_date", "end_date", "country_code"],
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            country_code: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { start_date, end_date, country_code } = request.body;

      try {
         // Access check
        await fastify.access.isAuth(request, {
          id: 67,
          name: "Read",
        });
         let country = await fastify.prisma.countries.findUnique({
          where:{
            code:  country_code
          }
        })
        const [totalRevenueResult, totalOrder, branchLocations, totalReviews] =
          await Promise.all([
            fastify.prisma.deals.aggregate({
              _sum: { price: true },
              where: {
                deleted_at: null,
                country_code: country_code,
                created_at: {
                  gte: new Date(start_date),
                  lte: new Date(end_date),
                },
              },
            }),

            fastify.prisma.deals.count({
               where: {
                deleted_at: null,
                country_code: country_code,
                created_at: {
                  gte: new Date(start_date),
                  lte: new Date(end_date),
                },
              },
            }),

            fastify.prisma.locations.count({
              where: {
                deleted_at: null,
                country_code: country_code,
                created_at: {
                  gte: new Date(start_date),
                  lte: new Date(end_date),
                },
              },
            }),

            fastify.prisma.google_reviews.count({
               where: {
                deleted_at: null,
                locations:{
                country_code: country_code,
                },
                created_at: {
                  gte: new Date(start_date),
                  lte: new Date(end_date),
                },
              },
            }),
          ]);

        const totalRevenue = totalRevenueResult._sum.price || 0;

        reply.send({
          currency: country.currency,
          keyMetrics: {
            totalRevenue,
            totalOrder,
            branchLocations,
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
