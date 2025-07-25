#!/bin/bash

# Parameters
REGION=$1
PROJECTID=$2
REPOSITORY=$3
IMAGE=$4
IMAGE_TAG=$5
HOST_PORT=$6
ENVIRONMENT=$7

# Log in to the container registry
gcloud auth configure-docker australia-southeast2-docker.pkg.dev

# Pull the image
docker pull $REGION/$PROJECTID/$REPOSITORY/$IMAGE:$IMAGE_TAG

# Define container name based on environment
CONTAINER_NAME="tape-2-digital-${ENVIRONMENT}"

# Stop and remove the existing container if it exists
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

# Run the new container with the specified host port
docker run -d --name $CONTAINER_NAME -p $HOST_PORT:3000 $REGION/$PROJECTID/$REPOSITORY/$IMAGE:$IMAGE_TAG