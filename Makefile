.PHONY: help install game novel split read test build

PYTHON ?= python3
PORT ?= 8765

help:
	@printf '%s\n' \
		'make game      Install dependencies and run Tycho: Helium Fever' \
		'make read      Build the novel reader and serve it at localhost:8000' \
		'make novel     Rebuild chapter-by-chapter HTML in novel/' \
		'make split     Split astrans.md into manuscript/chapters/' \
		'make test      Run the game test suite' \
		'make build     Build both novel reader and production game'

install:
	npm --prefix tycho-helium-fever install

game: install
	npm --prefix tycho-helium-fever run dev

novel:
	$(PYTHON) scripts/build_novel.py
	$(PYTHON) scripts/check_novel.py

split:
	$(PYTHON) scripts/split_manuscript.py

read: novel
	@printf '%s\n' 'Open http://127.0.0.1:$(PORT)/novel/'
	$(PYTHON) -m http.server $(PORT) --bind 127.0.0.1

test:
	npm --prefix tycho-helium-fever test

build: novel install
	npm --prefix tycho-helium-fever run build
