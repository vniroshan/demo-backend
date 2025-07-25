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
        const objects = [];
        for (let i = 1; i <= 68; i++) {
          const obj = {
            role_uuid:'a023fc9a-a6c8-4f32-9285-bc1b7706c570',
            permission_id: i,
          };

          objects.push(obj);
        }
        const data = {
          model: "role_permissions",
          unique: {
            role_uuid_permission_id: ["role_uuid", "permission_id"],
          },
          rows: objects,
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
