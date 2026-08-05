# Build stage
FROM maven:3.9.0-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml ./pom.xml
COPY src ./src
COPY .mvn ./.mvn
COPY mvnw ./mvnw
RUN chmod +x ./mvnw && ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080
ENV PORT=8080

CMD ["sh", "-c", "java -jar app.jar --server.port=$PORT"]
