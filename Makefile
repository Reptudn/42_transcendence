CONTAINER_NAME=transcendence

start: build run

build:
	mkdir -p back/db
	docker build -t $(CONTAINER_NAME) .

re:
	mkdir -p back/db
	docker build --no-cache -t $(CONTAINER_NAME) .
	docker run --rm -p 4242:4242 --env-file .env --name $(CONTAINER_NAME) $(CONTAINER_NAME)

run:
	docker run --rm -p 4242:4242 --env-file .env --name $(CONTAINER_NAME) $(CONTAINER_NAME)

exec:
	docker exec -it $(CONTAINER_NAME) /bin/sh

log_front:
	find front -type f \
		-not -name "*.png" \
		-not -name "*.jpg" \
		-not -name "*.jpeg" \
		-not -name "*.ico" \
		-print -exec echo "====> {} <====" \; -exec cat {} \; || true

log_back:
	find back -type f \
		-not -path "./node_modules/*" \
		-not -path "./.git/*" \
		-not -name "*.db" \
		-not -name "*.json" \
		-not -name "logs/*" \
		-not -name "package-lock.json" \
		-not -name "README.md" \
		-not -name ".gitignore" \
		-print -exec echo "====> {} <====" \; -exec cat {} \; || true

log: log_front log_back

.PHONY: build exec re run start log
