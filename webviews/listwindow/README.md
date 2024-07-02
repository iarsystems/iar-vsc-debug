# Listwindows

## Rendering

Whenever a re-render is requested, the entire DOM (i.e. HTML tree) is cleared
and recreated. The rendering logic is divided into a number of components using
[custom HTML
elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
(no UI frameworks involved).

The main component is a `GridElement`, which renders all rows and columns,
including the headers. The `GridElement` component is based on the standard
`<table>` element, and contains `RowElement`s (`<tr>`), which contain
`CellElement`s (`<td>`s).

### Styling

Global styles can be added to `styles.css`. However, most components use a
shadow DOM to scope their content, meaning they are not affected by global
styles. We use types provided by the `csstype` package to define style rules in
typescript, and convert them to a `CSSStyleSheet` which is injected into a
component's shadow DOM. This lets us define styles in the same file/class as the
component they apply to.

## Thrift bindings

Listwindow code should use the thrift bindings in the local `thrift/` folder,
instead of the ones in `iar-vsc-common`. These are generated for the browser,
(with `-gen js:ts,commonjs` instead of `-gen js:ts,node`) and do not import any
Node libraries (which would be unavailable in a webview).

Note that we don't load the javascript support library yet
([text](https://github.com/apache/thrift/blob/master/lib/js/src/thrift.js)), so
we can't *call* the thrift code, but we can use its type definitions.

## Rendering features

* Text font
* Text alignment
* Disable selection on a per-cell basis
* Show/hide header row
* Show/hide grid
* Dim selection when losing focus

### Rendering Todo

* Text color & background color
* Dim display when frozen
* Checkboxes
* Drag-n-drop feedback
* Icons
* Progress-bars inside cells
* Draw "filler" cells to the right and below

## Functional features

* Resizable columns
* Save/restore column widths
* Tooltips (e.g. physical breakpoints)
* Mouse (single-click, double-click)

### Functional Todo

* Scrolling/navigation (keys, scrollbar, mousewheel, horizontal)
* Selection update (key navigation)
* Ensure visible
* Context menu
* Multiple selection (but no support in model yet)
* Cell editing
* Save/restore state
* Toolbars
* Drag-n-drop
* Drop-target feedback
* Generic drag-n-drop using the Drop() call
* Delay display-dimming on frozen to avoid flickering.
* Partial selection when editing cells (which models do this?)
* Sliding listmodels
* Clickable columns
