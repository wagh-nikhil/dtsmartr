# DTExploR - Shiny Example App
# Demonstrates all Shiny usage patterns for the DTExploR package.
#
# Run from R with:
#   shiny::runApp("d:/AI_stuff/DTExploR/app.R")
# OR (after installing the package):
#   library(DTExploR); shiny::runApp(system.file("app.R", package = "DTExploR"))

library(shiny)
library(DTExploR)

# ── Built-in demo datasets ────────────────────────────────────────────────────
DATASETS <- list(
  "mtcars  (Motor Trend Cars)"          = mtcars,
  "iris    (Fisher's Iris)"             = iris,
  "airquality  (NY Air Quality)"        = airquality,
  "diamonds sample  (ggplot2)"          = {
    if (requireNamespace("ggplot2", quietly = TRUE))
      ggplot2::diamonds[sample(nrow(ggplot2::diamonds), 1000), ]
    else
      data.frame(note = "Install ggplot2 to use this dataset")
  },
  "ADSL (pharmaverseadam)"              = {
    if (requireNamespace("pharmaverseadam", quietly = TRUE))
      pharmaverseadam::adsl
    else
      data.frame(note = "Install pharmaverseadam to use this dataset")
  }
)

# ── UI ────────────────────────────────────────────────────────────────────────
ui <- fluidPage(

  tags$head(
    tags$style(HTML("
      body        { font-family: 'Segoe UI', system-ui, sans-serif;
                    background: #f8fafc; margin: 0; }
      .navbar-top { background: #1e293b; padding: 14px 24px;
                    display: flex; align-items: center; gap: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,.18); }
      .navbar-top h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
      .navbar-top .badge { background: #3b82f6; color: #fff;
                           border-radius: 6px; padding: 2px 8px; font-size: 11px; }
      .controls   { background: #fff; border-bottom: 1px solid #e2e8f0;
                    padding: 12px 24px; display: flex; gap: 16px;
                    align-items: center; flex-wrap: wrap; }
      .controls label { font-size: 13px; font-weight: 600; color: #334155; }
      .controls .form-group { margin: 0; }
      .widget-wrap { padding: 16px; }
      .info-bar   { background: #eff6ff; border: 1px solid #bfdbfe;
                    border-radius: 8px; padding: 10px 16px; margin-bottom: 12px;
                    font-size: 13px; color: #1e40af; }
    "))
  ),

  # ── Top navigation bar ──────────────────────────────────────────────────────
  div(class = "navbar-top",
    tags$h1("🔭 DTExploR"),
    span(class = "badge", "Interactive Data Explorer"),
    div(style = "margin-left:auto; color:#94a3b8; font-size:12px;",
      "Built with ", tags$b(style = "color:#60a5fa;", "DTExploR"), " + Shiny")
  ),

  # ── Controls bar ────────────────────────────────────────────────────────────
  div(class = "controls",

    # Dataset selector
    div(
      tags$label("Dataset"),
      selectInput(
        inputId  = "dataset",
        label    = NULL,
        choices  = names(DATASETS),
        selected = names(DATASETS)[1],
        width    = "280px"
      )
    ),

    # Upload your own CSV
    div(
      tags$label("Upload CSV"),
      fileInput(
        inputId  = "upload",
        label    = NULL,
        accept   = ".csv",
        width    = "260px"
      )
    ),

    # Download current view as HTML
    div(style = "margin-left:auto;",
      downloadButton("download_html", "⬇ Save as HTML",
                     style = "background:#1e293b; color:#fff; border:none;
                              border-radius:8px; padding:8px 16px;
                              font-size:13px; font-weight:600; cursor:pointer;")
    )
  ),

  # ── Info bar ────────────────────────────────────────────────────────────────
  div(class = "widget-wrap",
    uiOutput("info_bar"),

    # ── DTExploR widget ────────────────────────────────────────────────────────
    # height = "100vh" fills the full remaining viewport (maximised by default)
    dtexplorOutput("explorer", width = "100%", height = "calc(100vh - 160px)")
  )
)

# ── Server ────────────────────────────────────────────────────────────────────
server <- function(input, output, session) {

  # ── Reactive: active data.frame ─────────────────────────────────────────────
  active_data <- reactive({
    # Uploaded CSV takes priority
    if (!is.null(input$upload)) {
      tryCatch(
        read.csv(input$upload$datapath, stringsAsFactors = FALSE),
        error = function(e) {
          showNotification(paste("CSV read error:", e$message),
                           type = "error", duration = 6)
          DATASETS[[input$dataset]]
        }
      )
    } else {
      DATASETS[[input$dataset]]
    }
  })

  # ── Info bar: row / column counts ────────────────────────────────────────────
  output$info_bar <- renderUI({
    df <- active_data()
    div(class = "info-bar",
      sprintf("📋  %s rows × %s columns", format(nrow(df), big.mark=","),
              ncol(df)),
      span(style = "margin-left:16px; color:#64748b;",
           paste("Column types:",
                 paste(unique(sapply(df, function(x) class(x)[1])),
                       collapse = ", ")))
    )
  })

  # ── Render DTExploR widget ──────────────────────────────────────────────────
  output$explorer <- renderDtexplor({
    dtexplor(active_data())
  })

  # ── Download handler: save current dataset as HTML ───────────────────────────
  output$download_html <- downloadHandler(
    filename = function() {
      nm <- if (!is.null(input$upload))
              tools::file_path_sans_ext(input$upload$name)
            else
              gsub("\\s.*", "", input$dataset)   # first word, e.g. "mtcars"
      paste0(nm, "_explorer.html")
    },
    content = function(file_path) {
      save_dtexplor(
        data          = active_data(),
        file          = file_path,
        selfcontained = FALSE,   # Shiny temp dir; external assets written alongside
        title         = paste(gsub("\\s.*", "", input$dataset), "— DTExploR"),
        verbose       = FALSE
      )
    },
    contentType = "text/html"
  )
}

# ── Launch ────────────────────────────────────────────────────────────────────
shinyApp(ui, server)
