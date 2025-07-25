"use strict";
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/sync",
    {
      schema: {
        tags: ["Hubspot"],
      },
    },
    async (request, reply) => {
      try {
        let allProducts = [];
        let after = undefined;

        while (true) {
          const res = await fastify.axios.get(
            `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/products`,
            {
              headers: {
                Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                "Content-Type": "application/json",
              },
              params: {
                limit: 100,
                after,
              },
            }
          );

          allProducts.push(...res.data.results);

          if (res.data.paging?.next?.after) {
            after = res.data.paging.next.after;
          } else break;
        }

        const products = allProducts.filter(
          (product) => !product.archived && product.properties.price != "0"
        );

        const data = products.map((product) => ({
          hubspot_id: product.id,
          uuid: uuidv4(),
          name: product.properties.name,
          price: parseFloat(product.properties.price),
          country_code:"AU",
          currency:"AUD",
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        }));

        await fastify.prisma.products.createMany({
          data,
          skipDuplicates: true,
        });

        reply.send({ length: data.length, data });
      } catch (error) {
        console.error(error);
        reply
          .status(500)
          .send({ error: error.message || "Internal Server Error" });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
