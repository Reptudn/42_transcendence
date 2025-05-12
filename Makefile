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

.PHONY: log
