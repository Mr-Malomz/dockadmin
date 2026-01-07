# Frontend Build

FROM --platform=linux/amd64 node:22-alpine AS frontend
WORKDIR /ui
COPY ui/package*.json ui/package-lock.json* ./
RUN npm install
COPY ui .
RUN npm run build

# Backend Build
FROM --platform=linux/amd64 rust:1.79-alpine AS backend
WORKDIR /backend
RUN apk add --no-cache musl-dev
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src
# Now copy and build actual source
COPY backend/src ./src
RUN cargo build --release


# Runtime
FROM gcr.io/distroless/cc-debian12
WORKDIR /
COPY --from=backend /backend/target/release/dockadmin .
COPY --from=frontend /ui/dist ./ui
EXPOSE 8080
CMD ["./dockadmin"]

