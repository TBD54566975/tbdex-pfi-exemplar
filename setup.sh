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
