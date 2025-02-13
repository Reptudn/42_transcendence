up:
	docker compose up --build

down:
	docker compose down

app:
	docker exec -it app /bin/sh
api:
	docker exec -it api /bin/sh

.PHONY: up down app api
