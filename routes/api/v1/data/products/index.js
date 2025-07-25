"use strict";
const _ = require("lodash");

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["Data"],
      },
    },
    async (request, reply) => {
      try {
         // check access start
        await fastify.access.isAuth(request, {
          id: 0,
          name: "Read",
        });
        //  check access end
        let where = {
          deleted_at: null,
        };
        const items = await fastify.prisma.products.findMany({
          where: where,
          orderBy: {
            sort: "desc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        });
        reply.send(items);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/by-order-uuid",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["order_uuid"],
          properties: {
            order_uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get technician order
        let technician_order =
          await fastify.prisma.technician_orders.findUnique({
            where: {
              uuid: request.body.order_uuid,
            },
          });

        if (!technician_order) {
          return reply.code(404).send({ error: "Order not found" });
        }

        // Get products already in the order
        const orderProducts =
          await fastify.prisma.technician_order_products.findMany({
            where: {
              deleted_at: null,
              technician_order_uuid: request.body.order_uuid,
            },
            select: {
              product_uuid: true,
              quantity: true,
            },
          });

        // Create a map for quick lookup of order products
        const orderProductsMap = new Map();
        orderProducts.forEach((item) => {
          orderProductsMap.set(item.product_uuid, item.quantity);
        });

        // Get all technician products
        let technician_products =
          await fastify.prisma.technician_products.findMany({
            where: {
              deleted_at: null,
              technician_uuid: technician_order.technician_uuid,
            },
            select: {
              id: true,
              uuid: true,
              product_uuid: true,
              price: true,
              currency: true,
              products: {
                select: {
                  id: true,
                  uuid: true,
                  name: true,
                },
              },
            },
          });

        // Transform the data to include all required fields
        const transformedItems = technician_products.map((item) => {
          const isInOrder = orderProductsMap.has(item.product_uuid);
          return {
            id: item.id,
            uuid: item.product_uuid,
            technician_product_uuid: item.uuid,
            name: item.products.name,
            price: item.price,
            currency: item.currency,
            quantity: isInOrder ? orderProductsMap.get(item.product_uuid) : 0,
            is_checked: isInOrder,
          };
        });

        reply.send(transformedItems);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

    fastify.post(
    "/all-by-order-uuid",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["order_uuid"],
          properties: {
            order_uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get technician products
        const technicianProducts =
          await fastify.prisma.technician_order_products.findMany({
            where: {
              deleted_at: null,
              technician_order_uuid: request.body.order_uuid,
            },
            select: {
              id: true,
              uuid: true,
              product_uuid: true,
              quantity: true,
            },
          });

        // Create a map for quick lookup of technician products
        const technicianProductsMap = new Map();
        technicianProducts.forEach((item) => {
          technicianProductsMap.set(item.product_uuid, {
            technician__order_product_uuid: item.uuid,
            quantity: item.quantity,
          });
        });

        // Get all products
        const products = await fastify.prisma.products.findMany({
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        });

        // Transform the data to include all required fields
        const transformedItems = products.map((item) => {
          const technicianProduct = technicianProductsMap.get(item.uuid);
          const isInTechnicianProducts = technicianProduct !== undefined;

          return {
            id: item.id,
            uuid: item.uuid,
            technician__order_product_uuid: isInTechnicianProducts
              ? technicianProduct.technician__order_product_uuid
              : null,
            name: item.name,
            quantity: isInTechnicianProducts ? technicianProduct.quantity : null,
            is_checked: isInTechnicianProducts,
          };
        });

        reply.send(transformedItems);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/by-technician-uuid",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["technician_uuid"],
          properties: {
            technician_uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get technician products
        const technicianProducts =
          await fastify.prisma.technician_products.findMany({
            where: {
              deleted_at: null,
              technician_uuid: request.body.technician_uuid,
            },
            select: {
              id: true,
              uuid: true,
              product_uuid: true,
              stock: true,
              price: true,
              is_inventory: true,
              currency: true,
            },
          });

        // Create a map for quick lookup of technician products
        const technicianProductsMap = new Map();
        technicianProducts.forEach((item) => {
          technicianProductsMap.set(item.product_uuid, {
            technician_product_uuid: item.uuid,
            stock: item.stock,
            is_inventory: item.stock,
            price: item.price,
            currency: item.currency,
          });
        });

        // Get all products
        const products = await fastify.prisma.products.findMany({
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        });

        // Transform the data to include all required fields
        const transformedItems = products.map((item) => {
          const technicianProduct = technicianProductsMap.get(item.uuid);
          const isInTechnicianProducts = technicianProduct !== undefined;

          return {
            id: item.id,
            uuid: item.uuid,
            technician_product_uuid: isInTechnicianProducts
              ? technicianProduct.technician_product_uuid
              : null,
            name: item.name,
            price: isInTechnicianProducts ? technicianProduct.price : null,
            currency: isInTechnicianProducts
              ? technicianProduct.currency
              : null,
            stock: isInTechnicianProducts ? technicianProduct.stock : 0,
            is_inventory: isInTechnicianProducts
              ? technicianProduct.is_inventory
              : false,
            is_checked: isInTechnicianProducts,
          };
        });

        reply.send(transformedItems);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/inventory-by-technician-uuid",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["technician_uuid"],
          properties: {
            technician_uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get technician products
        const technicianProducts =
          await fastify.prisma.technician_products.findMany({
            where: {
              deleted_at: null,
              is_inventory: true,
              technician_uuid: request.body.technician_uuid,
            },
            select: {
              id: true,
              uuid: true,
              product_uuid: true,
              stock: true,
              is_inventory: true,
              currency: true,
            },
          });
        let selectedIds = _.map(technicianProducts, "product_uuid");
        // Create a map for quick lookup of technician products
        const technicianProductsMap = new Map();
        technicianProducts.forEach((item) => {
          technicianProductsMap.set(item.product_uuid, {
            technician_product_uuid: item.uuid,
            stock: item.stock,
            is_inventory: item.stock,
            price: item.price,
            currency: item.currency,
          });
        });

        // Get all products
        const products = await fastify.prisma.products.findMany({
          where: {
            deleted_at: null,
            uuid: { in: selectedIds },
          },
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        });

        // Transform the data to include all required fields
        const transformedItems = products.map((item) => {
          const technicianProduct = technicianProductsMap.get(item.uuid);
          const isInTechnicianProducts = technicianProduct !== undefined;

          return {
            id: item.id,
            uuid: item.uuid,
            technician_product_uuid: isInTechnicianProducts
              ? technicianProduct.technician_product_uuid
              : null,
            name: item.name,
            price: isInTechnicianProducts ? technicianProduct.price : null,
            currency: isInTechnicianProducts
              ? technicianProduct.currency
              : null,
            stock: isInTechnicianProducts ? technicianProduct.stock : 0,
            is_inventory: isInTechnicianProducts
              ? technicianProduct.is_inventory
              : false,
            is_checked: isInTechnicianProducts,
          };
        });

        reply.send(transformedItems);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/by-product-ids",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["technician_uuid", "product_ids"],
          properties: {
            technician_uuid: {
              type: "string",
            },
            product_ids: {
              type: "array",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get technician products
        const technicianProducts =
          await fastify.prisma.technician_products.findMany({
            where: {
              deleted_at: null,
              technician_uuid: request.body.technician_uuid,
            },
            select: {
              id: true,
              uuid: true,
              product_uuid: true,
              stock: true,
              price: true,
              is_inventory: true,
              currency: true,
            },
          });

        // Create a map for quick lookup of technician products
        const technicianProductsMap = new Map();
        technicianProducts.forEach((item) => {
          technicianProductsMap.set(item.product_uuid, {
            technician_product_uuid: item.uuid,
            stock: item.stock,
            is_inventory: item.stock,
            price: item.price,
            currency: item.currency,
          });
        });

        // Get all products
        const products = await fastify.prisma.products.findMany({
          where: {
            deleted_at: null,
            hubspot_id: { in: request.body.product_ids },
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            hubspot_id: true,
          },
        });

        // Transform the data to include all required fields
        const transformedItems = products.map((item) => {
          const technicianProduct = technicianProductsMap.get(item.uuid);
          const isInTechnicianProducts = technicianProduct !== undefined;

          return {
            id: item.id,
            uuid: item.uuid,
            hubspot_id: item.hubspot_id,
            technician_product_uuid: isInTechnicianProducts
              ? technicianProduct.technician_product_uuid
              : null,
            name: item.name,
            price: isInTechnicianProducts ? technicianProduct.price : null,
            currency: isInTechnicianProducts
              ? technicianProduct.currency
              : null,
            stock: isInTechnicianProducts ? technicianProduct.stock : 0,
            is_inventory: isInTechnicianProducts
              ? technicianProduct.is_inventory
              : false,
            is_checked: isInTechnicianProducts,
          };
        });

        reply.send(transformedItems);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/by-invoice-uuid",
    {
      schema: {
        tags: ["Data"],
        body: {
          type: "object",
          required: ["invoice_uuid"],
          properties: {
            invoice_uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        let invoice = await fastify.prisma.technician_invoices.findUnique({
          where: {
            uuid: request.body.invoice_uuid,
          },
          include: {
            technician_orders: true,
          },
        });

        if (!invoice) {
          return reply.code(404).send({ error: "Deal not found" });
        }

        // Get products already in the order
        const dealProducts = await fastify.prisma.deal_products.findMany({
          where: {
            deleted_at: null,
            deal_uuid: invoice.technician_orders.deal_uuid,
          },
          select: {
            product_uuid: true,
            quantity: true,
            price: true,
            is_advance: true,
          },
        });

        // Create a map for quick lookup of order products with pricing info
        const orderProductsMap = new Map();
        dealProducts.forEach((item) => {
          orderProductsMap.set(item.product_uuid, {
            quantity: item.quantity,
            deal_price: item.price,
            is_advance: item.is_advance,
          });
        });

        let products = await fastify.prisma.products.findMany({
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            uuid: true,
            hubspot_id: true,
            price: true,
            currency: true,
            name: true,
          },
        });

        // Transform the data to include all required fields
        const transformedItems = products.map((item) => {
          const dealProduct = orderProductsMap.get(item.uuid);
          const isInOrder = dealProduct !== undefined;

          let finalPrice = item.price; // fallback to product base price

          if (isInOrder && dealProduct.deal_price) {
            // Use deal product price
            finalPrice = dealProduct.deal_price;

            // If not advanced, apply 50% discount
            if (!dealProduct.is_advance) {
              finalPrice = dealProduct.deal_price * 0.5;
            }
          }

          return {
            id: item.id,
            uuid: item.uuid,
            name: item.name,
            price: finalPrice,
            hubspot_id: item.hubspot_id,
            currency: item.currency,
            quantity: isInOrder ? dealProduct.quantity : 0,
            is_checked: isInOrder,
          };
        });

        reply.send(transformedItems);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
