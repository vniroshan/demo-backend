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
          model: "permissions",
          unique: "id",
          rows: [
            {
              id: 1,
              name: "Create",
              model_id: 1,
              description: "Admins model create permission",
            },
            {
              id: 2,
              name: "Read",
              model_id: 1,
              description: "Admins model read permission",
            },
            {
              id: 3,
              name: "Update",
              model_id: 1,
              description: "Admins model update permission",
            },
            {
              id: 4,
              name: "Delete",
              model_id: 1,
              description: "Admins model create permission",
            },
            {
              id: 5,
              name: "Create",
              model_id: 2,
              description: "Technicians model create permission",
            },
            {
              id: 6,
              name: "Read",
              model_id: 2,
              description: "Technicians model read permission",
            },
            {
              id: 7,
              name: "Update",
              model_id: 2,
              description: "Technicians model update permission",
            },
            {
              id: 8,
              name: "Delete",
              model_id: 2,
              description: "Technicians model delete permission",
            },
            {
              id: 9,
              name: "Create",
              model_id: 3,
              description: "Users model create permission",
            },
            {
              id: 10,
              name: "Read",
              model_id: 3,
              description: "Users model read permission",
            },
            {
              id: 11,
              name: "Update",
              model_id: 3,
              description: "Users model update permission",
            },
            {
              id: 12,
              name: "Delete",
              model_id: 3,
              description: "Users model delete permission",
            },
            {
              id: 13,
              name: "Create",
              model_id: 4,
              description: "Roles model create permission",
            },
            {
              id: 14,
              name: "Read",
              model_id: 4,
              description: "Roles model read permission",
            },
            {
              id: 15,
              name: "Update",
              model_id: 4,
              description: "Roles model update permission",
            },
            {
              id: 16,
              name: "Delete",
              model_id: 4,
              description: "Roles model delete permission",
            },
            {
              id: 17,
              name: "Read",
              model_id: 5,
              description: "Activity logs model read permission",
            },
            {
              id: 18,
              name: "Delete",
              model_id: 5,
              description: "Activity logs model delete permission",
            },
            {
              id: 19,
              name: "Create",
              model_id: 6,
              description: "Countries model create permission",
            },
            {
              id: 20,
              name: "Read",
              model_id: 6,
              description: "Countries model read permission",
            },
            {
              id: 21,
              name: "Delete",
              model_id: 6,
              description: "Countries model delete permission",
            },
            {
              id: 22,
              name: "Sync",
              model_id: 7,
              description: "Products model synce permission",
            },
            {
              id: 23,
              name: "Read",
              model_id: 7,
              description: "Products model read permission",
            },
            {
              id: 24,
              name: "Update",
              model_id: 7,
              description: "Products model update permission",
            },
            {
              id: 25,
              name: "Delete",
              model_id: 7,
              description: "Products model delete permission",
            },
            {
              id: 26,
              name: "Create",
              model_id: 8,
              description: "Locations model create permission",
            },
            {
              id: 27,
              name: "Read",
              model_id: 8,
              description: "Locations model read permission",
            },
            {
              id: 28,
              name: "Update",
              model_id: 8,
              description: "Locations model update permission",
            },
            {
              id: 29,
              name: "Delete",
              model_id: 8,
              description: "Locations model delete permission",
            },
            {
              id: 30,
              name: "Create",
              model_id: 9,
              description: "Technician invoices model create permission",
            },
            {
              id: 31,
              name: "Read",
              model_id: 9,
              description: "Technician invoices model read permission",
            },
            {
              id: 32,
              name: "Delete",
              model_id: 9,
              description: "Technician invoices model delete permission",
            },
            {
              id: 33,
              name: "Create",
              model_id: 10,
              description: "Technician invoices model create permission",
            },
            {
              id: 34,
              name: "Read",
              model_id: 10,
              description: "Admin invoices model read permission",
            },
            {
              id: 35,
              name: "Approve",
              model_id: 10,
              description: "Admin invoices model read permission",
            },
            {
              id: 36,
              name: "Reject",
              model_id: 10,
              description: "Admin model delete permission",
            },
            {
              id: 37,
              name: "Read",
              model_id: 11,
              description: "Deal model read permission",
            },
            {
              id: 38,
              name: "Sync",
              model_id: 12,
              description: "Wise users model synce permission",
            },
            {
              id: 39,
              name: "Read",
              model_id: 12,
              description: "Wise users model read permission",
            },
            {
              id: 40,
              name: "Update",
              model_id: 12,
              description: "Wise users model update permission",
            },
            {
              id: 41,
              name: "Read",
              model_id: 13,
              description: "Transactions model read permission",
            },
            {
              id: 42,
              name: "Create",
              model_id: 14,
              description: "Orders model create permission",
            },
            {
              id: 43,
              name: "Read",
              model_id: 14,
              description: "Orders model read permission",
            },
            {
              id: 44,
              name: "Update",
              model_id: 14,
              description: "Orders model update permission",
            },
            {
              id: 45,
              name: "Create",
              model_id: 15,
              description: "Utils model create permission",
            },
            {
              id: 46,
              name: "Read",
              model_id: 15,
              description: "Utils model read permission",
            },
            {
              id: 47,
              name: "Update",
              model_id: 15,
              description: "Utils model update permission",
            },
            {
              id: 48,
              name: "Create",
              model_id: 16,
              description: "Reviews model create permission",
            },
            {
              id: 49,
              name: "Sync",
              model_id: 16,
              description: "Reviews model synce permission",
            },
            {
              id: 50,
              name: "Read",
              model_id: 16,
              description: "Reviews model read permission",
            },
            {
              id: 51,
              name: "Update",
              model_id: 16,
              description: "Reviews model update permission",
            },
            {
              id: 52,
              name: "Delete",
              model_id: 16,
              description: "Reviews model delete permission",
            },
            {
              id: 53,
              name: "Sync",
              model_id: 17,
              description: "Wise jars model synce permission",
            },
            {
              id: 54,
              name: "Read",
              model_id: 17,
              description: "Wise jars model read permission",
            },
            {
              id: 55,
              name: "Update",
              model_id: 17,
              description: "Wise jars model update permission",
            },
            {
              id: 56,
              name: "Transfer",
              model_id: 17,
              description: "Wise jars model transfer permission",
            },
            {
              id: 57,
              name: "Read",
              model_id: 18,
              description: "Calendar model read permission",
            },
            {
              id: 58,
              name: "Read",
              model_id: 19,
              description: "Bookings model read permission",
            },
            {
              id: 59,
              name: "Confirm",
              model_id: 19,
              description: "Bookings model confirm permission",
            },
            {
              id: 60,
              name: "Cancel",
              model_id: 19,
              description: "Admin model cancel permission",
            },
            {
              id: 61,
              name: "Read",
              model_id: 20,
              description: "Product stock model read permission",
            },
            {
              id: 62,
              name: "Manage",
              model_id: 20,
              description: "Product stock model confirm permission",
            },
            {
              id: 63,
              name: "Create",
              model_id: 21,
              description: "Mail templates model create permission",
            },
            {
              id: 64,
              name: "Read",
              model_id: 21,
              description: "Mail templates model read permission",
            },
            {
              id: 65,
              name: "Update",
              model_id: 21,
              description: "Mail templates model update permission",
            },
            {
              id: 66,
              name: "Delete",
              model_id: 21,
              description: "Mail templates model delete permission",
            },
             {
              id: 67,
              name: "Read",
              model_id: 22,
              description: "Dashboard read permission",
            },
             {
              id: 68,
              name: "Read",
              model_id: 23,
              description: "Report read permission",
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
