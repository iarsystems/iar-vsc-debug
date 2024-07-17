# Listwindows

## Rendering

Whenever a re-render is requested, almost the entire DOM (i.e. HTML tree) is cleared
and recreated. The rendering logic is divided into a number of components using
[custom HTML
elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
(no UI frameworks involved).

The main component is a `GridElement`, which renders all rows and columns,
including the headers. The `GridElement` component is based on the CSS `grid`
feature, which gives us great control over the size and scaling of individual
columns. The `GridElement` in turn is made up of `RowElement`s which are made up
of `CellElement`s.

While the main `GridElement` is recreated for each re-render, some parts of the UI
rely on frontend-exclusive state that needs to be kept between renders (e.g. any
active tooltip, any cell being edited or any open context menu). These elements are
provided by various "services" that keep track of their own state and add their own
UI elements *outside* of the HTML tree that is replaced on each render.

### Styling

All styling is done via `@emotion/css` and its `css` function. This lets us
define styles in Typesript code, typically in a `Styles` namespace adjacent to
each component.

The following links provide a short introduction to the `css` function:

* [Introduction](https://emotion.sh/docs/introduction)
* [Best Practices](https://emotion.sh/docs/best-practices)

Some styling needs to change dynamically based on some global state, and needs
to affect multiple components. Such styling are managed by `src/theming.ts`,
which changes the values of some CSS variables depending on e.g. whether the
view is in focus.

## Thrift bindings

Listwindow code should use the thrift bindings in the local `thrift/` folder,
instead of the ones in `iar-vsc-common`. These are generated for the browser,
(with `-gen js:ts,commonjs` instead of `-gen js:ts,node`) and do not import any
Node libraries (which would be unavailable in a webview).

Note that we don't load the javascript support library yet
([available here](https://github.com/apache/thrift/blob/master/lib/js/src/thrift.js)), so
we can't *call* the thrift code, but we can use its type definitions.

## Rendering features

* Text font
* Text alignment
* Disable selection on a per-cell basis
* Show/hide header row
* Show/hide grid
* Dim selection when losing focus
* Drag-n-drop feedback

### Rendering Todo

* Text color & background color
* Dim display when frozen
* Checkboxes
* Icons
* Progress-bars inside cells
* Draw "filler" cells to the right and below

## Functional features

* Resizable columns
* Save/restore column widths
* Tooltips (e.g. physical breakpoints)
* Mouse (single-click, double-click)
* Cell editing
* Drag-n-drop within a listwindow
* Drop-target feedback
* Context menu

### Functional Todo

* Scrolling/navigation (keys, scrollbar, mousewheel, horizontal)
* Selection update (key navigation)
* Ensure visible
* Multiple selection (but no support in model yet)
* Save/restore state
* Toolbars
* Delay display-dimming on frozen to avoid flickering.
* Partial selection when editing cells (which models do this?)
* Sliding listmodels
* Clickable columns
* Drag-n-drop between different listwindows
