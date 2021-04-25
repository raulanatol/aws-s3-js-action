.DEFAULT_GOAL := check

init:
	@echo "Initialising the project"
	@yarn

test:
	@echo "Testing..."
	@yarn test

build:
	@echo "👩‍🏭 Building..."
	@yarn build
	@yarn package

check: --pre_check test build
	@echo "✅"

clean:
	@echo "🛁 Cleaning..."
	@yarn clean

clean_all: clean
	@echo "🧨 Clean all"
	@rm -Rf node_modules yarn.lock

release_patch: release

release_minor: check
	@.scripts/finish-release minor

release_major: check
	@.scripts/finish-release major

release: check
	@.scripts/finish-release patch

--pre_check:
	@yarn run clean
	@yarn
	@yarn run lint
	@yarn run type-check
