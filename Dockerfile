FROM node:20-slim

# Install Tesseract OCR + Arabic language data
RUN apt-get update && \
    apt-get install -y tesseract-ocr tesseract-ocr-ara tesseract-ocr-eng && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Install frontend dependencies and build
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

EXPOSE 3001

CMD ["node", "--import", "tsx", "server/src/index.ts"]
