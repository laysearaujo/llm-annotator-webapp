# LLM Annotator Webapp

A simple, game-like web interface for human annotation of A/B test results from Large Language Models (LLMs). This tool allows annotators to filter samples, evaluate responses in batches, and securely save their judgments to a Google Sheet.

This project was designed to be deployed on Netlify and is separated from its main data analysis repository, consuming data files directly from a remote GitHub repository.

## Key Features

-   **Remote Data Source:** Loads evaluation and prompt data directly from CSV files hosted in another public GitHub repository.
-   **User-Persistent Sessions:** Remembers individual annotator progress using `localStorage`, preventing the same user from annotating the same sample twice.
-   **Batched Workflow:** Presents samples in random batches of 5, allowing users to take breaks and resume by starting a new batch.
-   **Dynamic Filtering:** Annotators can filter the sample pool by multiple domains and a specific language before starting a session.
-   **Secure Data Submission:** Uses a Netlify serverless function as a secure proxy to hide the Google Apps Script URL, preventing unauthorized submissions to the target Google Sheet.
-   **Simple & Clean UI:** A straightforward interface designed to maximize annotation efficiency.

## 🚀 Live Demo

[Link to the deployed annotation tool on Netlify](https://your-site-name.netlify.app/)

## 🏗️ Architecture

The data submission process is architected to be secure by preventing the Google Apps Script URL from being exposed on the client-side.

`[User's Browser (WebApp)]` → `[Netlify Function Proxy]` → `[Google Apps Script]` → `[Google Sheet]`

1.  The frontend web application (in `webapp/`) sends annotation data to a serverless function endpoint hosted on Netlify.
2.  The Netlify function (`netlify/functions/submit-annotation.js`) receives this data.
3.  The function retrieves the secret Google Apps Script URL from a secure environment variable.
4.  It then forwards the annotation data to the Google Apps Script.
5.  The Google Apps Script saves the data to the Google Sheet.

## 🛠️ Setup and Deployment

To set up your own instance of this annotation tool, follow these steps.

### 1. Google Sheet & Apps Script Backend

Before deploying the webapp, you must have a Google Sheet and a Google Apps Script configured to receive the data.

-   Create a Google Sheet with a tab named `human_choice`.
-   The tab should have the following columns: `timestamp`, `evaluation_id`, `human_choice`, `human_id`.
-   Create a Google Apps Script attached to the sheet with a `doPost(e)` function to append rows.
-   Deploy the script as a **Web app** with access set to **"Anyone"**.
-   Copy the generated Web app URL.

### 2. Fork/Clone the Repository

Fork this repository to your own GitHub account and clone it to your local machine.

```bash
git clone [https://github.com/laysearaujo/llm-annotator-webapp](https://github.com/laysearaujo/llm-annotator-webapp)

cd llm-annotator-webapp
```

### 3. Install Dependencies

This project has a single server-side dependency for the Netlify function.

```bash
npm init -y
npm install node-fetch@2
```
