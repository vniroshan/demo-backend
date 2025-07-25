"use strict";
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

// Helper function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

module.exports = async function (fastify, opts) {
  fastify.get(
    "/sync/:country_code",
    {
      schema: {
        tags: ["Dotnet"],
      },
    },
    async (request, reply) => {
      try {
        let allLocations = [];

        const res = await fastify.axios.get(
          `https://tapestodigital.net/api/store-locator/${request.params.country_code}`
        );

        allLocations = res.data.locations;

        const data = allLocations.map((location) => ({
          uuid: uuidv4(),
          name: location.name,
          slug: generateSlug(location.name),
          address: location.address,
          mobile: location.phone,
          email: location.email,
          open_days: location.open_days,
          coor_lat: location.coor_lat,
          coor_long: location.coor_long,
          description: location.description || null,
          country_code: request.params.country_code,
          website_link: location.website_link,
          review_link: location.review_link,
          place_id: location.place_id,
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        }));

        await fastify.prisma.locations.createMany({
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
