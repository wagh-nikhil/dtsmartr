# dtsmartr <img src="inst/htmlwidgets/dtsmartr.yaml" align="right" height="139" style="display:none;" />

**dtsmartr** is an interactive, Kaggle-style data explorer widget for R. Built with modern React (via `reactR`) and `htmlwidgets`, it provides a high-fidelity, ultra-responsive virtualized grid to browse, sort, and filter large datasets seamlessly.

It is designed to work beautifully inside the RStudio/Positron Viewer pane, embedded within Shiny applications, rendered in R Markdown/Quarto documents, or exported as standalone, self-contained HTML files for offline sharing.

---

## Key Features

1. **High-Fidelity Virtualized Layout**
   - **Virtualized Grid Rendering**: Renders massive datasets (e.g., thousands of rows and high-dimensional clinical tables) instantly by only painting visible cells in the viewport, ensuring zero lag.
   - **Sticky Coordinates**: Keeps top column headers and left row indices perfectly aligned and sticky during scrolling.
   - **Modern Aesthetics**: Curated dark/light typography, color-coded data-type badges, and smooth row hover transitions. Fully supports customizable themes (Auto, Light, Dark) programmatically via `dtsmartr_options()`.
   - **Missing Value Handling**: Represents missing values (`NA` / `null`) in elegant, italicized muted-gray cells, with customizable placeholder string support (`na_string`).

2. **User-Friendly Exploration Controls**
   - **Persistent Column Visibility Dropdown**: Dynamically toggle the visibility of individual columns in real-time. Displays badges showing the count of hidden columns.
   - **Categorical Dropdowns**: Perform quick, multi-selection checkbox filtering directly from the column headers.
   - **Label Support**: Displays column metadata descriptions (R attributes like `label`) inline with a clean violet label indicator.

3. **Advanced Multi-Condition Query Builder**
   - **Dynamic Logical Rules**: Combine multiple advanced query conditions using global `Match ALL (AND)` or `Match ANY (OR)` connectors.
   - **Searchable Checkbox Dropdowns**: The `is in` and `is not in` operators render a searchable checklist panel with helper links (`Select All` and `Clear`) to perform multi-category selection effortlessly.
   - **Type-Specific Controls**: Numeric fields offer number inputs, datetime fields present interactive calendar date-pickers, and character fields use text search.

4. **Reproducible Query Code Generator**
   - **One-Click Code Modal**: Tap the **📊 Query Code** button to reveal a tabbed modal generating the exact code needed to replicate your active filter state.
   - **Supported Syntaxes**: Outputs clean **tidyverse (dplyr)** pipelines, **Base R** subset operations, standard ANSI **SQL Queries**, **Arrow** collects, and **DuckDB / dbplyr** queries.
   - **Active Variable Selection**: If columns are hidden, the generators dynamically append column selection projections (dplyr `select()`, Base R arguments, SQL lists, etc.) to project only visible column subsets.
   - **Variable Name Auto-Extraction**: Automatically deparses and substitutes the R variable name (e.g. `adsl`) for copy-pasteable accuracy.

5. **Zero-Code Data Ingestion Wizard & Performance Routing**
   - **Ingestion Wizard**: Launch `dtsmart_launch()` with `data = NULL` to start an interactive file upload wizard powered by `datamods`. Drag and drop CSV, Excel, SAS datasets, or RDS files, then explore them instantly in a responsive, full-screen grid interface.
   - **Automatic Viewer Cap Protection**: If a dataset exceeds 50,000 rows, `dtsmartr()` automatically reroutes rendering in interactive sessions to `dtsmart_launch()` in an external browser, preventing viewer-pane freeze-ups.

---

## Installation

You can install the development version of **dtsmartr** directly from GitHub:

```r
# Install remotes if not already installed
if (!requireNamespace("remotes", quietly = TRUE)) {
  install.packages("remotes")
}

# Install dtsmartr
remotes::install_github("wagh-nikhil/DTExploR") # Rebranded to dtsmartr
```

---

## Quick Start

### 1. Basic Interactive Data Browsing

