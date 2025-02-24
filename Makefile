CONTAINER_NAME=transcendence

start: build run

build:
	docker build -t $(CONTAINER_NAME) .

re:
	docker build --no-cache -t $(CONTAINER_NAME) .
	docker run --rm -p 4242:4242 --name $(CONTAINER_NAME) $(CONTAINER_NAME)

run:
	docker run --rm -p 4242:4242 --name $(CONTAINER_NAME) $(CONTAINER_NAME)

exec:
	docker exec -it $(CONTAINER_NAME) /bin/sh

log:
	find . -type f \
		-not -path "./node_modules/*" \
		-not -path "./.git/*" \
		-not -name "*.png" \
		-not -name "*.jpg" \
		-not -name "*.jpeg" \
		-not -name "*.db" \
		-not -name "*.pdf" \
		-not -name "*.ico" \
		-not -name "package-lock.json" \
		-print -exec echo "====> {} <====" \; -exec cat {} \; || true

.PHONY: build exec
