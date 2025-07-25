"use strict";
const moment = require("moment");
const _ = require("lodash");

module.exports = async function (fastify, opts) {
  const { OAuth2Client } = require("google-auth-library");
  const moment = require("moment");
  const _ = require("lodash");

const { google } = require('googleapis');

// Get Calendar Events
fastify.post(
  "/events",
  {
    schema: {
      tags: ["Calendar"],
      body: {
        type: "object",
        properties: {
          start_date: { type: "string" },
          end_date: { type: "string" },
          timezone: { type: "string" }
        }
      }
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
      const { start_date, end_date, timezone = 'UTC' } = request.body;

      // Get user's Google token
      const user = await fastify.prisma.users.findUnique({
        where: {
          uuid: userId,
        },
        select: {
         google_calendar_token: true,
        },
      });

      
        let token = JSON.parse(user.google_calendar_token)

      if (!token.google_services_connected || !token.access_token) {
        return reply.code(401).send({
          error: true,
          message: "Google services not connected"
        });
      }

      // Check if token is expired
      if (moment().isAfter(moment(token.token_expires_at))) {
        return reply.code(401).send({
          error: true,
          message: "Google token expired",
          code: "TOKEN_EXPIRED"
        });
      }

      // Initialize Google Calendar API
      const oauth2Client = new google.auth.OAuth2(
        fastify.config.GOOGLE_CLIENT_ID,
        fastify.config.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Prepare date range
      const startDate = start_date ? new Date(`${start_date}T00:00:00`) : new Date();
      const endDate = end_date ? new Date(`${end_date}T23:59:59`) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Fetch events from Google Calendar
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      reply.send({
        success: true,
        events: events,
        count: events.length,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 401) {
        reply.code(401).send({
          error: true,
          message: "Google authentication failed",
          code: "AUTH_FAILED"
        });
      } else {
        reply.code(500).send({
          error: true,
          message: "Failed to fetch calendar events"
        });
      }
    } finally {
      await fastify.prisma.$disconnect();
    }
  }
);

// Create Calendar Event
fastify.post(
  "/events/new",
  {
    schema: {
      tags: ["Calendar"],
      body: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          start_datetime: { type: "string" }, // ISO 8601 format
          end_datetime: { type: "string" },   // ISO 8601 format
          timezone: { type: "string" },
          location: { type: "string" },
          attendees: { 
            type: "array", 
            items: { type: "string" } // Array of email addresses
          },
          reminder_minutes: { type: "number" }, // Minutes before event
          all_day: { type: "boolean" }
        },
        required: ["title", "start_datetime", "end_datetime"]
      }
    },
  },
  async (request, reply) => {
    try {
      // check access start
      // await fastify.access.isAuth(request, {
      //   id: 0,
      //   name: "Write", // Changed to Write permission for creation
      // });
      // check access end
      
      const userId = "cb60a272-f3f3-481b-8ef9-8d7783ffd321";
      const { 
        title, 
        description, 
        start_datetime, 
        end_datetime, 
        timezone = 'UTC',
        location,
        attendees = [],
        reminder_minutes = 15,
        all_day = false
      } = request.body;

      // Get user's Google token
      const user = await fastify.prisma.users.findUnique({
        where: {
          uuid: userId,
        },
        select: {
          google_calendar_token: true,
        },
      });

      let token = JSON.parse(user.google_calendar_token);

      if (!token.google_services_connected || !token.access_token) {
        return reply.code(401).send({
          error: true,
          message: "Google services not connected"
        });
      }

      // Check if token is expired
      if (moment().isAfter(moment(token.token_expires_at))) {
        return reply.code(401).send({
          error: true,
          message: "Google token expired",
          code: "TOKEN_EXPIRED"
        });
      }

      // Initialize Google Calendar API
      const oauth2Client = new google.auth.OAuth2(
        fastify.config.GOOGLE_CLIENT_ID,
        fastify.config.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Prepare event data
      const eventData = {
        summary: title,
        description: description || '',
        location: location || '',
        start: all_day ? 
          { date: moment(start_datetime).format('YYYY-MM-DD') } :
          { 
            dateTime: moment(start_datetime).toISOString(),
            timeZone: timezone 
          },
        end: all_day ? 
          { date: moment(end_datetime).format('YYYY-MM-DD') } :
          { 
            dateTime: moment(end_datetime).toISOString(),
            timeZone: timezone 
          },
        attendees: attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: reminder_minutes }
          ]
        }
      };

      // Create event in Google Calendar
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: eventData,
        sendNotifications: true // Send email notifications to attendees
      });

      const createdEvent = response.data;

      reply.send({
        success: true,
        message: "Event created successfully",
        event: {
          id: createdEvent.id,
          title: createdEvent.summary,
          description: createdEvent.description,
          start: createdEvent.start,
          end: createdEvent.end,
          location: createdEvent.location,
          attendees: createdEvent.attendees,
          html_link: createdEvent.htmlLink,
          created: createdEvent.created
        }
      });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 401) {
        reply.code(401).send({
          error: true,
          message: "Google authentication failed",
          code: "AUTH_FAILED"
        });
      } else if (error.code === 400) {
        reply.code(400).send({
          error: true,
          message: "Invalid event data",
          details: error.message
        });
      } else {
        reply.code(500).send({
          error: true,
          message: "Failed to create calendar event"
        });
      }
    } finally {
      await fastify.prisma.$disconnect();
    }
  }
);

};