Open any data frame in your default RStudio or Positron Viewer panel:

```r
library(dtsmartr)

# Explore the classic motor trend car road tests dataset
dtsmartr(mtcars)

# Browse with customized settings
dtsmartr(
  data = mtcars,
  options = dtsmartr_options(
    theme = "dark",
    hidden_columns = c("cyl", "hp"),
    na_string = "Missing"
  )
)
```

### 2. Launch Ingestion Wizard (Bypassing CORS & Freezes)

To start the file ingestion wizard or explore large datasets in an external browser session:

```r
library(dtsmartr)

# 1. Start the zero-code ingestion wizard to drag-and-drop local files (CSV, XLSX, SAS, RDS)
dtsmart_launch()

# 2. Explore a large dataset directly in your default browser
dtsmart_launch(pharmaverseadam::adsl)
```

---

## Function Reference

### `dtsmartr_options(advanced_filter = TRUE, show_labels = TRUE, column_picker = TRUE, allow_export = TRUE, theme = "auto", na_string = "NA", hidden_columns = NULL)`
Helper function to customize UI display panels, themes, and default states.
- `advanced_filter`: Logical. Toggles advanced logical multi-condition query builder.
- `show_labels`: Logical. If `TRUE`, displays column attributes (like label description) inline in headers.
- `column_picker`: Logical. Displays column dropdown selector toggle.
- `allow_export`: Logical. Displays reproducible code query generation button.
- `theme`: UI appearance theme. Options are `"auto"`, `"light"`, or `"dark"`.
- `na_string`: Custom character string representing missing cells (defaults to `"NA"`).
- `hidden_columns`: Character vector of column names to hide by default on initial render.

### `dtsmartr(data, width = NULL, height = NULL, elementId = NULL, datasetName = NULL, options = dtsmartr_options())`
Creates the interactive virtualized htmlwidget grid.
- `data`: A `data.frame` to explore.
- `width` / `height`: Explicit widget dimensions. Defaults to full page container (`100%`).
- `elementId`: Optional static container ID.
- `datasetName`: Custom string representing the dataset in generated reproducible queries.
- `options`: Custom options list built using `dtsmartr_options()`.

### `dtsmart_launch(data = NULL, port = NULL, options = dtsmartr_options())`
Spins up a temporary local background Shiny server to serve the grid or file upload uploader wizard in your default browser.
- `data`: A `data.frame` to explore, or `NULL` (default) to start the file uploader wizard.
- `port`: Optional numeric port.
- `options`: UI options constructed via `dtsmartr_options()`.

### `save_dtsmartr(data, file, selfcontained = TRUE, title = "dtsmartr", open = FALSE, options = dtsmartr_options(), ...)`
Exports a `data.frame` as a fully interactive, standalone offline HTML file.
- `data`: A `data.frame` to explore.
- `file`: Path to the output HTML file.
- `selfcontained`: Logical. When `TRUE` (default), all JS/CSS resources and data are bundled in one portable HTML file. When `FALSE`, resources are written to a companion directory.
- `title`: Browser window / tab title.
- `open`: Logical. Open in default browser immediately after saving.
- `options`: Custom options list built using `dtsmartr_options()`.

```r
library(dtsmartr)

# Save mtcars as a fully self-contained portable HTML report with hidden columns
save_dtsmartr(
  data    = mtcars, 
  file    = "outputs/mtcars_report.html", 
  options = dtsmartr_options(hidden_columns = "hp"),
  open    = TRUE
)
```

---

## Developer Setup (Rebuilding React Assets)

The frontend is implemented in React inside `srcjs/dtsmartr.jsx` and compiled with Webpack. To compile frontend changes:

```bash
# Navigate into the package directory
cd dtsmartr

# Install NodeJS dependencies
npm install

# Compile React resources into inst/htmlwidgets/dtsmartr.js
npm run build
```

Inside R, re-generate documentation, namespaces, and re-install:
```r
# Generate Rd manuals and NAMESPACE
devtools::document()

# Install the package locally
devtools::install()
```

---

## License

This package is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
