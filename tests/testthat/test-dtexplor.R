test_that("dtexplor creates a valid htmlwidget", {
  widget <- dtexplor(mtcars)
  
  expect_s3_class(widget, "htmlwidget")
  expect_s3_class(widget, "dtexplor")
  
  # Check metadata is correctly calculated
  expect_true(is.list(widget$x$metadata))
  expect_equal(length(widget$x$metadata), ncol(mtcars))
  
  # Check raw data is present
  expect_equal(widget$x$data, mtcars)
})

test_that("dtexplor fails on non-dataframe", {
  expect_error(dtexplor(1:10), "must be a data.frame")
})

test_that("explore_external fails on non-dataframe", {
  expect_error(explore_external(1:10), "must be a data.frame")
})
