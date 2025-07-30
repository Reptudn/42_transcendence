COMPOSE_FILE = docker-compose.yml
SERVICE_NAME = transcendence

GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

.PHONY: help start stop restart down build rebuild logs status clean health

help:
	@echo "$(GREEN)Available commands:$(NC)"
	@echo "  $(YELLOW)start$(NC)     - Start the application"
	@echo "  $(YELLOW)stop$(NC)      - Stop the application"
	@echo "  $(YELLOW)restart$(NC)   - Restart the application"
	@echo "  $(YELLOW)down$(NC)      - Stop and remove containers"
	@echo "  $(YELLOW)build$(NC)     - Build the Docker image"
	@echo "  $(YELLOW)rebuild$(NC)   - Rebuild and start the application"
	@echo "  $(YELLOW)clean$(NC)     - Clean up containers, networks, and volumes"
	@echo "  $(YELLOW)log$(NC)       - Log all files"

start:
	@echo "$(GREEN)Starting transcendence application...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)Application started!$(NC)"

stop:
	@echo "$(YELLOW)Stopping transcendence application...$(NC)"
	docker compose -f $(COMPOSE_FILE) stop
	@echo "$(YELLOW)Application stopped!$(NC)"

restart: stop start
	@echo "$(GREEN)Application restarted!$(NC)"

down:
	@echo "$(RED)Stopping and removing containers...$(NC)"
	docker compose -f $(COMPOSE_FILE) down
	@echo "$(RED)Containers removed!$(NC)"

build:
	@echo "$(GREEN)Building Docker image...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)Image built!$(NC)"

rebuild: down build start
	@echo "$(GREEN)Application rebuilt and started!$(NC)"

clean: down
	@echo "$(RED)Cleaning up containers, networks, and images...$(NC)"
	docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans
	docker system prune -f
	@echo "$(RED)Cleanup complete!$(NC)"

log:
	find app -type f \
		-not -path "*/node_modules/*" \
		-not -path "./.git/*" \
		-not -name "*.db" \
		-not -name "*.json" \
		-not -name "*.pdf" \
		-not -name "*.png" \
		-not -name "*.ico" \
		-not -path "logs/*" \
		-not -path "db/*" \
		-not -path "*dist/*" \
		-not -path "*app/public/js*" \
		-not -name "package-lock.json" \
		-not -name "README.md" \
		-not -name ".gitignore" \
		-print -exec echo "====> {} <====" \; -exec cat {} \; || true

.PHONY: help start stop restart down build rebuild clean log
