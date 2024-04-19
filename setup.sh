#!/bin/bash

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Installing npm..."
    # Install npm
    curl -fsSL https://npmjs.org/install.sh | sh
else
    echo "npm is already installed."
fi

# Check if docker is installed and running
if ! docker info &> /dev/null; then
    echo "Docker is not installed or not running. Installing Docker..."
    # Install Docker
    curl -fsSL https://get.docker.com | sh
    # Start Docker
    sudo systemctl start docker
else
    echo "Docker is installed and running."
fi

# Check if dbmate is installed globally
if ! command -v dbmate &> /dev/null; then
    echo "dbmate is not installed. Installing dbmate globally..."
    npm install -g dbmate
else
    echo "dbmate is already installed."
fi

# Run database setup scripts
echo "Running database setup scripts..."
cd db/scripts || exit 1
./start-pg
# Check if migrations need to be run
if ! dbmate -d "$DATABASE_URL" status | grep "no migrations found" &> /dev/null; then
    echo "Running migrations..."
    ./migrate
else
    echo "No migrations found."
fi
cd ../../

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Copy environment variable file
echo "Copying environment variable file..."
cp .env.example .env

# Start the server
echo "Starting the server..."
npm run server

echo "Server started successfully."
