---
description: How to deploy the Interior Quote App
---

# Deployment Guide

Since `git` is not currently installed/detected in your terminal, the easiest way to deploy represents a "Drag and Drop" approach using Netlify, or installing Git to use Vercel/Netlify integration (Recommended for long term).

## Option 1: Netlify Drop (No Git required)

1.  **Build the Project**:
    Run the build command to generate the production files.
    ```powershell
    npm run build
    ```
    This will create a `dist` folder in your project directory: `c:\Users\Dell\Documents\Projects\Interior\interior-quote-app\dist`.

2.  **Upload to Netlify**:
    *   Open your browser and search for "Netlify Drop" or go to [app.netlify.com/drop](https://app.netlify.com/drop).
    *   Drag and drop the `dist` folder into the upload area.

3.  **Configure Environment Variables**:
    *   **Crucial Step**: Once the site is created (it might look broken initially if it fetches data immediately), go to **Site Settings** > **Environment variables**.
    *   Add the following variables (copy values from your `.env` file):
        *   Key: `VITE_SUPABASE_URL`
        *   Value: (Your Supabase URL)
        *   Key: `VITE_SUPABASE_ANON_KEY`
        *   Value: (Your Supabase Anon Key)
    *   **Redeploy**: You might need to trigger a redeploy (or just dropping the folder again) for the variables to take effect, although for client-side keys, they are usually embedded at build time. 
    *   *Correction*: Since Vite embeds env vars starting with `VITE_` **at build time**, you actually need to ensure your local `.env` file is correct BEFORE building. If you deploy the `dist` folder, the keys are already baked in! You don't strictly need to add them to Netlify interface if you use drag-and-drop of a pre-built folder, UNLESS the code relies on `process.env` at runtime (which Vite apps usually don't, they use `import.meta.env`).
    *   *Verification*: Your `vite.config.js` and code use `import.meta.env`, so the keys in your local `.env` are baked into the `dist` files during `npm run build`. 
    *   **Security Note**: Anonymous keys are safe to be verified in the browser bundle.

## Option 2: Vercel / Netlify (Git Integration) - Recommended

1.  **Install Git**: Download and install Git from [git-scm.com](https://git-scm.com/).
2.  **Initialize Repo**:
    ```powershell
    git init
    git add .
    git commit -m "Initial commit"
    ```
3.  **Push to GitHub/GitLab**.
4.  **Connect to Vercel/Netlify**:
    *   Import the repository.
    *   The platform will detect `Vite`.
    *   Add the Environment Variables in the project settings UI.
    *   Click Deploy.

## Current Recommendation

Since you already have a successful build:
1.  Locate `c:\Users\Dell\Documents\Projects\Interior\interior-quote-app\dist` in your File Explorer.
2.  Drag that entire folder to [Netlify Drop](https://app.netlify.com/drop).
