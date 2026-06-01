#' DTExploR
#'
#' A Kaggle-style data explorer
#'
#' @param data A data.frame to explore
#' @param width Width in pixels
#' @param height Height in pixels
#' @param elementId HTML element ID
#'
#' @import htmlwidgets
#' @importFrom jsonlite toJSON
#'
#' @examples
#' if (interactive()) {
#'   dtexplor(mtcars)
#' }
#'
#' @export
dtexplor <- function(data, width = NULL, height = NULL, elementId = NULL, datasetName = NULL) {
  if (!is.data.frame(data)) {
    stop("data must be a data.frame")
  }

  # Capture dataset name for reproducible code generation
  if (is.null(datasetName)) {
    ds_name <- deparse(substitute(data))
    if (length(ds_name) > 1) ds_name <- paste(ds_name, collapse = "")
    if (nchar(ds_name) > 40 || grepl("[\\\\(\\\\)\\\\{\\\\}]", ds_name)) {
      ds_name <- "df"
    }
  } else {
    ds_name <- as.character(datasetName)[1]
  }

  # Detect column types BEFORE any coercion
  get_col_type <- function(col) {
    if (is.logical(col))   return("logical")
    if (is.integer(col))   return("integer")
    if (is.numeric(col))   return("numeric")
    if (is.factor(col))    return("factor")
    if (inherits(col, c("Date", "POSIXct", "POSIXlt"))) return("datetime")
    if (is.character(col)) return("character")
    return(class(col)[1])
  }

  metadata <- lapply(names(data), function(col_name) {
    col_data <- data[[col_name]]
    lbl      <- attr(col_data, "label", exact = TRUE)
    list(
      name          = col_name,
      type          = get_col_type(col_data),
      unique_values = length(unique(col_data)),
      label         = if (!is.null(lbl) && nzchar(trimws(lbl)))
                        trimws(as.character(lbl))
                      else
                        NULL
    )
  })

  # Coerce factors / dates to character so JSON values are human-readable strings
  data_clean <- as.data.frame(
    lapply(data, function(col) {
      if (is.factor(col)) return(as.character(col))
      if (inherits(col, c("Date", "POSIXct", "POSIXlt"))) return(as.character(col))
      col
    }),
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  rownames(data_clean) <- rownames(data)

  x <- list(
    data         = data_clean,
    metadata     = metadata,
    dataset_name = ds_name
  )

  # create widget
  htmlwidgets::createWidget(
    name      = 'dtexplor',
    x         = x,
    width     = width,
    height    = height,
    package   = 'DTExploR',
    elementId = elementId
  )
}

#' Called by HTMLWidgets to produce the widget's root element.
#' @noRd
widget_html.dtexplor <- function(id, style, class, ...) {
  htmltools::attachDependencies(
    htmltools::tags$div(id = id, class = class, style = style),
    list(
      reactR::html_dependency_corejs(),
      reactR::html_dependency_react(),
      reactR::html_dependency_reacttools()
    )
  )
}

#' Shiny bindings for dtexplor
#'
#' Output and render functions for using dtexplor within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a dtexplor
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name dtexplor-shiny
#'
#' @export
dtexplorOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'dtexplor', width, height, package = 'DTExploR')
}

#' @rdname dtexplor-shiny
#' @export
renderDtexplor <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, dtexplorOutput, env, quoted = TRUE)
}