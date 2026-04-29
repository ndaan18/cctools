# CC Tools

A simple internal tool library for sharing After Effects scripts, OpenFX plugins, and creative coding tools with colleagues.

## Adding a tool

Edit **`js/tools.js`** and add an entry to the `tools` array:

```js
{
  name: "My Tool",
  description: "What it does.",
  category: "ae-plugin",   // see categories below
  action: "download",      // "download" or "link"
  url: "plugins/my-tool.jsx",  // file path (download) or full URL (link)
}
```

### Categories

| Value          | Label     | Use for                          |
|----------------|-----------|----------------------------------|
| `"html-tool"`  | HTML Tool | Standalone HTML tools            |
| `"ae-plugin"`  | AE Script | After Effects `.jsx` scripts     |
| `"openfx"`     | OpenFX    | DaVinci Resolve / OpenFX plugins |
| `"other"`      | Other     | Anything else                    |

Any unknown category value will also render — it just gets a green badge.

### Plugin files

Drop plugin files into the `plugins/` folder and set `url` to `"plugins/filename.ext"` with `action: "download"`.

### HTML tools

Set `action: "link"` and `url` to the GitHub Pages URL or repo link.

## Hosting on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.
