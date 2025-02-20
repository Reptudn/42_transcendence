CONTAINER_NAME=transcendence

re:
	docker compose up -d --build

build:
	docker build -t $(CONTAINER_NAME) .

run:
	docker compose up -d


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

fclean:
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true
	docker rmi $(CONTAINER_NAME) || true

.PHONY: build exec
