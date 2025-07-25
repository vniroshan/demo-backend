"use strict";

const fp = require("fastify-plugin");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = fp(async function (fastify, opts) {
  const activityLogger = {
    async logAction(userId, action, model,model_id, description) {
      try {
        await fastify.prisma.activity_logs.create({
          data: {
            uuid: uuidv4(),
            user_uuid: userId,
            action: action,
            model: model,
            model_id:model_id,
            description: description,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error(`Failed to log activity: ${error}`);
      }
      return { message: "Success!" };
    },
  };

  fastify.decorate("activityLogger", activityLogger);
});
