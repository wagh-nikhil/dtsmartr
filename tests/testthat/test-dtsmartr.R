library(testthat)
library(dtsmartr)

test_that("dtsmartr_options default and custom properties work", {
  # Default options
  opts_default <- dtsmartr_options()
  expect_equal(opts_default$advanced_filter, TRUE)
  expect_equal(opts_default$show_labels, TRUE)
  expect_equal(opts_default$column_picker, TRUE)
  expect_equal(opts_default$allow_export, TRUE)
  expect_equal(opts_default$theme, "auto")
  expect_equal(opts_default$na_string, "NA")
  expect_equal(opts_default$hidden_columns, list())

  # Custom options
  opts_custom <- dtsmartr_options(
    advanced_filter = FALSE,
    show_labels     = FALSE,
    column_picker   = FALSE,
    allow_export    = FALSE,
    theme           = "dark",
    na_string       = "Missing",
    hidden_columns  = c("mpg", "cyl")
  )
  expect_equal(opts_custom$advanced_filter, FALSE)
  expect_equal(opts_custom$show_labels, FALSE)
  expect_equal(opts_custom$column_picker, FALSE)
  expect_equal(opts_custom$allow_export, FALSE)
  expect_equal(opts_custom$theme, "dark")
  expect_equal(opts_custom$na_string, "Missing")
  expect_equal(opts_custom$hidden_columns, list("mpg", "cyl"))
})

test_that("dtsmartr_options validates input parameters", {
  expect_error(dtsmartr_options(advanced_filter = "TRUE"), "`advanced_filter` must be a single logical value")
  expect_error(dtsmartr_options(show_labels = 123), "`show_labels` must be a single logical value")
  expect_error(dtsmartr_options(column_picker = NULL), "`column_picker` must be a single logical value")
  expect_error(dtsmartr_options(allow_export = c(TRUE, FALSE)), "`allow_export` must be a single logical value")
  expect_error(dtsmartr_options(theme = "invalid_theme"), "should be one of")
  expect_error(dtsmartr_options(na_string = 12), "`na_string` must be a single character string")
  expect_error(dtsmartr_options(hidden_columns = 123), "`hidden_columns` must be a character vector or NULL")
})

test_that("dtsmartr creates a valid htmlwidget and processes metadata", {
  # Test with diverse column types and attributes
  df <- data.frame(
    num_col   = c(1.1, 2.2, NA),
    int_col   = 1:3,
    char_col  = c("a", "b", "c"),
    factor_col = factor(c("high", "low", "high")),
    log_col   = c(TRUE, FALSE, TRUE),
    date_col  = as.Date(c("2026-06-01", "2026-06-02", "2026-06-03")),
    stringsAsFactors = FALSE
  )
  
  # Set a custom label attribute on a column
  attr(df$num_col, "label") <- "Numeric Column Label"
  
  widget <- dtsmartr(df, datasetName = "test_dataset")
  
  expect_s3_class(widget, "htmlwidget")
  expect_s3_class(widget, "dtsmartr")
  
  # Verify data clean up (factors & dates coerced to character)
  expect_type(widget$x$data$factor_col, "character")
  expect_type(widget$x$data$date_col, "character")
  expect_equal(widget$x$data$factor_col, c("high", "low", "high"))
  expect_equal(widget$x$data$date_col, c("2026-06-01", "2026-06-02", "2026-06-03"))
  
  # Check dataset name
  expect_equal(widget$x$dataset_name, "test_dataset")
  
  # Verify metadata structures
  meta <- widget$x$metadata
  expect_equal(length(meta), ncol(df))
  
  # Check custom label
  expect_equal(meta[[1]]$label, "Numeric Column Label")
  expect_null(meta[[2]]$label)
  
  # Check column types detection
  expect_equal(meta[[1]]$name, "num_col")
  expect_equal(meta[[1]]$type, "numeric")
  expect_equal(meta[[2]]$type, "integer")
  expect_equal(meta[[3]]$type, "character")
  expect_equal(meta[[4]]$type, "factor")
  expect_equal(meta[[5]]$type, "logical")
  expect_equal(meta[[6]]$type, "datetime")
  
  # Check unique values calculation
  expect_equal(meta[[1]]$unique_values, 3) # 1.1, 2.2, NA
  expect_equal(meta[[4]]$unique_values, 2) # high, low
})

test_that("dtsmartr handles dataset expression capturing and fallbacks", {
  # Direct dataset name capture
  widget_cars <- dtsmartr(mtcars)
  expect_equal(widget_cars$x$dataset_name, "mtcars")
  
  # Complex expression with parentheses/braces fallback to "df"
  widget_complex <- dtsmartr(subset(mtcars, cyl == 4))
  expect_equal(widget_complex$x$dataset_name, "df")
})

test_that("dtsmartr validates input", {
  expect_error(dtsmartr(1:100), "`data` must be a data.frame")
  expect_error(dtsmartr("string"), "`data` must be a data.frame")
})

test_that("dtsmartr triggers high row-count warning", {
  # Generate a large dataset exceeding 50,000 rows
  large_df <- data.frame(id = 1:50005)
  
  # In a non-interactive session (like devtools::test()), it should throw a warning
  expect_warning(
    dtsmartr(large_df),
    "Dataset exceeds 50,000 rows\\. Freezing or slow performance may occur"
  )
})

test_that("save_dtsmartr saves a standalone HTML and validates parameters", {
  tmp_html <- tempfile(fileext = ".html")
  
  # Test successful saving
  res_path <- save_dtsmartr(mtcars, tmp_html, selfcontained = FALSE, verbose = FALSE)
  expect_true(file.exists(tmp_html))
  expect_equal(normalizePath(res_path), normalizePath(tmp_html))
  
  # Check content of saved HTML (contains dependencies and dtsmartr data structure)
  content <- paste(readLines(tmp_html, warn = FALSE), collapse = "\n")
  expect_match(content, "dtsmartr")
  expect_match(content, "mpg") # column name from mtcars
  
  # Clean up file and companion folder
  unlink(tmp_html)
  unlink(paste0(tools::file_path_sans_ext(tmp_html), "_files"), recursive = TRUE)
  
  # Test input validations
  expect_error(save_dtsmartr(1:10, tmp_html), "`data` must be a data.frame")
  expect_error(save_dtsmartr(mtcars, ""), "`file` must be a single non-empty character string")
  expect_error(save_dtsmartr(mtcars, tmp_html, selfcontained = "yes"), "`selfcontained` must be TRUE or FALSE")
  expect_error(save_dtsmartr(mtcars, tmp_html, open = 1), "`open` must be TRUE or FALSE")
  expect_error(save_dtsmartr(mtcars, tmp_html, verbose = "TRUE"), "`verbose` must be TRUE or FALSE")
})

test_that("Shiny bindings return correct structures", {
  # Test Output binding
  out <- dtsmartrOutput("test_id")
  expect_s3_class(out, "shiny.tag.list")
  expect_match(as.character(out), "id=\"test_id\"")
  expect_match(as.character(out), "class=\"dtsmartr html-widget")
  
  # Test Render binding
  renderer <- renderDtsmartr({ dtsmartr(mtcars) })
  expect_s3_class(renderer, "shiny.render.function")
})

test_that("dtsmart_launch validates input parameters", {
  expect_error(dtsmart_launch(data = 1:5), "`data` must be a data.frame or NULL")
  expect_error(dtsmart_launch(data = "not_df"), "`data` must be a data.frame or NULL")
})
