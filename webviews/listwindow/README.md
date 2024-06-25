# Listwindows

## Rendering

Whenever a re-render is requested, the entire DOM (i.e. HTML tree) is cleared
and  recreated. The main component is a `GridElement`, which renders all rows
and columns, including the headers. This component uses a framework called
*[lit](https://lit.dev/)*, which is a thin wrapper around [custom HTML
elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).
*Lit* provides better ergonomics for creating css rules, and scoping these rules
using shadow DOMs.

The `GridElement` component is based on the standard `<table>` element, and
contains `RowElement`s, which contain `CellElement`s. Note that `RowElement` and
`CellElement` do not use *lit*; they need to inherit from the standard table row
(`<tr>`) and table cell (`<td>`) elements in order for the table to render
properly, and *lit* does not support inheriting from standard HTML elements.

### Styling

Global styles can be added to `styles.css`. However, the main `GridElement`
component uses a shadow DOM, meaning most global styles are not applied to it.

Instead, most styles are defined as a static variable inside the `GridElement`
component class, and are injected into the component by *lit*.
