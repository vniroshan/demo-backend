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
            `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/deals/search`,
            {
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: "createdate",
                      operator: "GT",
                      value: "2025-06-01T00:00:00Z",
                    },
                  ],
                },
              ],
              sorts: [{ propertyName: "createdate", direction: "ASCENDING" }],
              properties: [
                "dealname",
                "amount",
                "dealstage",
                "hubspot_owner_id",
              ],
              associations: ["contacts", "line_items", "Technician"],
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

        reply.send({ length: all.length, data: all });
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // New read API for a single deal with owner and line item details
  fastify.get(
    "/:dealId",
    {
      schema: {
        tags: ["Hubspot"],
        params: {
          type: "object",
          properties: {
            dealId: { type: "string" },
          },
          required: ["dealId"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { dealId } = request.params;

        // Get deal with associations
        const dealResponse = await fastify.axios.get(
          `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/deals/${dealId}`,
          {
            params: {
              properties: [
                "dealname",
                "amount",
                "dealstage",
                "hubspot_owner_id",
                "createdate",
                "closedate",
                "pipeline",
                "dealtype",
                "assign_technician",
              ].join(","),
              associations: "contacts,line_items",
            },
            headers: {
              Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        const deal = dealResponse.data;

        let ownerDetails = null;
        let lineItemDetails = [];

        // Get owner details if hubspot_owner_id exists
        if (deal.properties.hubspot_owner_id) {
          try {
            const ownerResponse = await fastify.axios.get(
              `${fastify.config.HUBSPOT_API_URL}/crm/v3/owners/${deal.properties.hubspot_owner_id}`,
              {
                headers: {
                  Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );
            ownerDetails = ownerResponse.data;
          } catch (ownerError) {
            console.warn(
              `Could not fetch owner details for ID ${deal.properties.hubspot_owner_id}:`,
              ownerError.message
            );
          }
        }

        // Get line item details if associations exist
        if (deal.associations?.["line items"]?.results?.length > 0) {
          const lineItemIds = deal.associations?.["line items"].results.map(
            (item) => item.id
          );

          try {
            const lineItemsResponse = await fastify.axios.post(
              `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/line_items/batch/read`,
              {
                inputs: lineItemIds.map((id) => ({ id })),
                properties: [
                  "name",
                  "price",
                  "quantity",
                  "hs_total_price",
                  "hs_product_id",
                  "hs_line_item_currency_code",
                  "createdate",
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );

            // Map only the properties you care about
            lineItemDetails = lineItemsResponse.data.results.map((item) => ({
              id: item.id,
              name: item.properties.name,
              price: item.properties.price,
              quantity: item.properties.quantity,
              total_price: item.properties.hs_total_price,
              product_id: item.properties.hs_product_id,
              currency: item.properties.hs_line_item_currency_code,
              createdate: item.properties.createdate,
            }));
          } catch (lineItemError) {
            console.warn(
              `Could not fetch line item details:`,
              lineItemError.message
            );
          }
        }

        const pipelineId = deal.properties.pipeline;
        const dealstageId = deal.properties.dealstage;

        let pipelineStageLabel = null;

        try {
          const pipelineRes = await fastify.axios.get(
            `${fastify.config.HUBSPOT_API_URL}/crm/v3/pipelines/deals/${pipelineId}`,
            {
              headers: {
                Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
              },
            }
          );

          const stage = pipelineRes.data.stages.find(
            (s) => s.id === dealstageId
          );
          pipelineStageLabel = stage;
        } catch (err) {
          console.warn("Pipeline stage fetch failed:", err.message);
        }

        let contactDetails = [];

        if (deal.associations?.contacts?.results?.length > 0) {
          const contactIds = deal.associations.contacts.results.map(
            (c) => c.id
          );

          try {
            const contactResponse = await fastify.axios.post(
              `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/contacts/batch/read`,
              {
                inputs: contactIds.map((id) => ({ id })),
                properties: ["email", "firstname", "lastname", "phone"],
              },
              {
                headers: {
                  Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );

            contactDetails = contactResponse.data.results.map((contact) => ({
              id: contact.id,
              email: contact.properties.email,
              firstname: contact.properties.firstname,
              lastname: contact.properties.lastname,
              phone: contact.properties.phone,
            }));
          } catch (contactError) {
            console.warn(
              `Could not fetch contact details:`,
              contactError.message
            );
          }
        }

        // Structure the response
        const response = {
          deal: {
            id: deal.id,
            properties: deal.properties,
            associations: deal.associations,
          },
          owner: ownerDetails,
          lineItems: lineItemDetails,
          contact: contactDetails[0],
          pipelineStageLabel: pipelineStageLabel,
        };

        reply.send(response);
      } catch (error) {
        if (error.response?.status === 404) {
          reply.code(404).send({
            error: "Deal not found",
            message: `Deal with ID ${request.params.dealId} does not exist`,
          });
        } else {
          reply.code(500).send({
            error: "Internal server error",
            message: error.message,
          });
        }
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/new",
    {
      schema: {
        tags: ["Hubspot"],
        body: {
          type: "object",
          properties: {
            dealId: { type: "string" },
          },
          required: ["dealId"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { dealId } = request.body;

        // Get deal with associations
        const dealResponse = await fastify.axios.get(
          `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/deals/${dealId}`,
          {
            params: {
              properties: [
                "dealname",
                "amount",
                "dealstage",
                "hubspot_owner_id",
                "createdate",
                "closedate",
                "pipeline",
                "dealtype",
                "assign_technician",
              ].join(","),
              associations: "contacts,line_items",
            },
            headers: {
              Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        const deal = dealResponse.data;

        let lineItemDetails = [];

        // Get line item details if associations exist
        if (deal.associations?.["line items"]?.results?.length > 0) {
          const lineItemIds = deal.associations?.["line items"].results.map(
            (item) => item.id
          );

          try {
            const lineItemsResponse = await fastify.axios.post(
              `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/line_items/batch/read`,
              {
                inputs: lineItemIds.map((id) => ({ id })),
                properties: [
                  "name",
                  "price",
                  "quantity",
                  "hs_total_price",
                  "hs_product_id",
                  "hs_line_item_currency_code",
                  "createdate",
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );

            // Map only the properties you care about
            lineItemDetails = lineItemsResponse.data.results.map((item) => ({
              id: item.id,
              name: item.properties.name,
              price: item.properties.price,
              quantity: item.properties.quantity,
              total_price: item.properties.hs_total_price,
              product_id: item.properties.hs_product_id,
              currency: item.properties.hs_line_item_currency_code,
              createdate: item.properties.createdate,
            }));
          } catch (lineItemError) {
            console.warn(
              `Could not fetch line item details:`,
              lineItemError.message
            );
          }
        }
        let contactDetails = [];

        if (deal.associations?.contacts?.results?.length > 0) {
          const contactIds = deal.associations.contacts.results.map(
            (c) => c.id
          );

          try {
            const contactResponse = await fastify.axios.post(
              `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/contacts/batch/read`,
              {
                inputs: contactIds.map((id) => ({ id })),
                properties: ["email", "firstname", "lastname", "phone"],
              },
              {
                headers: {
                  Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );

            contactDetails = contactResponse.data.results.map((contact) => ({
              id: contact.id,
              email: contact.properties.email,
              firstname: contact.properties.firstname,
              lastname: contact.properties.lastname,
              phone: contact.properties.phone,
            }));
          } catch (contactError) {
            console.warn(
              `Could not fetch contact details:`,
              contactError.message
            );
          }
        }

        
        const pipelineId = deal.properties.pipeline;
        const dealstageId = deal.properties.dealstage;

        let pipelineStageLabel = null;

        try {
          const pipelineRes = await fastify.axios.get(
            `${fastify.config.HUBSPOT_API_URL}/crm/v3/pipelines/deals/${pipelineId}`,
            {
              headers: {
                Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
              },
            }
          );

          const stage = pipelineRes.data.stages.find(
            (s) => s.id === dealstageId
          );
          pipelineStageLabel = stage;
        } catch (err) {
          console.warn("Pipeline stage fetch failed:", err.message);
        }

        // Structure the response
        const response = {
          deal: {
            id: deal.id,
            properties: deal.properties,
            associations: deal.associations,
          },
          lineItems: lineItemDetails,
          contact: contactDetails[0],
          pipelineStageLabel: pipelineStageLabel,
        };
       const contact = contactDetails[0];

          const newCustomer = await fastify.prisma.customers.upsert({
            where: {
              email: contact.email, // unique constraint
            },
            update: {
              hubspot_id: contact.id,
              first_name: contact.firstname,
              last_name: contact.lastname,
              mobile: contact.phone,
              modified_at: moment().toISOString(),
            },
            create: {
              uuid: uuidv4(),
              hubspot_id: contact.id,
              first_name: contact.firstname,
              last_name: contact.lastname,
              email: contact.email,
              mobile: contact.phone,
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            },
          });
        let newDeal = null;
        let oldDeal = await fastify.prisma.deals.findUnique({
          where: {
            hubspot_id: deal.id,
          },
        });
        if (!oldDeal) {
          const parts = deal.properties.dealname?.split("-");
          const countryCode =
            parts && parts.length >= 2 ? parts[1].trim() : null;
          let technician = await fastify.prisma.technicians.findFirst({
            where:{
              deal_map_name: deal.properties.assign_technician
            }
          })
           let pipeline_stage = await fastify.prisma.pipeline_stages.findFirst({
            where:{
              hubspot_id: deal.properties.dealstage
            }
          })
          let country = await fastify.prisma.countries.findFirst({
            where:{
              code: countryCode
            }
          })
          const newDeal = await fastify.prisma.deals.create({
            data: {
              uuid: uuidv4(),
              hubspot_id: deal.id,
              name: deal.properties.dealname,
              customer_uuid: newCustomer.uuid,
              country_code: countryCode,
              hubspot_owner_id: deal.properties.hubspot_owner_id,
              technician_uuid: technician.uuid,
              pipeline_stage_uuid: pipeline_stage.uuid,
              price: parseFloat(deal.properties.amount),
              price_paid:parseFloat(deal.properties.amount)/2,
              currency: country.currency,
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            },
          });

   

          for (const item of lineItemDetails) {
            const product = await fastify.prisma.products.findUnique({
              where: {
                hubspot_id: item.product_id,
              },
            });

            if (!product) {
              console.warn(
                `Product not found for hubspot_id: ${item.product_id}`
              );
              continue; // Skip this item if product not found
            }

            const dealProduct = await fastify.prisma.deal_products.create({
              data: {
                uuid: uuidv4(),
                hubspot_id: item.id,
                deal_uuid: newDeal.uuid,
                product_uuid: product.uuid,
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                currency: item.currency,
                created_at: moment().toISOString(),
                modified_at: moment().toISOString(),
              },
            });
          }
        }

        reply.send(response);
      } catch (error) {
        if (error.response?.status === 404) {
          reply.code(404).send({
            error: "Deal not found",
            message: `Deal with ID ${request.params.dealId} does not exist`,
          });
        } else {
          reply.code(500).send({
            error: "Internal server error",
            message: error.message,
          });
        }
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
