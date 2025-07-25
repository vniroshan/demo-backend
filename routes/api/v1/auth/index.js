"use strict";
const moment = require("moment");
const { OAuth2Client } = require("google-auth-library");
const _ = require("lodash");

module.exports = async function (fastify, opts) {
  async function exchangeCodeForTokens(
    code,
    clientId,
    clientSecret,
    redirectUri
  ) {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const tokenData = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    };

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }
    let tokens = {};
    let data = await response.json();
    tokens.refresh_token = data.refresh_token;
    tokens.expires_in = data.expires_in;
    tokens.access_token = data.access_token;
    tokens.token_type = "Bearer";
    tokens.scope = data.scope;
    tokens.google_services_connected = true;
    return tokens;
  }

  async function refreshAccessToken(refreshToken, clientId, clientSecret) {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const refreshData = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(refreshData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh access token: ${errorText}`);
    }

    return await response.json();
  }

  async function revokeGoogleToken(token) {
    try {
      const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${token}`;

      const response = await fetch(revokeUrl, {
        method: "POST",
      });

      if (!response.ok) {
        fastify.log.warn(`Token revocation failed: ${response.status}`);
      }
    } catch (error) {
      fastify.log.error(`Error revoking Google token: ${error.message}`);
    }
  }

  // Encryption utilities (you'll need to implement these based on your crypto setup)
  async function encryptToken(token) {
    // Implement your encryption logic here
    // Example using Node.js crypto:
    const crypto = require("crypto");
    const algorithm = "aes-256-gcm";
    const secretKey = fastify.config.ENCRYPTION_KEY; // Store this securely

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, secretKey);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
  }
  const { OAuth2Client } = require("google-auth-library");
  const moment = require("moment");
  const _ = require("lodash");
  // Connect Google Services
  fastify.post(
    "/google-services",
    {
      // preHandler: [fastify.authenticate],
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["access_token", "expires_in"],
          properties: {
            access_token: {
              type: "string",
            },
            expires_in: {
              type: "number",
            },
            scope: {
              type: "string",
            },
            token_type: {
              type: "string",
            },
            granted_scopes: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
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
        const userId = request.user.uuid;
        const { access_token, expires_in, scope, token_type, granted_scopes } =
          request.body;

        // Calculate expiration time
        const expiresAt = moment().add(expires_in, "seconds").toISOString();

        // Verify the access token with Google
        const CLIENT_ID = fastify.config.GOOGLE_CLIENT_ID;
        const client = new OAuth2Client(CLIENT_ID);

        try {
          const tokenInfo = await client.getTokenInfo(access_token);
          if (tokenInfo.aud !== CLIENT_ID) {
            throw new Error("Invalid access token");
          }
        } catch (error) {
          throw new Error("Invalid Google access token");
        }

        // Try to get refresh token using the access token
        let refreshToken = null;
        try {
          // Note: This is a simplified approach. In production, you might need to
          // handle refresh token differently based on your OAuth flow
          const oauth2Client = new OAuth2Client(
            CLIENT_ID,
            fastify.config.GOOGLE_CLIENT_SECRET
          );
          oauth2Client.setCredentials({ access_token });

          // If this is the first time connecting, we might get a refresh token
          // Otherwise, we'll need to use the existing one or prompt for consent again
          refreshToken = oauth2Client.credentials.refresh_token;
        } catch (error) {
          fastify.log.warn("Could not obtain refresh token:", error.message);
        }
        let user_access_token = {};
        user_access_token.google_services_connected = true;
        user_access_token.google_access_token = access_token;
        user_access_token.google_refresh_token = refreshToken;
        user_access_token.google_token_expires_at = expiresAt;
        user_access_token.google_scopes = scope;
        // Update user with Google services info
        const updatedUser = await fastify.prisma.users.update({
          where: {
            uuid: userId,
          },
          data: {
            google_calendar_token: JSON.stringify(user_access_token),
            //  google_granted_scopes: JSON.stringify(granted_scopes || []),
            modified_at: moment().toISOString(),
          },
          select: {
            uuid: true,
          },
        });

        // Schedule token refresh job
        // await scheduleTokenRefresh(userId, expiresAt);

        reply.send({
          success: true,
          message: "Google services connected successfully",
          token_info: {
            expires_at: expiresAt,
            scopes: granted_scopes,
            connected: true,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({
          error: true,
          message: error.message || "Failed to connect Google services",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
  // Check Google Connection Status
  fastify.get(
    "/google-status",
    {
      schema: {
        tags: ["Auth"],
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
        const userId = request.user.uuid;

        const user = await fastify.prisma.users.findUnique({
          where: {
            uuid: userId,
          },
          select: {
            google_calendar_token: true,
          },
        });

        let token = JSON.parse(user.google_calendar_token);

        const isExpired = token.token_expires_at
          ? moment().isAfter(moment(token.token_expires_at))
          : true;

        reply.send({
          connected: token.google_services_connected || false,
          token_info: token.google_services_connected
            ? {
                expires_at: token.token_expires_at,
                is_expired: isExpired,
                scopes: token.scope,
              }
            : null,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          error: true,
          message: "Failed to check Google status",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // Updated login endpoint
  fastify.post(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["auth_type"],
          properties: {
            auth_type: {
              type: "string",
              enum: ["google_id_token", "google_oauth"],
            },
            id_token: {
              type: "string",
              description: "Google ID token for id_token auth",
            },
            google_access_token: {
              type: "string",
              description: "Google access token for oauth auth",
            },
            user_info: {
              type: "object",
              description: "User info from Google for oauth auth",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const CLIENT_ID = fastify.config.GOOGLE_CLIENT_ID;
        const client = new OAuth2Client(CLIENT_ID);
        let payload;
        let address = null
        // Handle different authentication types
        if (request.body.auth_type === "google_id_token") {
          // Original ID token verification
          const ticket = await client.verifyIdToken({
            idToken: request.body.id_token,
            audience: CLIENT_ID,
          });
          payload = ticket.getPayload();
        } else if (request.body.auth_type === "google_oauth") {
          // OAuth access token verification
          const ticket = await client.getTokenInfo(
            request.body.google_access_token
          );
          if (ticket.aud !== CLIENT_ID) {
            throw new Error("Invalid access token audience");
          }
          payload = request.body.user_info;
        } else {
          throw new Error("Invalid authentication type");
        }

        // Find or create user
        let user = await fastify.prisma.users.findUnique({
          where: {
            email: payload.email,
          },
        });

        if (!user) {
          throw new Error("The user not found.");
        }
        let access_token = {};

        // Update user with latest info
        user = await fastify.prisma.users.update({
          where: {
            uuid: user.uuid,
          },
          data: {
            profile_image_url: payload.picture,
            google_calendar_token: JSON.stringify({google_services_connected: false}),
            last_login_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
          select: {
            id: true,
            uuid: true,
            email: true,
            profile_image_url: true,
            is_active: true,
            deleted_at: true,
            google_calendar_token: true,
            admins: {
              select: {
                name: true,
              },
            },
            technicians: {
              select: {
                uuid: true,
                name: true,
              },
            },
            roles: true,
          },
        });

        const permissions = await fastify.prisma.role_permissions.findMany({
          where: {
            role_uuid: user.roles.uuid,
          },
          select: {
            permissions: {
              select: {
                id: true,
                name: true,
                models: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        let type = [];
        if (user.admins) {
          type.push("admin");
        }
        if (user.technicians) {
          type.push("technician");
          let location = await fastify.prisma.locations.findFirst({
            where:{
              technician_uuid: user.technicians.uuid
            }
          })
          address = location.address
        }

        const token = fastify.jwt.sign({
          id: user.id,
          uuid: user.uuid,
          role: user.roles.name,
          type: type,
          email: user.email,
          role_uuid: user.roles.uuid,
          technician_uuid: user.technicians ? user.technicians.uuid : null,
        });

        let resp = {};
        resp.uuid = user.uuid;
        resp.name = user.admins ? user.admins.name : user.technicians.name;
        resp.technician_uuid = user.technicians ? user.technicians.uuid : null;
        resp.email = user.email;
        resp.profile_image_url = user.profile_image_url;
        resp.role = user.role;
        resp.token = token;
        resp.address = address
        resp.permissions = _.map(permissions, (item) => item.permissions.id);

        // Include Google services status
        resp.google_services_connected =
          user.google_services_connected || false;
        resp.google_token_info = null;

        if (user.google_services_connected && user.google_token_expires_at) {
          resp.google_token_info = {
            expires_at: user.google_token_expires_at,
            is_expired: moment().isAfter(moment(user.google_token_expires_at)),
          };
        }

        reply.send(resp);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({
          error: true,
          message: error.message || "Authentication failed",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.get(
    "/sync",
    {
      schema: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 0,
          name: "General",
        });
        //  check access end

        const user = await fastify.prisma.users.findUnique({
          where: {
            id: request.user.id,
          },
          select: {
            id: true,
            email: true,
            profile_image_url: true,
            is_active: true,
            deleted_at: true,
            admins: {
              select: {
                name: true,
              },
            },
            technicians: {
              select: {
                name: true,
              },
            },
            roles: true,
          },
        });
        const permissions = await fastify.prisma.role_permissions.findMany({
          where: {
            role_id: user.roles.id,
            deleted_at: null,
          },
          select: {
            permissions: {
              select: {
                id: true,
                name: true,
                models: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
        const token = fastify.jwt.sign({
          id: user.id,
          role: user.roles.name,
          email: user.email,
          role_id: user.roles.id,
        });

        user.token = token;
        user.permissions = permissions;
        reply.send(user);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/google-services-callback",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["code"],
          properties: {
            code: {
              type: "string",
              description: "Authorization code from Google OAuth",
            },
            grant_type: {
              type: "string",
              default: "authorization_code",
            },
          },
        },
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
        const userId = request.user.uuid;

        // Exchange authorization code for tokens
        const tokenResponse = await exchangeCodeForTokens(
          request.body.code,
          fastify.config.GOOGLE_CLIENT_ID,
          fastify.config.GOOGLE_CLIENT_SECRET,
          `${fastify.config.APP_URL}/api/v1/auth/google-services-callback`
        );
        if (!tokenResponse.refresh_token) {
          throw new Error(
            "No refresh token received. User may need to revoke access and re-authorize."
          );
        }

        // Calculate expiration time
        const expiresAt = moment()
          .add(tokenResponse.expires_in, "seconds")
          .toISOString();
        tokenResponse.token_expires_at = expiresAt;

        // // Store tokens in database
        // await fastify.prisma.google_tokens.upsert({
        //   where: {
        //     user_id: userId,
        //   },
        //   update: {
        //     access_token: encryptedAccessToken,
        //     refresh_token: encryptedRefreshToken,
        //     token_type: tokenResponse.token_type || 'Bearer',
        //     expires_at: expiresAt,
        //     scope: tokenResponse.scope,
        //     modified_at: moment().toISOString(),
        //   },
        //   create: {
        //     user_id: userId,
        //     access_token: encryptedAccessToken,
        //     refresh_token: encryptedRefreshToken,
        //     token_type: tokenResponse.token_type || 'Bearer',
        //     expires_at: expiresAt,
        //     scope: tokenResponse.scope,
        //     created_at: moment().toISOString(),
        //     modified_at: moment().toISOString(),
        //   },
        // });

        // // Update user's Google services status
        await fastify.prisma.users.update({
          where: {
            uuid: userId,
          },
          data: {
            google_calendar_token: JSON.stringify(tokenResponse),
            modified_at: moment().toISOString(),
          },
        });

        fastify.log.info(
          `Google services connected successfully for user ${userId}`
        );

        reply.send({
          success: true,
          message: "Google services connected successfully",
          google_services_connected: true,
          token_info: {
            expires_at: expiresAt,
            scopes: tokenResponse.scope,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({
          error: true,
          message: error.message || "Failed to connect Google services",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.get(
    "/google-services-callback",
    {
      schema: {
        tags: ["Auth"],
        querystring: {
          type: "object",
          properties: {
            code: { type: "string" },
            error: { type: "string" },
            state: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code, error, state } = request.query;
        const frontendUrl = fastify.config.CLIENT_APP_URL;

        if (error) {
          fastify.log.error(`Google OAuth error: ${error}`);
          return reply.redirect(`${frontendUrl}/dashboard?error=${error}`);
        }

        if (!code) {
          fastify.log.error("No authorization code received from Google");
          return reply.redirect(`${frontendUrl}/dashboard?error=no_code`);
        }

        // Redirect back to frontend with the code
        return reply.redirect(
          `${frontendUrl}/dashboard?code=${code}&state=${state}`
        );
      } catch (error) {
        fastify.log.error(error);
        return reply.redirect(
          `${fastify.config.FRONTEND_URL}/dashboard?error=callback_error`
        );
      }
    }
  );
};
