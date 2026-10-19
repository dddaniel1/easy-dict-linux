PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
APPDIR ?= $(PREFIX)/share/applications
ICONDIR ?= $(PREFIX)/share/icons/hicolor/64x64/apps

APP_NAME = easydict
BIN = bin/$(APP_NAME)

.PHONY: all build build-frontend run test clean install uninstall

all: build

build-frontend:
	@echo "Building React + Base UI frontend..."
	@cd frontend && pnpm run build

build: build-frontend
	@mkdir -p bin
	go build -ldflags="-s -w" -o $(BIN) ./cmd/easydict
	@echo "Build complete: $(BIN)"

run: build
	./$(BIN)

test:
	go test -v ./...
	@cd frontend && pnpm test
	@cd frontend && pnpm run typecheck

clean:
	rm -rf bin/ internal/assets/dist/

install: build
	@mkdir -p $(DESTDIR)$(BINDIR)
	@mkdir -p $(DESTDIR)$(APPDIR)
	@mkdir -p $(DESTDIR)$(ICONDIR)
	install -m 755 $(BIN) $(DESTDIR)$(BINDIR)/$(APP_NAME)
	install -m 644 assets/easydict.png $(DESTDIR)$(ICONDIR)/$(APP_NAME).png
	install -m 644 easydict.desktop $(DESTDIR)$(APPDIR)/$(APP_NAME).desktop
	@echo "Installed $(APP_NAME) to $(DESTDIR)$(BINDIR)/$(APP_NAME)"
	@which update-desktop-database > /dev/null 2>&1 && update-desktop-database $(DESTDIR)$(APPDIR) || true

uninstall:
	rm -f $(DESTDIR)$(BINDIR)/$(APP_NAME)
	rm -f $(DESTDIR)$(ICONDIR)/$(APP_NAME).png
	rm -f $(DESTDIR)$(APPDIR)/$(APP_NAME).desktop
	@echo "Uninstalled $(APP_NAME)"
