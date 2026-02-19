# D3 Temperature Matrix Visualization

This project provides a visual representation of daily maximum and minimum temperatures over several years using D3.js. It displays a matrix where each cell represents a month, colored by the maximum temperature, and contains sparklines showing the daily temperature variations.

## Features

*   **Monthly Heatmap**: Cells are colored based on the maximum temperature for that month, using the intuitively mapped "Turbo" color scale (0-40°C).
*   **Dual Sparklines**: Each cell contains two sparklines representing the daily maximum (green) and minimum (gray) temperatures for that month.
*   **Interactive Tooltips**: Hovering over any cell reveals a tooltip displaying the month, along with the specific maximum and minimum temperatures recorded.
*   **Vertical Legend**: A clear, vertical color legend maps colors to Celsius values.

## File Structure

*   `index.html`: The main HTML file containing the page structure and CSS styles.
*   `script.js`: The JavaScript file containing the D3.js logic for data processing, layout calculation, and visualization rendering.
*   `temperature_daily.csv`: The dataset containing daily temperature records (requires `date`, `max_temperature`, and `min_temperature` columns).

## How to Run

Because this project loads data from a local CSV file (`temperature_daily.csv`), it must be served via a local web server to avoid CORS (Cross-Origin Resource Sharing) restrictions enforced by modern web browsers.

1.  **Open a terminal** and navigate to the directory containing these files (`HW1`).
2.  **Start a local server.** You can use Python's built-in HTTP server:
    ```bash
    python3 -m http.server
    ```
3.  **Open your browser** and go to `http://localhost:8000`.

## Dependencies

*   [D3.js (v7)](https://d3js.org/) - Loaded via CDN in `index.html`.
