"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        query: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              default: 1,
            },
            limit: {
              type: "integer",
              default: 10,
            },
            search: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 37,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [{ name: { contains: search, mode: "insensitive" } }],
        };
        const items = await fastify.prisma.deals.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            hubspot_id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            price: true,
            currency: true,
            country_code: true,
            _count: {
              select: {
                deal_products: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
            },
            technician_orders: {
              select: {
                id: true,
                uuid: true,
                name: true,
                product_image_url: true,
              },
            },
          },
        });
        const totalCount = await fastify.prisma.deals.count({
          where: where,
        });

        const totalPages = Math.ceil(totalCount / limit);

        var res = {};
        res.page = page;
        res.limit = limit;
        res.totalPages = totalPages;
        res.totalCount = totalCount;
        res.data = items;
        reply.send(res);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.get(
    "/:uuid",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 37,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.deals.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            price: true,
            country_code: true,
            created_at: true,
            modified_at: true,
            _count: {
              select: {
                deal_products: {
                  where: {
                    deleted_at: null,
                  },
                },
              },
            },
          },
        });
        reply.send(item);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.get(
    "/by-hubspot-id/:hubspot_id",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            hubspot_id: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Fetch deal with all related data
        const dealData = await fastify.prisma.deals.findUnique({
          where: {
            hubspot_id: request.params.hubspot_id,
          },
          include: {
            customers: {
              select: {
                hubspot_id: true,
                email: true,
                first_name: true,
                last_name: true,
                mobile: true,
              },
            },
            technicians: {
              select: {
                name: true,
              },
            },
            pipeline_stages: {
              select: {
                name: true,
                hubspot_id: true,
              },
            },
            technician_process: {
              select: {
                hubspot_id: true,
              },
            },
            deal_products: {
              where: {
                deleted_at: null,
              },
              include: {
                products: {
                  select: {
                    hubspot_id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!dealData) {
          throw new Error(`Deal with UUID ${dealUuid} not found`);
        }

        // Additional validation
        if (!dealData.customers) {
          throw new Error(`Customer data not found for deal ${dealUuid}`);
        }

        // Calculate VAT/GST based on country (you can customize this logic)
        const vat = await fastify.prisma.utils.findFirst({
          where: {
            key: "VAT/GST",
            country_code: dealData.country_code,
          },
        });
        const vatRate = vat?.value || 0;

        // Separate regular products and additional products
        const regularProducts =
          dealData.deal_products?.filter((product) => !product.is_advance) ||
          [];
        const additionalProducts =
          dealData.deal_products?.filter((product) => product.is_advance) || [];

        // Helper function to format product data
        const formatProductData = (dealProduct) => {
          const price = parseFloat(dealProduct.price) || 0;
          const quantity = dealProduct.quantity || 0;
          const totalAmount = price * quantity;
          const vatAmount = totalAmount * (vatRate / 100);

          return {
            hs_object_id: dealProduct.hubspot_id || "",
            product_id: dealProduct.products?.hubspot_id || "",
            deal_currency_code: dealProduct.currency || "",
            unit_amount: price,
            quantity: quantity,
            total_amount: totalAmount,
            product_name: dealProduct.products?.name || "",
            is_additional: dealProduct.is_advance,
            discount: 0,
            vat_gst: vatAmount,
          };
        };

        // Construct the body with proper null checks
        const body = {
          contact: {
            hs_object_id: dealData.customers.hubspot_id || "",
            email: dealData.customers.email || "",
            firstname: dealData.customers.first_name || "",
            lastname: dealData.customers.last_name || "",
            phone: dealData.customers.mobile || "",
          },
          deal: {
            hs_object_id: dealData.hubspot_id || "",
            deal_first_name: dealData.customers.first_name || "",
            dealname: dealData.name || "",
            hubspot_owner_id: dealData.hubspot_owner_id || "",
            dealstage:
              dealData.pipeline_stages?.hubspot_id ||
              dealData.pipeline_stages?.name?.toLowerCase() ||
              "",
            pipeline: "default",
            country: dealData.country_code || "",
            deal_currency_code: dealData.currency || "",
          },
          technician_process: {
            hs_object_id:
              dealData.technician_process?.hubspot_id ||
              dealData.hubspot_id ||
              "",
            assign_technician: dealData.technicians?.name || "",
            hs_pipeline_stage:
              dealData.pipeline_stages?.hubspot_stage_id ||
              dealData.pipeline_stages?.name?.toLowerCase() ||
              "",
          },
          line_items: regularProducts.map(formatProductData),
          additional_products: additionalProducts.map(formatProductData),
        };
        reply.send(body);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/transfer-to-jar",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid"],
          properties: {
            uuid: {
              type: "string",
              description: "Deal UUID",
            },
            reference: {
              type: "string",
              description: "Optional reference for the transfer",
            },
            force_transfer: {
              type: "boolean",
              default: false,
              description: "Force transfer even if already completed",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 21,
          name: "Transfer",
        });
        // check access end

        const { uuid, reference, force_transfer = false } = request.body;

        // Get deal details
        const deal = await fastify.prisma.deals.findUnique({
          where: {
            uuid: uuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            price: true,
            country_code: true,
          },
        });

        if (!deal) {
          return reply.status(404).send({
            success: false,
            message: "Deal not found",
          });
        }

        if (!deal.price || deal.price <= 0) {
          return reply.status(400).send({
            success: false,
            message: "Deal price is invalid or zero",
          });
        }

        // Check if transfers already exist (unless force_transfer is true)
        if (!force_transfer) {
          const transferStatus = await fastify.checkDealTransferStatus(
            deal.uuid
          );

          if (transferStatus.hasSuccessfulTransfers) {
            return reply.status(409).send({
              success: false,
              message: `Deal has already been transferred to jars. Total transferred: ${transferStatus.successfulAmount}`,
              alreadyTransferred: true,
              data: {
                deal: {
                  uuid: deal.uuid,
                  name: deal.name,
                  amount: deal.price,
                  country_code: deal.country_code,
                },
                existingTransfers: transferStatus.transfers,
                summary: {
                  totalTransfers: transferStatus.totalTransfers,
                  successfulTransfers: transferStatus.successfulTransfers,
                  failedTransfers: transferStatus.failedTransfers,
                  totalAmount: transferStatus.totalAmount,
                  successfulAmount: transferStatus.successfulAmount,
                  lastTransferDate: transferStatus.lastTransferDate,
                },
              },
            });
          }
        }

        // Transfer money to all jars based on their percentages
        const transferResult = await fastify.transferDealToJars(
          deal.uuid,
          deal.price,
          deal.country_code,
          reference ||
            `Transfer from deal "${deal.name}" - ${moment().format(
              "YYYY-MM-DD HH:mm:ss"
            )}`,
          force_transfer
        );

        // Handle case where transfers already exist (shouldn't happen with the check above, but just in case)
        if (!transferResult.success && transferResult.alreadyTransferred) {
          return reply.status(409).send({
            success: false,
            message: transferResult.message,
            alreadyTransferred: true,
            data: {
              deal: {
                uuid: deal.uuid,
                name: deal.name,
                amount: deal.price,
                country_code: deal.country_code,
              },
              existingTransfers: transferResult.existingTransfers,
              totalTransferred: transferResult.totalTransferred,
              transferCount: transferResult.transferCount,
            },
          });
        }

        // Log the activity
        let message = `Transfer money to jars from deal "${deal.name}" - Amount: ${deal.price}`;
        if (force_transfer) {
          message += " (FORCED)";
        }

        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Transfer",
          "deals",
          deal.id,
          message
        );

        reply.send({
          success: true,
          message: `Successfully transferred ${deal.price} from deal "${deal.name}" to ${transferResult.transfers.length} jars`,
          data: {
            deal: {
              uuid: deal.uuid,
              name: deal.name,
              amount: deal.price,
              country_code: deal.country_code,
            },
            transfers: transferResult.transfers,
            totalTransferred: transferResult.totalTransferred,
            summary: transferResult.summary,
            forceTransfer: force_transfer,
          },
        });
      } catch (error) {
        fastify.log.error("Transfer to jar error:", error);
        reply.status(500).send({
          success: false,
          message: error.message || "Failed to transfer money to jars",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // Add new endpoint to check transfer status before attempting transfer
  fastify.get(
    "/:uuid/transfer-status",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              description: "Deal UUID",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 37,
          name: "Read",
        });
        // check access end

        const dealUuid = request.params.uuid;

        // Get deal details
        const deal = await fastify.prisma.deals.findUnique({
          where: {
            uuid: dealUuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            price: true,
            country_code: true,
          },
        });

        if (!deal) {
          return reply.status(404).send({
            success: false,
            message: "Deal not found",
          });
        }

        // Check transfer status
        const transferStatus = await fastify.checkDealTransferStatus(dealUuid);

        // Get available jars for this country
        const availableJars = await fastify.prisma.wise_jars.findMany({
          where: {
            country_code: deal.country_code,
            deleted_at: null,
            transfer_percent: {
              not: null,
              gt: 0,
            },
          },
          select: {
            uuid: true,
            name: true,
            currency: true,
            transfer_percent: true,
          },
          orderBy: {
            name: "asc",
          },
        });

        const totalPercentage = availableJars.reduce(
          (sum, jar) => sum + parseFloat(jar.transfer_percent || 0),
          0
        );

        reply.send({
          success: true,
          data: {
            deal: deal,
            transferStatus: transferStatus,
            availableJars: availableJars,
            jarsSummary: {
              totalJars: availableJars.length,
              totalPercentage: totalPercentage,
              canTransfer: availableJars.length > 0 && totalPercentage <= 100,
              percentageWarning:
                totalPercentage > 100 ? "Total percentage exceeds 100%" : null,
            },
            canTransfer:
              !transferStatus.hasSuccessfulTransfers &&
              availableJars.length > 0 &&
              totalPercentage <= 100,
            recommendations: {
              shouldTransfer:
                !transferStatus.hasSuccessfulTransfers &&
                availableJars.length > 0,
              needsForceTransfer: transferStatus.hasSuccessfulTransfers,
              hasFailedTransfers: transferStatus.failedTransfers > 0,
            },
          },
        });
      } catch (error) {
        fastify.log.error("Get deal transfer status error:", error);
        reply.status(500).send({
          success: false,
          message: error.message || "Failed to get deal transfer status",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
