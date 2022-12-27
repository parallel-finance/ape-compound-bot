RELEASE_VERSION 									:= v0.1.0

.PHONY: init
init:
	echo "version: ${RELEASE_VERSION}"
	pnpm -w install && pnpm -w build

.PHONY: clean
clean:
	pnpm -w clean

.PHONY: lint
lint:
	pnpm -w lint --fix && pnpm -w lint

.PHONY: build
build: init
	pnpm -w build

.PHONY: run
run: init
	pnpm -w run start
