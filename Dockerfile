# Frontend Build
FROM --platform=linux/amd64 node:22-alpine AS frontend
WORKDIR /ui
COPY ui/package*.json ui/package-lock.json* ./
RUN npm install
COPY ui .
RUN npm run build

# Backend Build
FROM --platform=linux/amd64 rust:1-alpine AS backend
WORKDIR /backend
RUN apk add --no-cache musl-dev
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src
# Now copy and build actual source
COPY backend/src ./src
# Touch main.rs to force rebuild
RUN touch src/main.rs
RUN cargo build --release
# Strip the binary to reduce size
RUN strip target/release/backend

# Runtime
FROM alpine:latest
WORKDIR /
# Install libgcc/libstdc++ just in case dependencies need it (usually not for pure rust, but robust)
RUN apk add --no-cache libgcc
COPY --from=backend /backend/target/release/backend ./dockadmin
COPY --from=frontend /ui/dist ./ui
ENV IS_DOCKER=true
EXPOSE 3000
CMD ["./dockadmin"]

