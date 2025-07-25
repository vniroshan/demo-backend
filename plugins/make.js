"use strict";

const fp = require("fastify-plugin");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

module.exports = fp(async function (fastify, opts) {
  fastify.decorate("tiggerSecondInvoice", async function (dealUuid) {
 try {
  // Fetch deal with all related data
  const dealData = await fastify.prisma.deals.findUnique({
    where: {
      uuid: dealUuid,
      deleted_at: null,
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
    }
  });
  const vatRate = vat?.value || 0;

  // Separate regular products and additional products
  const regularProducts = dealData.deal_products?.filter(product => !product.is_advance) || [];
  const additionalProducts = dealData.deal_products?.filter(product => product.is_advance) || [];

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
        dealData.pipeline_stages?.name?.toLowerCase() || "",
      pipeline: "default", 
      country: dealData.country_code || "",
      deal_currency_code: dealData.currency || "",
    },
    technician_process: {
      hs_object_id:
        dealData.technician_process?.hubspot_id || dealData.hubspot_id || "",
      assign_technician: dealData.technicians?.name || "",
      hs_pipeline_stage:
        dealData.pipeline_stages?.hubspot_stage_id ||
        dealData.pipeline_stages?.name?.toLowerCase() || "",
    },
    line_items: regularProducts.map(formatProductData),
    additional_products: additionalProducts.map(formatProductData),
  };

  const response = await fastify.axios.post(
    `https://hook.eu2.make.com/9r3sqk36juq3rkxylphm4yf8pnuqpm9w`,
    body,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000, // 10 second timeout
    }
  );

  return {
    success: true,
    message: `Make triggered for deal ${dealUuid}`,
    response: response.data,
  };
}catch (error) {
      console.log("Error in tiggerSecondInvoice:", error);
      throw error;
    } finally {
      await fastify.prisma.$disconnect();
    }
  });
});