## Affiliate Linker for Medium (MVP) + DEV.to editor test

### Build & Load

1. Install deps:

```bash
cd extension
pnpm i # or npm i / yarn
```

2. Build:

```bash
pnpm build
```

3. In Chrome: go to `chrome://extensions`, enable Developer Mode, click "Load unpacked" and select the `extension` folder.

### Configure

- Open the extension options page and set:
  - Backend Base URL (must expose `POST /extract-products` and `POST /resolve-asins`)
  - Affiliate Tag
  - Link policy (first/all)

### Use

- Medium:

  - Open a Medium draft, a floating panel appears (bottom-right).
  - Click "Scan products" to detect and resolve product links.
  - Click "Apply links" to insert affiliate links in-place.
  - Use "Undo" to remove links added by the extension.

- DEV.to (editor write test):
  - Open `https://dev.to/new` (or an article edit page).
  - A floating panel titled "DEV.to Writer Test" appears.
  - Click "Insert test text" to append the text `Able to add` to the editor.
  - Works even without caret; appends at the end of content.
