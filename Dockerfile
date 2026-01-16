# ==========================
# Build stage
# ==========================
FROM node:20 AS builder

WORKDIR /app

# Copy only files for install
COPY package*.json ./
RUN npm install

# Copy rest of the files and build
COPY . .
RUN npm run build

# ==========================
# Serve stage (Nginx)
# ==========================
FROM nginx:stable-alpine

# Copy the build files from the first stage to Nginx public folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Config Nginx for React Router (fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
