# DOM Explorer — Interactive Task Manager (Pure JavaScript)

A fully interactive Task Manager built with only **HTML, CSS, and Vanilla JavaScript** — no frameworks, no libraries.

## Files

- `index.html` — markup and structure
- `style.css` — styling (light/dark blueprint theme)
- `script.js` — all behavior

Open `index.html` directly in a browser, or deploy the folder as-is to Netlify, Vercel, or GitHub Pages (no build step required).

## Concepts demonstrated

### Parsing & Tokenization
When the browser receives `index.html`, it reads the raw characters and breaks them into **tokens** — start tags, end tags, attribute names/values, and text. This step is called tokenization, and it happens before any tree is built.

### DOM Tree
The parser turns the token stream into the **DOM Tree**: a tree of objects representing every element, attribute, and text node, in the page (`<html>` → `<body>` → `<section>` → ...). This is the tree `document.createElement()`, `appendChild()`, and friends operate on.

### CSSOM Tree
In parallel, the browser parses `style.css` into the **CSSOM Tree** (CSS Object Model) — a tree describing every style rule and how it cascades.

### Render Tree
The DOM Tree and CSSOM Tree are combined into the **Render Tree**, which contains only the nodes that are actually visible (no `display: none` elements) along with their computed styles. The browser uses this tree for layout and paint.

The app includes a visual "How this page got on screen" panel that diagrams this whole flow with boxes and arrows.

### Attributes vs Properties
- An **attribute** is what's written in the HTML markup, e.g. `value="Hello DOM"`. It stays fixed unless changed with `setAttribute()` / `removeAttribute()`.
- A **property** is the live JavaScript value on the DOM object, e.g. `input.value`. It updates instantly as the user types, independent of the original attribute.

The "Attributes vs. Properties" panel lets you type into a field and compare `input.value` against `input.getAttribute("value")` side by side, demonstrating that they diverge as soon as you edit the field. The app also uses `getAttribute()`, `setAttribute()`, `removeAttribute()`, `hasAttribute()`, and `dataset` throughout (e.g. each task card carries `data-id`, `data-status`, and `data-category`).

### DOM Manipulation
Task cards are built with `createElement()`, `createTextNode()`, and `append()`. Beyond that, the project deliberately uses every required manipulation method somewhere:

| Method | Where it's used |
|---|---|
| `append()` | Building each task card; adding child nodes |
| `prepend()` | New tasks are added to the **top** of the list |
| `before()` | Inserting the "Press Enter to save" hint before the action buttons |
| `after()` | Inserting the "✓ Done" badge right after the title |
| `replaceWith()` | Swapping a task's title `<p>` for an `<input>` (and back) when editing |
| `remove()` | Deleting a task; removing badges/hints when no longer needed |

### Event Handling
`addEventListener()` powers every interaction: submitting the Add Task form, toggling the theme, comparing attribute vs. property, and clicking inside the propagation demo.

### Event Delegation
Rather than attaching a listener to every Edit/Complete/Delete button, **one** click listener lives on the `#task-list` container. It inspects `event.target`, walks up with `closest('button[data-action]')`, and dispatches based on `data-action`. This means tasks created after the page loads are fully interactive with zero extra listeners.

### Event Bubbling & Capturing
The "Event Propagation" panel has a `Grandparent > Parent > Child Button` structure. Each of the three elements has **two** listeners: one registered for the capture phase (`{ capture: true }`) and one for the default bubble phase. Clicking the button logs, in order:

```
CAPTURE → Grandparent
CAPTURE → Parent
CAPTURE → Child Button
BUBBLE  → Child Button
BUBBLE  → Parent
BUBBLE  → Grandparent
```

Capturing travels **top-down** toward the target; bubbling travels **bottom-up** away from it. The log is shown both on-page and in the browser console.

## Bonus features included

- Task search (filters by title as you type)
- Filter by category
- Pending / Completed task counters
- Clear All Tasks (with confirmation)
- `DocumentFragment` used when re-rendering the full task list, batching DOM insertions into a single reflow
- Local Storage integration — tasks and the selected theme both persist across page reloads

## Evaluation alignment

| Criteria | Weight | Where it's covered |
|---|---|---|
| DOM Manipulation | 30% | `script.js` — card creation, edit/complete/delete logic |
| Event Handling & Delegation | 25% | Form submit, theme toggle, `#task-list` delegated listener |
| Attributes vs Properties | 15% | Dedicated demo panel + data attributes on every card |
| Code Quality | 15% | Commented, modular functions, no inline `onclick` |
| UI/UX | 15% | Responsive layout, dark/light theme, empty state, counters |
