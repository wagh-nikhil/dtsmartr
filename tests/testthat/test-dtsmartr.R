test_that("dtsmartr creates a valid htmlwidget", {
  widget <- dtsmartr(mtcars)
  
  expect_s3_class(widget, "htmlwidget")
  expect_s3_class(widget, "dtsmartr")
  
  # Check metadata is correctly calculated
  expect_true(is.list(widget$x$metadata))
  expect_equal(length(widget$x$metadata), ncol(mtcars))
  
  # Check cleaner data is present (coerced factors, etc.)
  expect_equal(nrow(widget$x$data), nrow(mtcars))
})

test_that("dtsmartr fails on non-dataframe", {
  expect_error(dtsmartr(1:10), "must be a data.frame")
})

test_that("dtsmartr_options works as expected", {
  opts <- dtsmartr_options(
    advanced_filter = FALSE,
    show_labels     = FALSE,
    column_picker   = FALSE,
    allow_export    = FALSE,
    theme           = "dark",
    na_string       = "Missing",
    hidden_columns  = c("mpg", "cyl")
  )
  
  expect_equal(opts$advanced_filter, FALSE)
  expect_equal(opts$show_labels, FALSE)
  expect_equal(opts$column_picker, FALSE)
  expect_equal(opts$allow_export, FALSE)
  expect_equal(opts$theme, "dark")
  expect_equal(opts$na_string, "Missing")
  expect_equal(opts$hidden_columns, list("mpg", "cyl"))
})

test_that("dtsmart_launch fails on non-dataframe", {
  expect_error(dtsmart_launch(1:10), "must be a data.frame or NULL")
})
