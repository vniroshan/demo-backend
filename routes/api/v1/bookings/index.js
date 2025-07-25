"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");

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
          id: 58,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [
            {
              first_name: { contains: search, mode: "insensitive" },
            },
            {
              last_name: { contains: search, mode: "insensitive" },
            },
          ],
        };
        const items = await fastify.prisma.bookings.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            first_name: true,
            last_name: true,
            email: true,
            mobile: true,
            date: true,
            status: true,
            technicians:{
              select:{
                uuid: true,
                name: true,
                locations:{
                  select:{
                    uuid: true,
                    name: true
                  }
                }
              }
            }
          },
        });
        const totalCount = await fastify.prisma.bookings.count({
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
            id: {
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
          id: 58,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.bookings.findUnique({
          where: {
            uuid: request.params.uuid,
          },
           include:{
              technicians:{
                select:{
                uuid: true,
                name: true,
                locations:{
                  select:{
                    uuid: true,
                    name: true
                  }
                }
              }
            }}
        });
        
        reply.send(item);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/confirm",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
            },
          },
          required: ["uuid"],
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 59,
          name: "Confirm",
        });
        // check access end

        const bookingUuid = request.body.uuid;

        // Get the booking details with all necessary includes
        const booking = await fastify.prisma.bookings.findUnique({
          where: {
            uuid: bookingUuid,
          },
          include: {
            technicians: {
              select: {
                uuid: true,
                name: true,
              },
            },
          },
        });
        if (!booking) {
          return reply.code(404).send({
            error: true,
            message: "Booking not found",
          });
        }
        if (booking.status === "confirmed") {
          return reply.code(400).send({
            error: true,
            message: "Booking is already confirmed",
          });
        }
        const defaultMail =
          await fastify.prisma.technician_mail_templates.findFirst({
            where: {
              technician_uuid: booking.technician_uuid,
              is_default: true,
            },
          });
        // Get technician's user account
        const user = await fastify.prisma.users.findFirst({
          where: {
            technician_uuid: booking.technicians.uuid,
          },
          select: {
            uuid: true,
            google_calendar_token: true,
          },
        });

        if (!user || !user.google_calendar_token) {
          return reply.code(400).send({
            error: true,
            message: "Technician not found or Google Calendar not connected",
          });
        }
        if (defaultMail) {
          let messge = `Dear ${booking.first_name} ${booking.last_name},\n\n${defaultMail.body}`
          let title = `Regarding: Tapes To Digital Booking - ${booking.first_name} ${booking.last_name}`
          await fastify.email.sendSimpleEmail({
            user_uuid: user.uuid,
            cc_email: "contact@tapestodigital.com",
            title: title,
            message: messge,
            recipients: booking.email,
          });
        }

        let google_calendar_token = JSON.parse(user.google_calendar_token);

        // Validate Google token
        if (
          !google_calendar_token.google_services_connected ||
          !google_calendar_token.access_token
        ) {
          return reply.code(400).send({
            error: true,
            message: "Google services not connected for technician",
          });
        }

        // Check if token is expired
        if (moment().isAfter(moment(google_calendar_token.token_expires_at))) {
          return reply.code(401).send({
            error: true,
            message: "Google token expired for technician",
            code: "TOKEN_EXPIRED",
          });
        }

        // Setup Google Calendar API
        const oauth2Client = new google.auth.OAuth2(
          fastify.config.GOOGLE_CLIENT_ID,
          fastify.config.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: google_calendar_token.access_token,
          refresh_token: google_calendar_token.refresh_token,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Prepare calendar event data
        const startDateTime = moment(booking.time_start).toISOString();
        const endDateTime = moment(booking.time_end).toISOString();

        const eventData = {
          summary: `T2D Booking - ${booking.first_name} ${booking.last_name}`,
          description: `
Booking Details:
Customer: ${booking.first_name} ${booking.last_name}
Email: ${booking.email}
Mobile: ${booking.mobile}
Booking ID: ${booking.uuid}
Technician: ${booking.technicians.name}
        `.trim(),
          start: {
            dateTime: startDateTime,
            timeZone: "UTC",
          },
          end: {
            dateTime: endDateTime,
            timeZone: "UTC",
          },
          attendees: [
            {
              email: booking.email,
              displayName: `${booking.first_name} ${booking.last_name}`,
            },
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 }, // 24 hours before
              { method: "popup", minutes: 30 }, // 30 minutes before
            ],
          },
          colorId: "9", // Blue color for booking events
        };

        let calendarEvent = null;
        let calendarError = null;

        // Try to create calendar event
        try {
          calendarEvent = await calendar.events.insert({
            calendarId: "primary",
            resource: eventData,
            sendNotifications: true,
          });
        } catch (error) {
          fastify.log.error("Google Calendar event creation failed:", error);
          calendarError = error;
        }

        // Update booking status regardless of calendar event creation
        const updatedBooking = await fastify.prisma.bookings.update({
          where: {
            uuid: bookingUuid,
          },
          data: {
            status: "confirmed",
            modified_at: moment().toISOString(),
          },
        });

        // Prepare response based on calendar event creation success
        if (calendarEvent) {
          reply.send({
            success: true,
            message: "Booking confirmed successfully",
            booking: updatedBooking,
            calendar_event: {
              id: calendarEvent.data.id,
              link: calendarEvent.data.htmlLink,
              created: calendarEvent.data.created,
            },
          });
        } else {
          // Booking confirmed but calendar event failed
          reply.code(207).send({
            success: true,
            message: "Booking confirmed but calendar event creation failed",
            booking: updatedBooking,
            calendar_error: calendarError?.message || "Unknown calendar error",
            warning: "Manual calendar entry may be required",
          });
        }
      } catch (error) {
        fastify.log.error("Error confirming booking:", error);

        // Handle specific error types
        if (error.code === 401) {
          reply.code(401).send({
            error: true,
            message: "Authentication failed",
            code: "AUTH_FAILED",
          });
        } else if (error.code === 403) {
          reply.code(403).send({
            error: true,
            message: "Access forbidden",
            code: "ACCESS_FORBIDDEN",
          });
        } else if (error.code === 404) {
          reply.code(404).send({
            error: true,
            message: "Resource not found",
            code: "NOT_FOUND",
          });
        } else {
          reply.code(500).send({
            error: true,
            message: "Internal server error occurred while confirming booking",
            code: "INTERNAL_ERROR",
          });
        }
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/cancel",
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
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 60,
          name: "Cancel",
        });
        //  check access end

        const item = await fastify.prisma.bookings.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            status: "canceled",
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);

        let message = `Canceled booking "${item.first_name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Cancel",
          "bookings",
          item.id,
          message
        );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
  fastify.post(
    "/check-avilability",
    {
      schema: {
        tags: ["Customer"],
        body: {
          required: ["location"],
          type: "object",
          properties: {
            location: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        let location = await fastify.prisma.locations.findUnique({
          where: {
            slug: request.body.location,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            country_code: true,
            address: true,
            technicians: {
              select: {
                users: true,
              },
            },
          },
        });
        let user = location.technicians.users[0];

        if (!user || !user.google_calendar_token) {
          return reply
            .code(400)
            .send({ error: "User not found or Google Calendar not connected" });
        }

        let google_calendar_token = JSON.parse(user.google_calendar_token);

        const auth = new google.auth.OAuth2(
          fastify.config.GOOGLE_CLIENT_ID,
          fastify.config.GOOGLE_CLIENT_SECRET,
          fastify.config.CLIENT_APP_URL
        );

        auth.setCredentials(google_calendar_token);

        const calendar = google.calendar({ version: "v3", auth });

        const now = new Date().toISOString();
        const end = new Date(Date.now() + 7 * 86400000).toISOString();

        const events = await calendar.events.list({
          calendarId: "primary",
          timeMin: now,
          timeMax: end,
          singleEvents: true,
          orderBy: "startTime",
        });

        // Get unavailable times from Google Calendar
        const calendarUnavailable = events.data.items.map((e) => ({
          start: e.start.dateTime,
          end: e.end.dateTime,
        }));

        // Get pending bookings from database for this technician
        const pendingBookings = await fastify.prisma.bookings.findMany({
          where: {
            technician_uuid: location.technician_uuid,
            status: { notIn: ["collected", "cancelled"] },
            date: {
              gte: now.split("T")[0],
              lte: end.split("T")[0],
            },
          },
          select: {
            date: true,
            time_start: true,
            time_end: true,
          },
        });

        const pendingUnavailable = pendingBookings.map((booking) => ({
          start: `${booking.time_start}`,
          end: `${booking.time_end}`,
        }));

        // Combine both unavailable time arrays
        const unavailable = [...calendarUnavailable, ...pendingUnavailable];

        reply.send({
          unavailable: unavailable,
          location: {
            uuid: location.uuid,
            name: location.name,
            slug: location.slug,
            code: location.country_code,
            address: location.address,
          },
        });
      } catch (error) {
        console.error("Google Calendar API Error:", error);
        reply.code(500).send({ error: error.message });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/new",
    {
      schema: {
        tags: ["Customer"],
        body: {
          type: "object",
          required: [
            "location_uuid",
            "first_name",
            "last_name",
            "email",
            "mobile",
            "date",
            "time_start",
            "time_end",
          ],
          properties: {
            location_uuid: {
              type: "string",
            },
            first_name: {
              type: "string",
            },
            last_name: {
              type: "string",
            },
            email: {
              type: "string",
            },
            mobile: {
              type: "string",
            },
            date: {
              type: "string",
            },
            time_start: {
              type: "string",
            },
            time_end: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        let location = await fastify.prisma.locations.findUnique({
          where: {
            uuid: request.body.location_uuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            technician_uuid: true,
            technicians: true,
          },
        });

        let booking = await fastify.prisma.bookings.create({
          data: {
            uuid: uuidv4(),
            first_name: request.body.first_name,
            last_name: request.body.last_name,
            email: request.body.email,
            mobile: request.body.mobile,
            date: request.body.date,
            time_start: request.body.time_start,
            time_end: request.body.time_end,
            technician_uuid: location.technician_uuid,
            status: "pending", // Set initial status as pending
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        const webhookUrl = location.technicians.google_group_link;

        const messaget = {
          text: `Hello ${location.technicians.name},
New booking received:
Date: ${request.body.date}
Time: ${request.body.time_start} - ${request.body.time_end}
Booking ID: ${booking.uuid}
Status: Booking Confirmation`,
        };

        fastify.axios
          .post(webhookUrl, messaget)
          .then((response) => {
            console.log("Message sent to Google Chat:", response.data);
          })
          .catch((error) => {
            console.error(
              "Error sending message:",
              error.response?.data || error.message
            );
          });

        reply.send(booking);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
