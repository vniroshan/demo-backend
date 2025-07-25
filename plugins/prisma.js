// prismaPlugin.js

const fp = require("fastify-plugin");
const { PrismaClient } = require("../generated/prisma");

module.exports = fp(async function (fastify, opts) {
  const prisma = new PrismaClient();
  fastify.decorate("prisma", prisma);
});
