"use strict";

const fp = require("fastify-plugin");
const { OAuth2Client } = require("google-auth-library");
const cron = require("node-cron");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

class TokenScheduler {
  constructor(fastify) {
    this.fastify = fastify;
    this.scheduledJobs = new Map();
    this.initializeCronJob();
  }

  initializeCronJob() {
    // Run every hour to check for tokens that need refreshing
    this.hourlyJob = cron.schedule("*/20 * * * *", async () => {
      await this.refreshExpiredTokens();
    });

    this.googleReviewSyncJob = cron.schedule("0 7 * * *", async () => {
      await this.syncGoogleReviews();
    });

    // Run every 6 hours to clean up expired jobs
    this.cleanupJob = cron.schedule("0 */6 * * *", () => {
      this.cleanupExpiredJobs();
    });

    this.fastify.log.info("Token scheduler cron jobs initialized");
  }

  async refreshExpiredTokens() {
    try {
      this.fastify.log.info("Starting scheduled token refresh check...");

      // Find users with tokens expiring in the next 2 hours
      const usersToRefresh = await this.fastify.prisma.users.findMany({
        where: {
          google_calendar_token: {
            not: null,
          },
        },
        select: {
          id: true,
          email: true,
          google_calendar_token: true,
        },
      });

      const usersNeedingRefresh = [];
      const twoHoursFromNow = moment().add(2, "hours").valueOf();

      for (const user of usersToRefresh) {
        try {
          const token = JSON.parse(user.google_calendar_token);

          // Check if token expires within 2 hours or has already expired
          // if (token.google_token_expires_at && token.google_token_expires_at < twoHoursFromNow) {
          //   usersNeedingRefresh.push({
          //     ...user,
          //     parsedToken: token
          //   });
          // }
          usersNeedingRefresh.push({
            ...user,
            parsedToken: token,
          });
        } catch (parseError) {
          this.fastify.log.error(
            `Error parsing token for user ${user.id}:`,
            parseError
          );
        }
      }

      for (const user of usersNeedingRefresh) {
        await this.refreshUserToken(user.id, user.parsedToken.refresh_token);
      }

      if (usersNeedingRefresh.length > 0) {
        this.fastify.log.info(
          `Refreshed tokens for ${usersNeedingRefresh.length} users`
        );
      } else {
        this.fastify.log.info("No tokens needed refreshing");
      }
    } catch (error) {
      this.fastify.log.error("Error in scheduled token refresh:", error);
    }
  }

  async refreshUserToken(userId, refreshToken) {
    try {
      this.fastify.log.info(`Refreshing token for user ID: ${userId}`);

      if (!refreshToken) {
        this.fastify.log.warn(
          `No refresh token available for user ${userId}. User needs to reconnect.`
        );

        // Mark user as needing reconnection
        // await this.fastify.prisma.users.update({
        //   where: { id: userId },
        //   data: {
        //     google_calendar_token: JSON.stringify({
        //       google_services_connected: false,
        //       last_error: 'No refresh token available'
        //     }),
        //     modified_at: new Date().toISOString()
        //   }
        // });

        return { success: false, userId, error: "No refresh token available" };
      }

      const oauth2Client = new OAuth2Client(
        this.fastify.config.GOOGLE_CLIENT_ID,
        this.fastify.config.GOOGLE_CLIENT_SECRET,
        this.fastify.config.CLIENT_APP_URL
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Calculate expiry_date from expires_in if not provided
      const expiryDate =
        credentials.expiry_date || Date.now() + credentials.expires_in * 1000;

      // Update the token in database
      const updatedToken = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || refreshToken,
        scope: credentials.scope,
        token_type: credentials.token_type,
        expires_in: credentials.expires_in,
        token_expires_at: expiryDate,
        google_services_connected: true,
      };

      // Save updated token to database
      await this.fastify.prisma.users.update({
        where: { id: userId },
        data: {
          google_calendar_token: JSON.stringify(updatedToken),
          modified_at: new Date().toISOString(),
        },
      });

      this.fastify.log.info(
        `Token refreshed successfully for user ID: ${userId}`
      );

      // Schedule next refresh
      this.scheduleTokenRefresh(userId, expiryDate);

      return { success: true, userId };
    } catch (error) {
      this.fastify.log.error(
        `Failed to refresh token for user ${userId}:`,
        error
      );

      // Handle specific error cases
      let errorMessage = error.message;
      let needsReconnection = false;

      if (
        error.message.includes("invalid_grant") ||
        error.message.includes("Token has been expired or revoked")
      ) {
        errorMessage =
          "Refresh token expired or revoked - user needs to reconnect";
        needsReconnection = true;
      }

      // If refresh fails, mark as needing reconnection
      try {
        await this.fastify.prisma.users.update({
          where: { id: userId },
          data: {
            google_calendar_token: JSON.stringify({
              google_services_connected: false,
              last_error: errorMessage,
              last_error_at: new Date().toISOString(),
            }),
            modified_at: new Date().toISOString(),
          },
        });
      } catch (updateError) {
        this.fastify.log.error(
          "Failed to update user token with error info:",
          updateError
        );
      }

      return { success: false, userId, error: errorMessage, needsReconnection };
    }
  }

