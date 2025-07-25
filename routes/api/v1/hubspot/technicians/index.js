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
        const techniciansTeamId = "51635412";
        let allOwners = [];
        let after = undefined;

        while (true) {
          const res = await fastify.axios.get(
            `${fastify.config.HUBSPOT_API_URL}/crm/v3/owners`,
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

          allOwners.push(...res.data.results);

          if (res.data.paging?.next?.after) {
            after = res.data.paging.next.after;
          } else break;
        }

        // Filter owners by Technicians teamId
        const technicianOwners = allOwners.filter(
          (owner) =>
            !owner.archived &&
            owner.teams &&
            owner.teams[0].id === techniciansTeamId
        );

        // Format data for DB insert
        const data = technicianOwners.map((owner) => ({
          hubspot_id: owner.id,
          uuid: uuidv4(),
          name: `${owner.firstName || ""} ${owner.lastName || ""}`.trim(),
          email: owner.email,
          mobile: owner.phone || null,
          country_code: owner.email?.endsWith("tapestodigital.com.au")
            ? "AU"
            : owner.email?.endsWith("tapestodigital.co.uk")
            ? "UK"
            : null,
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        }));

        await fastify.prisma.technicians.createMany({
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
