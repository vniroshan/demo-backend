FROM node:20

# Set a working directory
WORKDIR /app

# **Install CA certificates**
USER root
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Copy the all of the application files
COPY . .

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Use ARGs for build-time variables
ARG APP_URL
ARG DATABASE_URL
ARG CLIENT_APP_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_PROJECT_ID
ARG GOOGLE_PLACES_API_KEY
ARG GOOGLE_BUCKET_NAME
ARG SPACE_DIR
ARG WISE_API_KEY
ARG WISE_API_KEY_UK
ARG WISE_API_KEY_AU
ARG WISE_API_URL
ARG HUBSPOT_APP_TOKEN
ARG HUBSPOT_API_URL
ARG STRIPE_SECRET_KEY_AU
ARG STRIPE_PUBLISHABLE_KEY_AU
ARG STRIPE_WEBHOOK_SECRET_AU
ARG STRIPE_SECRET_KEY_UK
ARG STRIPE_PUBLISHABLE_KEY_UK
ARG STRIPE_WEBHOOK_SECRET_UK
ARG NODE_TLS_REJECT_UNAUTHORIZED
ARG GOOGLE_CLIENT_SECRET
ARG OUTSCRAPER_API_KEY

# Set environment variables for runtime using ARG values
ENV APP_URL=$APP_URL \
    DATABASE_URL=$DATABASE_URL \
    CLIENT_APP_URL=$CLIENT_APP_URL \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    GOOGLE_PROJECT_ID=$GOOGLE_PROJECT_ID \
    GOOGLE_PLACES_API_KEY=$GOOGLE_PLACES_API_KEY \
    GOOGLE_BUCKET_NAME=$GOOGLE_BUCKET_NAME \
    SPACE_DIR=$SPACE_DIR \
    WISE_API_KEY=$WISE_API_KEY \
    WISE_API_KEY_UK=$WISE_API_KEY_UK \
    WISE_API_KEY_AU=$WISE_API_KEY_AU \
    WISE_API_URL=$WISE_API_URL \
    HUBSPOT_APP_TOKEN=$HUBSPOT_APP_TOKEN \
    HUBSPOT_API_URL=$HUBSPOT_API_URL \
    STRIPE_SECRET_KEY_AU=$STRIPE_SECRET_KEY_AU \
    STRIPE_PUBLISHABLE_KEY_AU=$STRIPE_PUBLISHABLE_KEY_AU \
    STRIPE_WEBHOOK_SECRET_AU=$STRIPE_WEBHOOK_SECRET_AU \
    STRIPE_SECRET_KEY_UK=$STRIPE_SECRET_KEY_UK \
    STRIPE_PUBLISHABLE_KEY_UK=$STRIPE_PUBLISHABLE_KEY_UK \
    STRIPE_WEBHOOK_SECRET_UK=$STRIPE_WEBHOOK_SECRET_UK \
     GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
    OUTSCRAPER_API_KEY=$OUTSCRAPER_API_KEY \
    NODE_TLS_REJECT_UNAUTHORIZED=$NODE_TLS_REJECT_UNAUTHORIZED 

# Expose the application port
EXPOSE 3000

# Use a non-root user for better security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# Set the default command
CMD ["npm", "run", "start"]