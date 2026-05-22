FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (even though we only have native ones right now, good practice)
RUN npm install

# Copy the rest of the code
COPY . .

# Run the script
CMD [ "npm", "start" ]