  scheduleTokenRefresh(userId, expiresAt) {
    // Schedule refresh 1 hour before expiry
    const refreshTime = moment(expiresAt).subtract(1, "hour");
    const now = moment();

    if (refreshTime.isAfter(now)) {
      const delay = refreshTime.diff(now);

      // Clear existing timeout if any
      if (this.scheduledJobs.has(userId)) {
        clearTimeout(this.scheduledJobs.get(userId));
      }

      // Schedule new refresh
      const timeoutId = setTimeout(async () => {
        try {
          const user = await this.fastify.prisma.users.findUnique({
            where: { id: userId },
            select: { google_calendar_token: true },
          });

          if (user?.google_calendar_token) {
            const token = JSON.parse(user.google_calendar_token);
            if (token.refresh_token) {
              await this.refreshUserToken(userId, token.refresh_token);
            }
          }
        } catch (error) {
          this.fastify.log.error(
            `Error in scheduled refresh for user ${userId}:`,
            error
          );
        } finally {
          this.scheduledJobs.delete(userId);
        }
      }, delay);

      this.scheduledJobs.set(userId, timeoutId);
      this.fastify.log.info(
        `Scheduled token refresh for user ${userId} in ${Math.round(
          delay / 1000 / 60
        )} minutes`
      );
    }
  }

