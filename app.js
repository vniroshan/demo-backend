"use strict";

const path = require("path");
const AutoLoad = require("@fastify/autoload");
const fastifyEnv = require("@fastify/env");

// Pass --options via CLI arguments in command to enable these options.
const schema = {
  type: "object",
  required: [
    "APP_URL",
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_PROJECT_ID",
    "GOOGLE_BUCKET_NAME",
    "SPACE_DIR",
    "HUBSPOT_APP_TOKEN",
    "HUBSPOT_API_URL",
    "WISE_API_KEY_UK",
    "WISE_API_KEY_AU",
    "WISE_API_URL",
    "GOOGLE_PLACES_API_KEY",
    "GOOGLE_CLIENT_SECRET",
    "CLIENT_APP_URL",
    "OUTSCRAPER_API_KEY",
    "STRIPE_SECRET_KEY_AU",
    "STRIPE_WEBHOOK_SECRET_AU",
    "STRIPE_PUBLISHABLE_KEY_AU",
     "STRIPE_SECRET_KEY_UK",
    "STRIPE_WEBHOOK_SECRET_UK",
    "STRIPE_PUBLISHABLE_KEY_UK"
  ],
  properties: {
    APP_URL: {
      type: "string",
    },
    DATABASE_URL: {
      type: "string",
    },
    GOOGLE_CLIENT_ID: {
      type: "string",
    },
    GOOGLE_PROJECT_ID: {
      type: "string",
    },
    GOOGLE_BUCKET_NAME: {
      type: "string",
    },
    SPACE_DIR: {
      type: "string",
    },
    HUBSPOT_APP_TOKEN: {
      type: "string",
    },
    HUBSPOT_API_URL: {
      type: "string",
    },
    WISE_API_KEY_UK: {
      type: "string",
    },
    WISE_API_KEY_AU: {
      type: "string",
    },
    WISE_API_URL: {
      type: "string",
    },
    GOOGLE_PLACES_API_KEY: {
      type: "string",
    },
    GOOGLE_CLIENT_SECRET: {
      type: "string", 
    },
    CLIENT_APP_URL: {
      type: "string",
    },
    OUTSCRAPER_API_KEY: {
      type: "string",
    },
    STRIPE_SECRET_KEY_AU: {
      type: "string",
    },
    STRIPE_WEBHOOK_SECRET_AU: {
      type: "string",
    },
    STRIPE_PUBLISHABLE_KEY_AU: {
      type: "string",
    },
     STRIPE_SECRET_KEY_UK: {
      type: "string",
    },
    STRIPE_WEBHOOK_SECRET_UK: {
      type: "string",
    },
    STRIPE_PUBLISHABLE_KEY_UK: {
      type: "string",
    },
  },
};

const options = {
  schema: schema,
  dotenv: true,
};

module.exports = async function (fastify, opts) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(fastifyEnv, options).after((err) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    fastify.register(AutoLoad, {
      dir: path.join(__dirname, "plugins"),
      options: Object.assign({}, opts),
    });

    // This loads all plugins defined in routes
    // define your routes in one of these
    fastify.register(AutoLoad, {
      dir: path.join(__dirname, "routes"),
      options: Object.assign({}, opts),
      routeParams: true,
    });
  });
};
