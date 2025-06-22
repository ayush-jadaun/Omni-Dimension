FROM node:18-alpine

# Install Python and bypass pip restrictions
RUN apk add --no-cache python3 py3-pip

# Create app directory
WORKDIR /app

# Install Python dependencies with --break-system-packages
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Create logs directory
RUN mkdir -p logs

# Copy app source (fix the copy command)
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application using the correct entry point
CMD ["node", "app.js"]