  cleanupExpiredJobs() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, timeoutId] of this.scheduledJobs.entries()) {
      // This is a simple cleanup - in production you might want more sophisticated logic
      if (typeof timeoutId === "number" && timeoutId < now) {
        clearTimeout(timeoutId);
        this.scheduledJobs.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.fastify.log.info(
        `Cleaned up ${cleanedCount} expired scheduled jobs`
      );
    }
  }

  cancelScheduledRefresh(userId) {
    if (this.scheduledJobs.has(userId)) {
      clearTimeout(this.scheduledJobs.get(userId));
      this.scheduledJobs.delete(userId);
      this.fastify.log.info(`Cancelled scheduled refresh for user ${userId}`);
    }
  }

  async refreshAllTokens() {
    try {
      this.fastify.log.info("Starting manual refresh of all tokens...");

      const users = await this.fastify.prisma.users.findMany({
        where: {
          google_calendar_token: {
            not: null,
          },
        },
        select: {
          id: true,
          email: true,
          google_calendar_token: true,
        },
      });

      this.fastify.log.info(`Found ${users.length} users with Google tokens`);

      const results = [];
      for (const user of users) {
        try {
          const token = JSON.parse(user.google_calendar_token);
          const result = await this.refreshUserToken(
            user.id,
            token.refresh_token
          );
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            userId: user.id,
            error: error.message,
          });
        }
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      this.fastify.log.info(
        `Manual token refresh completed: ${successful} successful, ${failed} failed`
      );

      return {
        total: users.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      this.fastify.log.error("Error in manual token refresh:", error);
      throw error;
    }
  }

  async checkUserToken(userId) {
    const user = await this.fastify.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        google_calendar_token: true,
      },
    });

    if (!user || !user.google_calendar_token) {
      throw new Error("User not found or no Google token");
    }

    const token = JSON.parse(user.google_calendar_token);
    const now = Date.now();
    const expiryTime = token.token_expires_at;

    if (!expiryTime) {
      return {
        userId: user.id,
        email: user.email,
        tokenExpiry: "Unknown",
        expiresIn: "Unknown",
        needsRefresh: true,
      };
    }

    return {
      userId: user.id,
      email: user.email,
      tokenExpiry: new Date(expiryTime).toISOString(),
      expiresIn: Math.max(0, Math.floor((expiryTime - now) / 1000 / 60)), // minutes
      needsRefresh: expiryTime < now + 60 * 60 * 1000, // needs refresh within 1 hour
    };
  }

  async syncGoogleReviews() {
    try {
      let totalReviewsAdded = 0;
      let processedLocations = 0;
      const errors = [];

      this.fastify.log.info("Starting daily Google reviews sync...");

      // Clear existing Google reviews of type "google"
      await this.fastify.prisma.google_reviews.deleteMany({
        where: { type: "google" },
      });

      const locations = await this.fastify.prisma.locations.findMany({
        where: {
          place_id: { not: null },
          deleted_at: null,
        },
        select: {
          uuid: true,
          name: true,
          place_id: true,
        },
      });

      if (locations.length === 0) {
        this.fastify.log.info(
          "No locations with place_id found for Google reviews sync."
        );
        return;
      }

      const apiKey = this.fastify.config.OUTSCRAPER_API_KEY;

      for (const location of locations) {
        try {
          const reviewsResponse = await this.fastify.axios.get(
            `https://api.app.outscraper.com/maps/reviews-v3?apiKey=${apiKey}&query=${location.place_id}&reviewsLimit=0&async=false`
          );

          const reviews = reviewsResponse?.data?.data?.[0]?.reviews_data || [];

          const reviewData = reviews.map((review) => {
            let relativeTimeDescription = null;

            if (review.review_datetime_utc) {
              try {
                const reviewDate = moment(
                  review.review_datetime_utc,
                  "M/D/YYYY H:mm:ss"
                ).utc();
                relativeTimeDescription = reviewDate.fromNow();
              } catch (dateError) {
                this.fastify.log.warn(
                  `Error parsing review date: ${review.review_datetime_utc}`
                );
              }
            }

            return {
              uuid: uuidv4(),
              author_name: review.author_title || "Anonymous",
              rating: review.review_rating,
              text: review.review_text || null,
              relative_time_description: relativeTimeDescription,
              location_uuid: location.uuid,
              profile_image_url: review.author_image || null,
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
              type: "google",
            };
          });

          if (reviewData.length > 0) {
            await this.fastify.prisma.google_reviews.createMany({
              data: reviewData,
              skipDuplicates: true,
            });

            totalReviewsAdded += reviewData.length;
          }

          processedLocations++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err) {
          errors.push({
            location: location.name,
            place_id: location.place_id,
            error: err.message,
          });
        }
      }

      this.fastify.log.info(
        `Google Reviews Sync Complete: ${processedLocations}/${locations.length} locations, ${totalReviewsAdded} reviews added`
      );
      if (errors.length > 0) {
        this.fastify.log.warn(
          `Some errors occurred during review sync:`,
          errors
        );
      }
    } catch (mainError) {
      this.fastify.log.error("Failed to sync Google reviews:", mainError);
    }
  }

  stop() {
    // Stop cron jobs
    if (this.hourlyJob) {
      this.hourlyJob.stop();
    }
    if (this.cleanupJob) {
      this.cleanupJob.stop();
    }
    if (this.googleReviewSyncJob) {
      this.googleReviewSyncJob.stop();
    }

    // Clear all scheduled timeouts
    for (const [userId, timeoutId] of this.scheduledJobs.entries()) {
      clearTimeout(timeoutId);
    }
    this.scheduledJobs.clear();

    this.fastify.log.info("Token scheduler stopped");
  }
}

// Helper function to be used in routes
async function scheduleTokenRefresh(userId, expiresAt) {
  if (global.tokenScheduler) {
    global.tokenScheduler.scheduleTokenRefresh(userId, expiresAt);
  }
}

module.exports = fp(async (fastify, opts) => {
  // Create token scheduler instance
  const tokenScheduler = new TokenScheduler(fastify);

  // Store globally for helper function access
  global.tokenScheduler = tokenScheduler;

  // Decorate fastify with scheduler methods
  fastify.decorate("tokenScheduler", {
    // Manual refresh trigger
    refreshAllTokens: () => tokenScheduler.refreshAllTokens(),

    // Check specific user token
    checkUserToken: (userId) => tokenScheduler.checkUserToken(userId),

    // Schedule token refresh for specific user
    scheduleTokenRefresh: (userId, expiresAt) =>
      tokenScheduler.scheduleTokenRefresh(userId, expiresAt),

    // Cancel scheduled refresh
    cancelScheduledRefresh: (userId) =>
      tokenScheduler.cancelScheduledRefresh(userId),

    // Stop schedulers (for graceful shutdown)
    stop: () => tokenScheduler.stop(),
  });

  // Graceful shutdown
  fastify.addHook("onClose", async (instance, done) => {
    tokenScheduler.stop();
    done();
  });

  fastify.log.info("Token scheduler plugin loaded successfully");
});

// Export helper function
module.exports.scheduleTokenRefresh = scheduleTokenRefresh;
