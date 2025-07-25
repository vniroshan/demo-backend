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
      const customObjId = "2-35384366"; // 🔄 Updated custom object ID
      let allProcess = [];
      let after = undefined;

      while (true) {
        const res = await fastify.axios.get(
          `${fastify.config.HUBSPOT_API_URL}/crm/v3/properties/${customObjId}`,
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

        allProcess.push(...res.data.results);

        if (res.data.paging?.next?.after) {
          after = res.data.paging.next.after;
        } else break;
      }

      const technicianProcess = allProcess.filter(
        (process) => process.fieldType === "select"
      );
      const processData = technicianProcess.map((process) => ({
        uuid: uuidv4(),
        hubspot_id: process.label,
        name: process.label,
        sort: process.displayOrder,
        created_at: moment().toISOString(),
        modified_at: moment().toISOString(),
      }));

      const optionsData = [];
      technicianProcess.forEach((process) => {
        const processUuid = processData.find(p => p.hubspot_id === process.name)?.uuid;

        if (process.options && Array.isArray(process.options)) {
          process.options.forEach((option) => {
            if(processUuid){
   optionsData.push({
              uuid: uuidv4(),
              name: option.label,
              sort: option.displayOrder || 0,
              technician_process_uuid: processUuid,
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            });
            }
        
          });
        }
      });

      await fastify.prisma.technician_process.createMany({
        data: processData,
        skipDuplicates: true,
      });

      if (optionsData.length > 0) {
        await fastify.prisma.technician_process_options.createMany({
          data: optionsData,
          skipDuplicates: true,
        });
      }

      reply.send({ 
        processCount: processData.length, 
        optionsCount: optionsData.length,
        processes: processData,
        options: optionsData
      });
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
