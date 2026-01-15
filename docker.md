
docker pull ghcr.io/michalmatynia/geminitestapp:latest
docker save -o geminitestapp_latest.tar ghcr.io/michalmatynia/geminitestapp:latest

docker pull postgres:16
docker save -o postgres_16.tar postgres:16

set
DATABASE_URL: postgresql://postgresuser:change_me@db:5432/stardb

# NAS

## NAS - SSH
ssh -p 22 herrEthic@192.168.0.31

# YAML
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: stardb
      POSTGRES_USER: postgresuser
      POSTGRES_PASSWORD: change_me
    volumes:
      - /volume1/docker/geminiapp/postgres:/var/lib/postgresql/data
    restart: unless-stopped

  web:
    image: ghcr.io/michalmatynia/geminitestapp:latest
    environment:
      DATABASE_URL: postgresql://postgresuser:change_me@db:5432/stardb
      NODE_ENV: production
      PORT: "3000"
    ports:
      - "3000:3000"
    depends_on:
      - db
    restart: unless-stopped

# Login in to Docker in Terminal

docker login ghcr.io -u michalmatynia

# Create multiarchitecture build
# (one-time) ensure buildx is ready
docker buildx create --use --name multiarch || docker buildx use multiarch
docker buildx inspect --bootstrap
DONE

#check if logged in
 docker buildx build --platform=linux/amd64 -t ghcr.io/michalmatynia/geminitestapp:latest --push .

#Working build that is non multiarchutecture
echo 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 | docker login ghcr.io -u michalmatynia --password-stdin

# build and push BOTH architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/michalmatynia/geminitestapp:latest \
  --push .
