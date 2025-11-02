# Use official Node.js LTS as base
FROM node:20-alpine

# Set working directory
WORKDIR /app


COPY package.json package-lock.json* ./ 

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
