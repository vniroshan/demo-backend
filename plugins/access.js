"use strict";

const fp = require("fastify-plugin");
const _ = require("lodash");

module.exports = fp(async function (fastify, opts) {
  fastify.register(require("@fastify/jwt"), {
    secret: "tapestodigital2025",
    messages: {
      noAuthorizationInHeaderMessage: "No Authorization was found.",
    },
    sign: {
      //expiresIn: 60,
      expiresIn: 60 * 60 * 24 * 30, //in seconds, expires in 30 days
    },
  });
  const obj = {
    // for checking access
    isAuth: async (params, permission) => {
      await params.jwtVerify();
    
      if (!params.user.role) throw new Error("The role is missing.");
      const user = await fastify.prisma.users.findUnique({
        where: {
          uuid: params.user.uuid,
        },
      });
    let access = await fastify.prisma.role_permissions.findUnique({
        where: {
          deleted_at: null,
          role_uuid_permission_id: {
            role_uuid: user.role_uuid,
            permission_id: permission.id,
          },
        },
      })

      // for public access
      if(permission.id ==0){
        access =true
      }
      if (!access) {
        throw new Error("You do not have permission to perform this action.");
      }
      
      if (!user.is_active) {
        throw new Error("Your account is deactivated.");
      }
      if (user.deleted_at) {
        throw new Error("Your account is deleted.");
      }
    },
  };
  fastify.decorate("access", obj);
});
