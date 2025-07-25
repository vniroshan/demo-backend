"use strict";

const moment = require("moment");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/run-deal",
    {
      schema: {
        tags: ["Make"],
      },
    },
    async (request, reply) => {
      try {
        const response = await fastify.axios.get(
          `https://hook.eu2.make.com/rwx9cpv0k425v9plrvpdt3j89vbfhfou`,
        );
        reply.send({message:"Success"});
      } catch (error) {
        reply.code(500).send({ error: error.message });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
