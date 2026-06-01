# DTExploR <img src="inst/htmlwidgets/dtexplor.yaml" align="right" height="139" style="display:none;" />

[![R-CMD-check](https://img.shields.io/badge/R--CMD--check-passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**DTExploR** is an interactive, Kaggle-style data explorer widget for R. Built with modern React (via `reactR`) and `htmlwidgets`, it provides a high-fidelity, ultra-responsive virtualized grid to browse, sort, and filter large datasets seamlessly. 

It is designed to work beautifully inside the RStudio/Positron Viewer pane, embedded within Shiny applications, rendered in R Markdown/Quarto documents, or exported as standalone, self-contained HTML files for offline sharing.

---

## Key Features

1. **High-Fidelity Virtualized Layout**
   - **Virtualized Grid Rendering**: Renders massive datasets (e.g., thousands of rows and high-dimensional clinical tables) instantly by only painting visible cells in the viewport, ensuring zero lag.
   - **Sticky Coordinates**: Keeps top column headers and left row indices perfectly aligned and sticky during scrolling.
   - **Modern Aesthetics**: Curated dark/light typography, color-coded data-type badges, and smooth row hover transitions.
   - **Booleans & NA Handling**: Renders logical columns perfectly and represents missing values (`NA` / `null`) in elegant, italicized muted-gray cells.

2. **User-Friendly Exploration Controls**
   - **Persistent Column Visibility Dropdown**: Dynamically toggle the visibility of individual columns in real-time. Displays badges showing the count of hidden columns.
   - **Categorical Dropdowns**: Perform quick, multi-selection checkbox filtering directly from the column headers.
   - **Label Support**: Displays column metadata descriptions (R attributes like `label`) inline with a clean violet label indicator.

3. **Advanced Multi-Condition Query Builder**
   - **Dynamic Logical Rules**: Combine multiple advanced query conditions using global `Match ALL (AND)` or `Match ANY (OR)` connectors.
   - **Searchable Checkbox Dropdowns**: The `is in` and `is not in` operators render a searchable checklist panel with helper links (`Select All` and `Clear`) to perform multi-category selection effortlessly.
   - **Type-Specific Controls**: Numeric fields offer number inputs, datetime fields present interactive calendar date-pickers, and character fields use text search.

4. **Reproducible R & SQL Query Generator**
   - **One-Click Code Modal**: Tap the **📊 Query Code** button to reveal a tabbed modal generating the exact code needed to replicate your active filter state.
   - **Supported Syntaxes**: Outputs clean **tidyverse (dplyr)** pipelines, **Base R** subset operations, or standard ANSI **SQL Queries**.
   - **Active Variable Selection**: If columns are hidden, the generators dynamically append `.select()` (dplyr), `select` arguments (Base R), or list visible columns in `SELECT` (SQL).
   - **Variable Name Auto-Extraction**: Automatically deparses and substitutes the R variable name (e.g. `adsl`) for true copy-pasteable accuracy.

5. **Local Network Security Workarounds**
   - **`explore_external()` Preview Utility**: Spins up a temporary, lightweight local Shiny instance in the background to serve assets over `http://` instead of `file://`, bypassing modern external browser local CORS security policies.

---

## Installation

You can install the development version of **DTExploR** directly from GitHub:

```r
# Install remotes if not already installed
if (!requireNamespace("remotes", quietly = TRUE)) {
  install.packages("remotes")
}

# Install DTExploR
remotes::install_github("wagh-nikhil/DTExploR")
```

---

## Quick Start

### 1. Basic Interactive Data Browsing

Open any data frame in your default RStudio or Positron Viewer panel:

```r
library(DTExploR)

# Explore the classic motor trend car road tests dataset
dtexplor(mtcars)
```

### 2. External Browser Preview (Bypassing CORS)

To open the explorer in your default external web browser (Chrome, Edge, Safari, Firefox) without asset blocks:

```r
library(DTExploR)
library(pharmaverseadam)

# Launch the external previewer on the ADaM ADSL clinical dataset
explore_external(adsl)
```

---

## Function Reference

### `dtexplor(data, width = NULL, height = NULL, elementId = NULL, datasetName = NULL)`
Creates the interactive htmlwidget.
- `data`: A `data.frame` to explore.
- `width` / `height`: Explicit widget dimensions (pixels or percentage). Defaults to full page container (`100%`).
- `elementId`: Optional static HTML element ID.
- `datasetName`: Optional custom string name representing the dataset in generated reproducible code. If omitted, automatically extracts the R variable name.

### `explore_external(data, port = NULL)`
Spins up a temporary background Shiny server and opens the dataset in the default web browser.
- `data`: A `data.frame` to explore.
- `port`: Optional numeric port. If `NULL`, R automatically chooses a free port.

### `save_dtexplor(widget, file)`
Saves the active widget and all compiled CSS/JS assets into a self-contained, standalone HTML file.
- `widget`: A `dtexplor` widget object.
- `file`: Path to save the self-contained HTML file.

```r
library(DTExploR)

# Generate and save widget to a standalone report
widget <- dtexplor(mtcars)
save_dtexplor(widget, "mtcars_explorer.html")
```

---

## Developer Setup (Rebuilding React Assets)

The frontend is implemented in React inside `srcjs/dtexplor.jsx` and compiled with Webpack. If you wish to modify the frontend assets, set up the development environment:

```bash
# Clone the repository and navigate into it
cd DTExploR

# Install NodeJS dependencies
npm install

# Build assets (compiles to inst/htmlwidgets/dtexplor.js)
npm run build
```

Inside R, re-generate documentation and re-install:
```r
devtools::document()
devtools::install()
```

---

## License

This package is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
