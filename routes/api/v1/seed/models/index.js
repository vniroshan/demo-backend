"use strict";

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["Seed"],
      },
    },
    async (request, reply) => {
      try {
        const data = {
          model: "models",
          unique: "id",
          rows: [
            {
              id: 1,
              name: "Manage Admins",
              key: "manage_admin",
            },
            {
              id: 2,
              name: "Manage Technicians",
              key: "manage_technician",
            },
            {
              id: 3,
              name: "Manage Users",
              key: "manage_user",
            },
            {
              id: 4,
              name: "Manage Roles",
              key: "manage_role",
            },
            {
              id: 5,
              name: "Activity Logs",
              key: "activity_log",
            },
            {
              id: 6,
              name: "Manage Countries",
              key: "manage_country",
            },
            {
              id: 7,
              name: "Manage Products",
              key: "manage_product",
            },
            {
              id: 8,
              name: "Manage Locations",
              key: "manage_location",
            },
            {
              id: 9,
              name: "Manage Technician Invoices",
              key: "manage_technician_invoice",
            },
            {
              id: 10,
              name: "Manage Admin Invoices",
              key: "manage_admin_invoice",
            },
            {
              id: 11,
              name: "Manage Deals",
              key: "manage_deal",
            },
            {
              id: 12,
              name: "Manage Wise Users",
              key: "manage_wise_user",
            },
            {
              id: 13,
              name: "Manage Transactions",
              key: "manage_transaction",
            },
            {
              id: 14,
              name: "Manage Technician Orders",
              key: "manage_technician_order",
            },
            {
              id: 15,
              name: "Manage Utils",
              key: "manage_util",
            },
            {
              id: 16,
              name: "Manage Reviews",
              key: "manage_review",
            },
            {
              id: 17,
              name: "Manage Wise Jars",
              key: "manage_wise_jar",
            },
            {
              id: 18,
              name: "Calendar",
              key: "calendar",
            },
            {
              id: 19,
              name: "Manage Bookings",
              key: "manage_booking",
            },
            {
              id: 20,
              name: "Manage Stock",
              key: "manage_stock",
            },
             {
              id: 21,
              name: "Manage Mail Templates",
              key: "manage_mail_template",
            },
             {
              id: 22,
              name: "Dashboard",
              key: "view_dashboard",
            },
             {
              id: 23,
              name: "Report",
              key: "view_report",
            },
          ],
        };
        const resp = await fastify.seed.create(data);
        reply.send(resp);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
