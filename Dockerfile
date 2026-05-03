# Stage 1: Build the frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and run the app
FROM node:20-slim
WORKDIR /app

# Install dependencies for the backend
# PUPPETEER_SKIP_DOWNLOAD=true skips Chromium download (~300MB), since puppeteer
# is only used in offline scripts, not the live chat server.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev && npm cache clean --force

# Copy backend source
COPY backend/ ./
# Copy built frontend assets from the first stage
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
# Copy shared prompts and config
COPY prompts/ /app/prompts/
COPY config/ /app/config/

# Set environment variables
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
