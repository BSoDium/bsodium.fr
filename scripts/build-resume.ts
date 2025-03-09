import path from "path";
import puppeteer from "puppeteer";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generatePDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Start the Vite development server
  const vite = spawn("yarn", ["dev"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "pipe",
    detached: true,
  });

  // Wait for the server to start
  await new Promise<void>((resolve, reject) => {
    vite.stdout?.on("data", (data) => {
      if (data.toString().includes("ready in")) {
        resolve();
      }
    });

    vite.stderr?.on("data", (data) => {
      reject(data.toString());
    });
  });

  // Navigate to the resume page
  await page.goto("http://localhost:5173/resume?overlay=false", {
    waitUntil: "networkidle2",
  });

  // Print the page to PDF
  const pdfPath = path.resolve(__dirname, "../src/assets/pdf/resume.pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    displayHeaderFooter: false,
    printBackground: true,
    margin: { bottom: 0, top: 0, left: 0, right: 0 },
    scale: 0.75,
  });

  await browser.close();
  vite.kill();

  console.log(`PDF saved to ${pdfPath}`);
}

generatePDF().catch((error) => {
  console.error("Error generating PDF:", error);
  process.exit(1);
});
