/**
 * Elleva Proforma Quotation — backend for Next.js form.
 *
 * SETUP:
 * 1. Create (or open) a Google Sheet. Go to Extensions > Apps Script.
 * 2. Delete any starter code and paste this whole file in.
 * 3. Run `setup` once (Run menu > select "setup" > Run) to create the
 *    "Quotations" sheet tab with headers and the "Elleva Quotations" Drive folder.
 *    The first run will ask you to authorize the script — allow it.
 * 4. Click Deploy > New deployment > select type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Click Deploy, copy the Web App URL.
 * 5. Paste that URL into the website's "Backend Settings" panel.
 */

const FOLDER_NAME = "Elleva Quotations";
const SHEET_NAME = "Quotations";

function setup() {
  getOrCreateSheet_();
  getOrCreateFolder_();
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const folder = getOrCreateFolder_();
    const sheet = getOrCreateSheet_();

    let driveUrl = "";
    if (data.pdfBase64) {
      const bytes = Utilities.base64Decode(data.pdfBase64);
      const blob = Utilities.newBlob(bytes, "application/pdf", data.fileName || "Quotation.pdf");
      const file = folder.createFile(blob);
      driveUrl = file.getUrl();
    }

    sheet.appendRow([
      new Date(),
      data.quotationNo || "",
      data.date || "",
      data.buyerName || "",
      data.firmName || "",
      data.mobile || "",
      data.email || "",
      data.grandTotal || "",
      driveUrl,
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, driveUrl: driveUrl })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Quotation No.",
      "Quotation Date",
      "Buyer Name",
      "Firm Name",
      "Mobile",
      "Email",
      "Grand Total (₹)",
      "PDF Link (Drive)",
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
