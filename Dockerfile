FROM node:alpine
WORKDIR /app
# Install a reliable static file server
RUN npm install -g serve
# Copy all project files
COPY . .
# Serve the current directory on the port provided by Cloud Run
CMD ["sh", "-c", "serve -s . -l $PORT"]
