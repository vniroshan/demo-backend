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
        let after = null;
        let all = [];
        let data = [];

        while (true) {
          const res = await fastify.axios.post(
            `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/contacts/search`,
            {
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: "createdate", // or "updatedAt"
                      operator: "GT",
                      value: "2025-06-01T00:00:00Z",
                    },
                    {
                      propertyName: "email",
                      operator: "HAS_PROPERTY",
                    },
                  ],
                },
              ],
              sorts: [{ propertyName: "createdate", direction: "ASCENDING" }],
              properties: ["firstname", "lastname", "email","phone"],
              limit: 100,
              after, 
            },
            {
              headers: {
                Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          all.push(...res.data.results);

          if (res.data.paging?.next?.after) {
            after = res.data.paging.next.after;
          } else break;
        }

        data = all.map((c) => ({
          hubspot_id: c.id,
          uuid: uuidv4(),
          name: `${c.properties.firstname} ${c.properties.lastname}`,
          email: c.properties.email,
          mobile: c.properties.phone,
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        }));

        await fastify.prisma.customers.createMany({
          data: data,
          skipDuplicates: true,
        });

        reply.send({ length: data.length, data: data });
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
