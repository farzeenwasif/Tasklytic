# Tasklytic API (Express + MongoDB)
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first so this layer is cached between code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
# multer writes uploads here before they go to Cloudinary
RUN mkdir -p public/temp && chown -R node:node /app

USER node
EXPOSE 8000
CMD ["node", "src/index.js"]
