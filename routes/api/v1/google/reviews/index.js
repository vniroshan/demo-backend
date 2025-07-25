"use strict";
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const _ = require("lodash");

module.exports = async function (fastify, opts) {
  // New route to sync Google reviews for all locations
 fastify.get(
    "/sync",
    {
      schema: {
        tags: ["Google Reviews"],
        description: "Fetch and sync Google reviews for all locations using Outscraper API",
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
        let totalReviewsAdded = 0;
        let processedLocations = 0;
        const errors = [];
        
        // Clear existing Google reviews
        await fastify.prisma.google_reviews.deleteMany({
          where: {
            type: "google",
          },
        });

        // Get all locations with place_id
        const locations = await fastify.prisma.locations.findMany({
          where: {
            place_id: {
              not: null,
            },
            deleted_at: null,
          },
          select: {
            uuid: true,
            name: true,
            place_id: true,
          },
        });

        if (locations.length === 0) {
          return reply.send({
            success: true,
            message: "No locations with place_id found",
            totalReviewsAdded: 0,
            processedLocations: 0,
          });
        }

        // Outscraper API configuration
        const apiKey = fastify.config.OUTSCRAPER_API_KEY;
        
        // Process each location
        for (const location of locations) {
          try {
            // Fetch reviews from Outscraper API
             const reviewsResponse = await fastify.axios.get(`https://api.app.outscraper.com/maps/reviews-v3?apiKey=${apiKey}&query=${location.place_id}&reviewsLimit=0&async=false`)
            if (reviewsResponse.data && reviewsResponse.data.data && reviewsResponse.data.data[0]) {
              const reviews = reviewsResponse.data.data[0].reviews_data || [];

              // Prepare review data for database insertion
              const reviewData = reviews.map((review) => {
                let relativeTimeDescription = null;
                
                // Calculate relative time from review_datetime_utc
                if (review.review_datetime_utc) {
                  try {
                    const reviewDate = moment(review.review_datetime_utc, 'M/D/YYYY H:mm:ss').utc();
                    relativeTimeDescription = reviewDate.fromNow();
                  } catch (dateError) {
                    fastify.log.warn(`Error parsing date for review: ${review.review_datetime_utc}`);
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
                };
              });

              // Insert reviews into database
              if (reviewData.length > 0) {
                await fastify.prisma.google_reviews.createMany({
                  data: reviewData,
                  skipDuplicates: true,
                });

                totalReviewsAdded += reviewData.length;
              }

              processedLocations++;

              // Add a small delay to respect API rate limits
              await new Promise((resolve) => setTimeout(resolve, 200));
            } else {
              errors.push({
                location: location.name,
                place_id: location.place_id,
                error: "No data returned from Outscraper API",
              });
            }
          } catch (locationError) {
            errors.push({
              location: location.name,
              place_id: location.place_id,
              error: locationError.message,
            });
          }
        }

        reply.send({
          success: true,
          message: "Google reviews sync completed using Outscraper API",
          totalReviewsAdded,
          processedLocations,
          totalLocations: locations.length,
          errors: errors.length > 0 ? errors : undefined,
        });
      } catch (error) {
        fastify.log.error("Error syncing Google reviews:", error);
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // New route: Get reviews by locations (similar to your PHP function)
  fastify.get(
    "/by-locations",
    {
      schema: {
        tags: ["Main"],
        description:
          "Get reviews by location IDs with high ratings (4-5 stars)",
        querystring: {
          type: "object",
          properties: {
            location_ids: {
              type: "string",
              description: "Comma-separated location ids (e.g., 1,2,3)",
            },
            rating_filter: {
              type: "boolean",
              description: "Filter for high ratings (4-5 stars). Default: true",
              default: true,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { location_ids, rating_filter = true } = request.query;

        // Parse location IDs from query parameter
        const locationIdsArray = location_ids
          ? location_ids.split(",").map((id) => parseInt(id.trim()))
          : [];

        // Build location filter
        const locationFilter = {
          deleted_at: null,
        };

        if (locationIdsArray.length > 0) {
          locationFilter.id = {
            in: locationIdsArray,
          };
        }

        // Build review filter
        const reviewFilter = {
          deleted_at: null,
        };

        // Add rating filter for high ratings (4-5 stars)
        if (rating_filter) {
          reviewFilter.rating = {
            in: [4, 5],
          };
        }

        // Fetch locations
        const locations = await fastify.prisma.locations.findMany({
          where: locationFilter,
          select: {
            uuid: true,
            id: true,
            name: true,
            address: true,
            review_link: true,
          },
        });

        let locationUUIdsArray = _.map(locations, "uuid");
        if (locationIdsArray.length > 0) {
          reviewFilter.location_uuid = {
            in: locationUUIdsArray,
          };
        }
        // Fetch reviews
        const reviews = await fastify.prisma.google_reviews.findMany({
          where: reviewFilter,
          select: {
            uuid: true,
            author_name: true,
            rating: true,
            text: true,
            relative_time_description: true,
            location_uuid: true,
            profile_image_url: true,
            created_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
        });

        // Create review_links object (similar to Laravel's pluck)
        const reviewLinks = {};
        locations.forEach((location) => {
          reviewLinks[location.uuid] = location.review_link;
        });

        const response = {
          review_links: reviewLinks,
          reviews: reviews,
          locations: locations,
          total_locations: locations.length,
          total_reviews: reviews.length,
        };

        reply.send(response);
      } catch (error) {
        fastify.log.error("Error fetching reviews by locations:", error);
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // Route to sync reviews for a specific location
  fastify.get(
    "/sync-location/:locationUuid",
    {
      schema: {
        tags: ["Google Reviews"],
        description: "Fetch and sync Google reviews for a specific location",
        params: {
          type: "object",
          properties: {
            locationUuid: { type: "string" },
          },
          required: ["locationUuid"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { locationUuid } = request.params;

        // Get the specific location
        const location = await fastify.prisma.locations.findUnique({
          where: {
            uuid: locationUuid,
            deleted_at: null,
          },
          select: {
            uuid: true,
            name: true,
            place_id: true,
          },
        });

        if (!location) {
          return reply.status(404).send({
            success: false,
            error: "Location not found",
          });
        }

        if (!location.place_id) {
          return reply.status(400).send({
            success: false,
            error: "Location does not have a place_id",
          });
        }

        // Fetch reviews from Google Places API
        const reviewsResponse = await fastify.axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json`,
          {
            params: {
              place_id: location.place_id,
              fields: "reviews",
              key: fastify.config.GOOGLE_PLACES_API_KEY,
            },
          }
        );

        if (reviewsResponse.data.status !== "OK") {
          return reply.status(400).send({
            success: false,
            error: `Google API Error: ${reviewsResponse.data.status}`,
          });
        }

        const reviews = reviewsResponse.data.result?.reviews || [];

        // Prepare review data for database insertion
        const reviewData = reviews.map((review) => ({
          uuid: uuidv4(),
          author_name: review.author_name || "Anonymous",
          rating: review.rating,
          text: review.text || null,
          relative_time_description: review.relative_time_description || null,
          location_uuid: location.uuid,
          profile_image_url: review.profile_photo_url || null,
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        }));

        // Insert reviews into database
        let reviewsAdded = 0;
        if (reviewData.length > 0) {
          await fastify.prisma.google_reviews.createMany({
            data: reviewData,
            skipDuplicates: true,
          });
          reviewsAdded = reviewData.length;
        }

        reply.send({
          success: true,
          message: `Reviews synced for location: ${location.name}`,
          location: location.name,
          reviewsAdded,
          reviews: reviewData,
        });
      } catch (error) {
        fastify.log.error("Error syncing location reviews:", error);
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // Route to get reviews for a specific location
  fastify.get(
    "/location/:locationUuid",
    {
      schema: {
        tags: ["Google Reviews"],
        description: "Get all reviews for a specific location",
        params: {
          type: "object",
          properties: {
            locationUuid: { type: "string" },
          },
          required: ["locationUuid"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { locationUuid } = request.params;

        const reviews = await fastify.prisma.google_reviews.findMany({
          where: {
            location_uuid: locationUuid,
            deleted_at: null,
          },
          include: {
            locations: {
              select: {
                name: true,
                address: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

        reply.send({
          success: true,
          count: reviews.length,
          reviews,
        });
      } catch (error) {
        fastify.log.error("Error fetching reviews:", error);
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
