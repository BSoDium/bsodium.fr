FROM node:18

LABEL org.opencontainers.image.description "App description."

ENV PORT 8080

# Set the working directory to the root of the project
WORKDIR /app

# Copy all files from build/ into the container
COPY build/ .

# COPY the docker_init.sh script into the container
COPY ./scripts/docker_init.sh .

# Install dependencies and copy the entrypoint script into /
RUN cp ./docker_init.sh /init.sh && chmod +x /init.sh
RUN yarn global add serve

# Expose port 8080
EXPOSE 8080

# Run the entrypoint script
ENTRYPOINT ["/init.sh"]