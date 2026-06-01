#' Explore a dataset in your default external browser
#'
#' Launches a temporary, lightweight local Shiny server in the background
#' and opens the dataset in your default web browser. This bypasses local
#' browser file security (CORS/file://) restrictions for React assets.
#'
#' @param data A data.frame to explore.
#' @param port Optional port number. If NULL, a free port is chosen automatically.
#'
#' @importFrom shiny fluidPage tags HTML runApp
#'
#' @export
explore_external <- function(data, port = NULL) {
  if (!is.data.frame(data)) {
    stop("`data` must be a data.frame", call. = FALSE)
  }

  ds_name <- deparse(substitute(data))
  if (length(ds_name) > 1) ds_name <- paste(ds_name, collapse = "")
  if (nchar(ds_name) > 40 || grepl("[\\(\\)\\{\\}]", ds_name)) {
    ds_name <- "df"
  }

  # Set up a clean, full-viewport UI
  ui <- shiny::fluidPage(
    title = paste("DTExploR -", ds_name),
    shiny::tags$head(
      shiny::tags$style(shiny::HTML("
        body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
        #explorer { height: 100vh !important; }
      "))
    ),
    dtexplorOutput("explorer", width = "100%", height = "100vh")
  )

  server <- function(input, output, session) {
    output$explorer <- renderDtexplor({
      dtexplor(data, datasetName = ds_name)
    })
  }

  # Run the lightweight Shiny app and launch the default external browser
  shiny::runApp(
    appDir         = list(ui = ui, server = server),
    launch.browser = TRUE,
    port           = port,
    quiet          = TRUE
  )
}
