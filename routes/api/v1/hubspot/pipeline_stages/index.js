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
        const allStages = [];

        // Get all deal pipelines
        const pipelineResponse = await fastify.axios.get(
          `${fastify.config.HUBSPOT_API_URL}/crm/v3/pipelines/deals`,
          {
            headers: {
              Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        for (const pipeline of pipelineResponse.data.results) {
          const pipelineLabel = pipeline.label;
          const pipelineType = pipeline.id;

          for (const stage of pipeline.stages) {
            allStages.push({
              uuid: uuidv4(),
              hubspot_id: stage.id,
              name: stage.label,
              type: pipelineLabel, // Store label like "UK"
              sort: stage.displayOrder,
              created_at: stage.createdAt ?? moment().toISOString(),
              modified_at: stage.updatedAt ?? moment().toISOString(),
              deleted_at: stage.archived ? moment().toISOString() : null,
            });
          }
        }

        await fastify.prisma.pipeline_stages.createMany({
          data: allStages,
          skipDuplicates: true,
        });

        reply.send({
          count: allStages.length,
          stages: allStages,
        });
      } catch (error) {
        console.error("Pipeline Sync Error:", error?.response?.data || error);
        reply
          .status(500)
          .send({ error: error.message || "Internal Server Error" });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
