## Step 1: Build the Vite app
#FROM node:18-alpine AS build
#
#WORKDIR /app
#COPY package*.json ./
#RUN npm install
#COPY . .
#RUN npm run build   # generates /dist
#
## Step 2: Serve the built files with Nginx
#FROM nginx:1.25-alpine
#
#COPY --from=build /app/dist /usr/share/nginx/html
#
## Expose port 80
#EXPOSE 80
#
#CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# This image will be used only to produce /app/dist into a volume.
CMD ["sh", "-c", "rm -rf /out/* && cp -r dist/* /out/ && echo 'Frontend built to /out'"]
