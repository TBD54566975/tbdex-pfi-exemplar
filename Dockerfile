# Use the official Node.js image as the base image
FROM node:lts as base

# Set the working directory inside the container
WORKDIR /home/node/app

# Copy package.json and package-lock.json to the working directory
COPY --chown=node:node . /home/node/app/

# Install the application dependencies
RUN npm i
RUN npm run build

# Download and install dbmate
RUN curl -fsSL https://github.com/amacneil/dbmate/releases/download/v1.12.1/dbmate-linux-amd64 -o dbmate \
    && chmod +x dbmate \
    && mv dbmate /usr/local/bin

# TODO: maybe remove
# COPY --chown=node:node --from=base /home/node/app/site/build /usr/share/nginx/html/

WORKDIR /home/node/app/site/build
EXPOSE 9000
CMD [ "npm", "server" ]