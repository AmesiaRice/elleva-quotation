"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Truck,
  Package,
  Factory,
  CalendarClock,
  Landmark,
  UserRound,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { amountInWords } from "@/lib/numberToWords";

/* ---------------------------------- Types --------------------------------- */

type ProductRow = {
  id: string;
  product: string;
  variety: string;
  packing: string;
  qty: string;
  rate: string;
  discount: string;
  gst: string;
};

type PriceBasisType = "ex-factory" | "ex-godown" | "delivered";

const emptyRow = (id: string): ProductRow => ({
  id,
  product: "",
  variety: "",
  packing: "",
  qty: "",
  rate: "",
  discount: "",
  gst: "5",
});

const initialBuyer = {
  name: "",
  firm: "",
  address: "",
  gst: "",
  state: "",
  contact: "",
  mobile: "",
  email: "",
};

const initialQuotation = {
  no: "",
  date: "",
  validTill: "",
  salesExec: "",
  paymentTerms: "",
  priceBasis: "",
};

const initialCommercial = {
  paymentTerms: "",
  deliveryTime: "",
  dispatch: "",
  priceBasis: "",
  freight: "",
  validity: "",
};

const initialBank = {
  beneficiary: "ELLEVA GLOBAL FOOD IMPEX PVT LTD",
  bankName: "",
  accountNo: "",
  ifsc: "",
  branch: "",
  upiId: "",
};

const initialAcceptance = {
  buyerName: "",
  buyerSignature: "",
  buyerDate: "",
};

const initialSignatory = {
  name: "",
};

const termsLeft = [
  "Prices are valid for the period mentioned above.",
  "Order will be confirmed after receipt of Purchase Order and advance/payment as per agreed terms.",
  "Goods once sold will not be taken back.",
  "Interest @ 18% p.a. will be charged on overdue payments.",
  "Quality as per agreed specification.",
  "Claims if any, must be reported within 48 hours of receipt of goods.",
];

const termsRight = [
  "Delivery is subject to stock availability and force majeure conditions.",
  "Variation of \u00B12% in quantity is acceptable.",
  "Weight recorded at dispatch point shall be final.",
  "Risk and responsibility of goods pass to buyer after handover to transporter.",
  "Disputes are subject to Karnal Jurisdiction only.",
  "E-way Bill & Tax Invoice will be provided with every dispatch.",
];

/* ------------------------------ Small helpers ------------------------------ */

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const rupee = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let rowIdCounter = 1;
const nextRowId = () => `row-${rowIdCounter++}`;

/* --------------------------------- Component -------------------------------- */

export default function QuotationForm() {
  const [buyer, setBuyer] = useState(initialBuyer);
  const [quotation, setQuotation] = useState(initialQuotation);
  const [basisType, setBasisType] = useState<PriceBasisType>("ex-factory");
  const [rows, setRows] = useState<ProductRow[]>([
    emptyRow(nextRowId()),
    emptyRow(nextRowId()),
    emptyRow(nextRowId()),
    emptyRow(nextRowId()),
    emptyRow(nextRowId()),
  ]);
  const [commercial, setCommercial] = useState(initialCommercial);
  const [bank, setBank] = useState(initialBank);
  const [acceptance, setAcceptance] = useState(initialAcceptance);
  const [signatory, setSignatory] = useState(initialSignatory);
  const [freightAmt, setFreightAmt] = useState("");

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "saving" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  /* ------------------------------- Calculations ------------------------------ */

  const rowCalc = useCallback((r: ProductRow) => {
    const base = num(r.qty) * num(r.rate);
    const afterDiscount = Math.max(base - num(r.discount), 0);
    const gstAmt = (afterDiscount * num(r.gst)) / 100;
    return { base, afterDiscount, gstAmt, amount: afterDiscount + gstAmt };
  }, []);

  const totals = useMemo(() => {
    let subTotal = 0;
    let discount = 0;
    let gst = 0;
    for (const r of rows) {
      const c = rowCalc(r);
      subTotal += c.base;
      discount += num(r.discount);
      gst += c.gstAmt;
    }
    const freight = num(freightAmt);
    const grandTotal = subTotal - discount + gst + freight;
    return { subTotal, discount, gst, freight, grandTotal };
  }, [rows, freightAmt, rowCalc]);

  /* --------------------------------- QR code -------------------------------- */

  useEffect(() => {
    if (!bank.upiId.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with external QR lib
      setQrDataUrl(null);
      return;
    }
    const upiString = `upi://pay?pa=${encodeURIComponent(bank.upiId.trim())}&pn=${encodeURIComponent(
      bank.beneficiary || "Amasia Multigrain Pvt Ltd"
    )}&am=${totals.grandTotal > 0 ? totals.grandTotal.toFixed(2) : ""}&cu=INR`;
    QRCode.toDataURL(upiString, { margin: 1, width: 200, color: { dark: "#0d1f45", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [bank.upiId, bank.beneficiary, totals.grandTotal]);

  /* --------------------------------- Row edits -------------------------------- */

  const updateRow = (id: string, field: keyof ProductRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  /* ---------------------------------- Reset ---------------------------------- */

  const resetForm = () => {
    setBuyer(initialBuyer);
    setQuotation(initialQuotation);
    setBasisType("ex-factory");
    setRows([
      emptyRow(nextRowId()),
      emptyRow(nextRowId()),
      emptyRow(nextRowId()),
      emptyRow(nextRowId()),
      emptyRow(nextRowId()),
    ]);
    setCommercial(initialCommercial);
    setBank((b) => ({ ...initialBank, upiId: b.upiId })); // keep UPI id for convenience
    setAcceptance(initialAcceptance);
    setSignatory(initialSignatory);
    setFreightAmt("");
  };

  /* ------------------------------- Submit / PDF ------------------------------- */

  const buildCaptureClone = (source: HTMLElement): HTMLElement => {
    const clone = source.cloneNode(true) as HTMLElement;

    const liveFields = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    );
    const cloneFields = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    );

    liveFields.forEach((live, i) => {
      const cloneField = cloneFields[i];
      if (!cloneField) return;

      // Leave checkboxes as-is — html2canvas renders those fine.
      if (live instanceof HTMLInputElement && live.type === "checkbox") {
        cloneField.setAttribute("checked", live.checked ? "checked" : "");
        return;
      }

      const computed = window.getComputedStyle(live);
      const replacement = document.createElement("div");
      replacement.textContent = live.value;

      // Carry over the field's visual styling so the swap is invisible.
      replacement.className = cloneField.className;
      replacement.setAttribute(
        "style",
        `
          background:${computed.backgroundColor};
          border-radius:${computed.borderRadius};
          padding:${computed.padding};
          font-size:${computed.fontSize};
          font-family:${computed.fontFamily};
          font-style:${computed.fontStyle};
          font-weight:${computed.fontWeight};
          color:${computed.color};
          min-height:${computed.height};
          width:${computed.width};
          display:flex;
          align-items:center;
          justify-content:${
            computed.textAlign === "right"
              ? "flex-end"
              : computed.textAlign === "center"
              ? "center"
              : "flex-start"
          };
          white-space:${live.tagName === "TEXTAREA" ? "pre-wrap" : "nowrap"};
          overflow:visible;
          box-sizing:border-box;
          line-height:normal;
        `
      );

      cloneField.replaceWith(replacement);
    });

    return clone;
  };

  const handleSubmit = async () => {
    setStatus("generating");
    setStatusMsg("Generating PDF...");
    try {
      const node = document.getElementById("quotation-doc");
      if (!node) throw new Error("Document not found");

      // Dynamic import keeps these client-only heavy libs out of the initial bundle
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      // Wait for fonts so measurements in the clone match what's on screen.
      await document.fonts.ready;

      const clone = buildCaptureClone(node);
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "-99999px";
      wrapper.style.width = `${node.offsetWidth}px`;
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(clone, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
      } finally {
        document.body.removeChild(wrapper);
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pageWidthPt = 595.28; // A4 width in points
      const imgHeightPt = (canvas.height * pageWidthPt) / canvas.width;
      // The document is one continuous sheet (like the reference design), so
      // size the PDF page to fit it fully rather than splitting across
      // multiple A4 pages and leaving an awkward near-empty last page.
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pageWidthPt, imgHeightPt],
      });
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthPt, imgHeightPt);

      const fileName = `Elleva-Quotation-${quotation.no || "Draft"}.pdf`;
      pdf.save(fileName);

      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      setStatus("saving");
      setStatusMsg("Saving to Google Sheet & Drive...");
      try {
        const res = await fetch("/api/submit-quotation", {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            quotationNo: quotation.no,
            date: quotation.date,
            buyerName: buyer.name,
            firmName: buyer.firm,
            mobile: buyer.mobile,
            email: buyer.email,
            grandTotal: totals.grandTotal.toFixed(2),
            fileName,
            pdfBase64,
          }),
        });
        const result = await res.json().catch(() => ({ ok: false }));
        if (result.ok) {
          setStatus("done");
          setStatusMsg("Saved! PDF downloaded and quotation stored.");
        } else {
          setStatus("error");
          setStatusMsg(
            result.error?.includes("not configured")
              ? "PDF downloaded, but the backend isn't set up yet (see README)."
              : "PDF downloaded, but saving to Sheet failed."
          );
        }
      } catch {
        setStatus("error");
        setStatusMsg("PDF downloaded, but saving to Sheet failed. Check your connection.");
      }

      resetForm();
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMsg("Something went wrong generating the PDF. Please try again.");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  /* ----------------------------------- UI ------------------------------------ */

  return (
    <div className="min-h-screen py-8 px-3 sm:px-6">
      {/* Top toolbar */}
      {/* <div className="no-print max-w-[850px] mx-auto mb-4">
        <h1 className="font-display text-xl font-bold text-[#0d1f45]">Elleva Proforma Quotation</h1>
        <p className="text-xs text-[#5b6685]">Fill the fields below, then generate &amp; save.</p>
      </div> */}

      {/* ---------------------------- Printable document --------------------------- */}
      <div
        id="quotation-doc"
        className="max-w-[850px] mx-auto bg-white shadow-xl text-[#12203f]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* HEADER */}
        <div className="relative flex items-stretch overflow-hidden border-b-4 border-[#c8a24a]">
          <div className="flex items-center justify-center px-4 py-3 shrink-0">
            <Image
              src="/images/elleva-logo.jpeg"
              alt="Elleva logo"
              width={110}
              height={95}
              className="object-contain"
              priority
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center py-3 px-2">
            <h1 className="font-display text-[38px] leading-none font-black text-[#0d1f45] tracking-wide">
              ELLEVA
            </h1>
            <p className="text-[#c8a24a] font-bold tracking-[0.15em] text-[13px] mt-1">
            ELLEVA GLOBAL FOOD IMPEX PVT LTD
            </p>
            <p className="italic text-[11px] text-[#3c4a72] mt-1">Manufacturer &amp; Exporter of</p>
            <p className="font-display font-bold text-[15px] text-[#0d1f45] tracking-wide">
              PREMIUM BASMATI RICE
            </p>
            <div className="flex items-center gap-4 mt-2 text-[9px] font-semibold text-[#0d1f45]">
              {/* <CertBadge label="FSSAI" sub="10823999000144" />
              <CertBadge label="ISO" sub="22000:2018" />
              <CertBadge label="HACCP" sub="CERTIFIED" />
              <CertBadge label="APEDA" sub="REGISTERED" /> */}
              <CertBadge label="GSTIN" sub="06AAJCE7735L1Z6" />
            </div>
          </div>

          <div className="hidden sm:flex flex-col justify-center gap-1.5 bg-[#0d1f45] text-white text-[9.5px] px-4 py-3 shrink-0 w-[190px] clip-corner">
            <ContactLine icon={<MapPin size={12} />}>
            NADANA ROAD, TARAORI, KARNAL, 132116, India
            </ContactLine>
            <ContactLine icon={<Phone size={12} />}>+91 7404913355</ContactLine>
            <ContactLine icon={<Mail size={12} />}>egfipl@gmail.com</ContactLine>
            <ContactLine icon={<Globe size={12} />}>www.elleva.in</ContactLine>
          </div>
        </div>

        {/* TITLE */}
        <div className="flex items-center justify-center gap-3 py-3">
          <span className="h-px w-16 bg-[#c8a24a]" />
          <h2 className="font-display text-2xl font-bold text-[#0d1f45] tracking-wide">
            PROFORMA QUOTATION
          </h2>
          <span className="h-px w-16 bg-[#c8a24a]" />
        </div>

        {/* BUYER + QUOTATION DETAILS */}
        <div className="grid grid-cols-2 gap-4 px-5">
          <SectionBox icon={<UserRound size={13} />} title="BUYER DETAILS">
            <FieldRow label="Buyer Name">
              <input
                className="doc-field"
                value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Firm Name">
              <input
                className="doc-field"
                value={buyer.firm}
                onChange={(e) => setBuyer({ ...buyer, firm: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Address">
              <textarea
                className="doc-field resize-none"
                rows={2}
                value={buyer.address}
                onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="GST No.">
              <input
                className="doc-field"
                value={buyer.gst}
                onChange={(e) => setBuyer({ ...buyer, gst: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="State">
              <input
                className="doc-field"
                value={buyer.state}
                onChange={(e) => setBuyer({ ...buyer, state: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Contact Person">
              <input
                className="doc-field"
                value={buyer.contact}
                onChange={(e) => setBuyer({ ...buyer, contact: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Mobile">
              <input
                className="doc-field"
                value={buyer.mobile}
                onChange={(e) => setBuyer({ ...buyer, mobile: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Email">
              <input
                className="doc-field"
                value={buyer.email}
                onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              />
            </FieldRow>
          </SectionBox>

          <div className="flex flex-col">
            <SectionBox icon={<CalendarClock size={13} />} title="QUOTATION DETAILS">
              <FieldRow label="Quotation No.">
                <input
                  className="doc-field"
                  value={quotation.no}
                  onChange={(e) => setQuotation({ ...quotation, no: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Date">
                <input
                  type="date"
                  className="doc-field"
                  value={quotation.date}
                  onChange={(e) => setQuotation({ ...quotation, date: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Valid Till">
                <input
                  type="date"
                  className="doc-field"
                  value={quotation.validTill}
                  onChange={(e) => setQuotation({ ...quotation, validTill: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Sales Executive">
                <input
                  className="doc-field"
                  value={quotation.salesExec}
                  onChange={(e) => setQuotation({ ...quotation, salesExec: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Payment Terms">
                <input
                  className="doc-field"
                  value={quotation.paymentTerms}
                  onChange={(e) => setQuotation({ ...quotation, paymentTerms: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Price Basis">
                <input
                  className="doc-field"
                  value={quotation.priceBasis}
                  onChange={(e) => setQuotation({ ...quotation, priceBasis: e.target.value })}
                />
              </FieldRow>
              <div className="flex items-center gap-4 mt-2 text-[10px] font-semibold text-[#0d1f45]">
                {(
                  [
                    ["ex-factory", "EX-FACTORY"],
                    ["ex-godown", "EX-GODOWN"],
                    ["delivered", "DELIVERED"],
                  ] as [PriceBasisType, string][]
                ).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={basisType === val}
                      onChange={() => setBasisType(val)}
                      className="accent-[#c8a24a] h-3 w-3"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </SectionBox>
          </div>
        </div>

        {/* PRODUCT TABLE */}
        <div className="px-5 mt-4">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#0d1f45] text-white">
                <Th className="rounded-tl-md w-8">SR.<br />NO.</Th>
                <Th>PRODUCT</Th>
                <Th>VARIETY</Th>
                <Th>PACKING</Th>
                <Th className="w-14">QTY<br />(BAGS)</Th>
                <Th className="w-16">RATE<br />(₹)</Th>
                <Th className="w-16">DISCOUNT<br />(₹)</Th>
                <Th className="w-12">GST<br />(%)</Th>
                <Th className="rounded-tr-md w-20">AMOUNT<br />(₹)</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const c = rowCalc(r);
                return (
                  <tr key={r.id} className="border-b border-[#e4e8f2]">
                    <Td className="text-center font-semibold text-[#0d1f45]">{idx + 1}</Td>
                    <Td>
                      <input
                        className="doc-field doc-field-sm"
                        value={r.product}
                        onChange={(e) => updateRow(r.id, "product", e.target.value)}
                      />
                    </Td>
                    <Td>
                      <input
                        className="doc-field doc-field-sm"
                        value={r.variety}
                        onChange={(e) => updateRow(r.id, "variety", e.target.value)}
                      />
                    </Td>
                    <Td>
                      <input
                        className="doc-field doc-field-sm"
                        value={r.packing}
                        onChange={(e) => updateRow(r.id, "packing", e.target.value)}
                      />
                    </Td>
                    <Td>
                      <input
                        type="number"
                        className="doc-field doc-field-sm text-right"
                        value={r.qty}
                        onChange={(e) => updateRow(r.id, "qty", e.target.value)}
                      />
                    </Td>
                    <Td>
                      <input
                        type="number"
                        className="doc-field doc-field-sm text-right"
                        value={r.rate}
                        onChange={(e) => updateRow(r.id, "rate", e.target.value)}
                      />
                    </Td>
                    <Td>
                      <input
                        type="number"
                        className="doc-field doc-field-sm text-right"
                        value={r.discount}
                        onChange={(e) => updateRow(r.id, "discount", e.target.value)}
                      />
                    </Td>
                    <Td>
                      <input
                        type="number"
                        className="doc-field doc-field-sm text-right"
                        value={r.gst}
                        onChange={(e) => updateRow(r.id, "gst", e.target.value)}
                      />
                    </Td>
                    <Td className="text-right font-semibold text-[#0d1f45] pr-2">
                      {c.amount > 0 ? rupee(c.amount) : ""}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AMOUNT IN WORDS + TOTALS */}
        <div className="px-5 mt-3 flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 w-full space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-[#0d1f45]">Amount in Words : </span>
              <div className="doc-field mt-1 text-[11px] italic min-h-[26px] flex items-center">
                {totals.grandTotal > 0 ? amountInWords(totals.grandTotal) : ""}
              </div>
            </div>

            {/* COMMERCIAL TERMS */}
            <SectionBox title="COMMERCIAL TERMS">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <IconField icon={<CreditCard size={13} />} label="Payment Terms">
                  <input
                    className="doc-field doc-field-sm"
                    value={commercial.paymentTerms}
                    onChange={(e) => setCommercial({ ...commercial, paymentTerms: e.target.value })}
                  />
                </IconField>
                <IconField icon={<Truck size={13} />} label="Delivery Time">
                  <input
                    className="doc-field doc-field-sm"
                    value={commercial.deliveryTime}
                    onChange={(e) => setCommercial({ ...commercial, deliveryTime: e.target.value })}
                  />
                </IconField>
                <IconField icon={<Package size={13} />} label="Dispatch">
                  <input
                    className="doc-field doc-field-sm"
                    value={commercial.dispatch}
                    onChange={(e) => setCommercial({ ...commercial, dispatch: e.target.value })}
                  />
                </IconField>
                <IconField icon={<Factory size={13} />} label="Price Basis">
                  <input
                    className="doc-field doc-field-sm"
                    value={commercial.priceBasis}
                    onChange={(e) => setCommercial({ ...commercial, priceBasis: e.target.value })}
                  />
                </IconField>
                <IconField icon={<Truck size={13} />} label="Freight">
                  <input
                    className="doc-field doc-field-sm"
                    value={commercial.freight}
                    onChange={(e) => setCommercial({ ...commercial, freight: e.target.value })}
                  />
                </IconField>
                <IconField icon={<CalendarClock size={13} />} label="Validity">
                  <input
                    className="doc-field doc-field-sm"
                    value={commercial.validity}
                    onChange={(e) => setCommercial({ ...commercial, validity: e.target.value })}
                  />
                </IconField>
              </div>
            </SectionBox>
          </div>

          {/* TOTALS BOX */}
          <div className="w-full sm:w-60 shrink-0 rounded-md overflow-hidden border border-[#e4e8f2]">
            <TotalRow label="SUB TOTAL" value={rupee(totals.subTotal)} />
            <TotalRow label="DISCOUNT" value={rupee(totals.discount)} />
            <TotalRow
              label="FREIGHT"
              value={
                <input
                  type="number"
                  value={freightAmt}
                  onChange={(e) => setFreightAmt(e.target.value)}
                  className="w-20 bg-[#e7ecf9] rounded px-1 text-right text-[11px] outline-none"
                  placeholder="0.00"
                />
              }
            />
            <TotalRow label="GST" value={rupee(totals.gst)} />
            <div className="flex items-center justify-between bg-[#c8a24a] text-white px-3 py-2 font-bold text-[12px]">
              <span>GRAND TOTAL</span>
              <span>₹ {rupee(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* TERMS & CONDITIONS */}
        <div className="px-5 mt-4">
          <SectionBox title="TERMS &amp; CONDITIONS">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {termsLeft.map((t, i) => (
                <TermItem key={`l-${i}`} text={t} />
              ))}
              {termsRight.map((t, i) => (
                <TermItem key={`r-${i}`} text={t} />
              ))}
            </div>
          </SectionBox>
        </div>

        {/* BANK DETAILS / BUYER ACCEPTANCE / AUTHORIZED SIGNATORY */}
        <div className="px-5 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SectionBox icon={<Landmark size={13} />} title="BANK DETAILS" className="sm:col-span-1">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <FieldRow label="Beneficiary" stacked>
                  <input
                    className="doc-field doc-field-sm"
                    value={bank.beneficiary}
                    onChange={(e) => setBank({ ...bank, beneficiary: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Bank Name" stacked>
                  <input
                    className="doc-field doc-field-sm"
                    value={bank.bankName}
                    onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Account No." stacked>
                  <input
                    className="doc-field doc-field-sm"
                    value={bank.accountNo}
                    onChange={(e) => setBank({ ...bank, accountNo: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="IFSC Code" stacked>
                  <input
                    className="doc-field doc-field-sm"
                    value={bank.ifsc}
                    onChange={(e) => setBank({ ...bank, ifsc: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Branch" stacked>
                  <input
                    className="doc-field doc-field-sm"
                    value={bank.branch}
                    onChange={(e) => setBank({ ...bank, branch: e.target.value })}
                  />
                </FieldRow>
              </div>
              <div className="w-20 shrink-0 flex flex-col items-center justify-start gap-1">
                <div className="w-20 h-20 border border-[#e4e8f2] rounded flex items-center justify-center bg-white overflow-hidden">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="Payment QR" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[8px] text-center text-[#9aa5c2] px-1">
                      Add UPI ID for QR
                    </span>
                  )}
                </div>
                <input
                  className="doc-field doc-field-sm text-center"
                  placeholder="UPI ID"
                  value={bank.upiId}
                  onChange={(e) => setBank({ ...bank, upiId: e.target.value })}
                />
                <span className="text-[8px] font-semibold text-[#0d1f45]">SCAN TO PAY</span>
              </div>
            </div>
          </SectionBox>

          <SectionBox icon={<UserRound size={13} />} title="BUYER ACCEPTANCE">
            <p className="text-[9px] text-[#5b6685] mb-1.5">
              I/We have read and accepted all the above terms &amp; conditions.
            </p>
            <FieldRow label="Name" stacked>
              <input
                className="doc-field doc-field-sm"
                value={acceptance.buyerName}
                onChange={(e) => setAcceptance({ ...acceptance, buyerName: e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Signature" stacked>
              <input
                className="doc-field doc-field-sm italic"
                style={{ fontFamily: "var(--font-display)" }}
                value={acceptance.buyerSignature}
                onChange={(e) => setAcceptance({ ...acceptance, buyerSignature: e.target.value })}
                placeholder="Type to sign"
              />
            </FieldRow>
            <FieldRow label="Stamp" stacked>
              <div className="doc-field h-9" />
            </FieldRow>
            <FieldRow label="Date" stacked>
              <input
                type="date"
                className="doc-field doc-field-sm"
                value={acceptance.buyerDate}
                onChange={(e) => setAcceptance({ ...acceptance, buyerDate: e.target.value })}
              />
            </FieldRow>
          </SectionBox>

          <SectionBox title="AUTHORIZED SIGNATORY">
            <p className="text-[10px] font-semibold text-[#0d1f45]">
              For ELLEVA GLOBAL FOOD IMPEX PVT LTD
            </p>
            <div className="doc-field h-14 mt-3" />
            <input
              className="doc-field doc-field-sm mt-2 text-center"
              placeholder="Name"
              value={signatory.name}
              onChange={(e) => setSignatory({ name: e.target.value })}
            />
            <p className="text-[9px] text-center text-[#5b6685] mt-1">Authorized Signatory</p>
          </SectionBox>
        </div>

        {/* FOOTER */}
        <div className="mt-5 border-t-4 border-[#c8a24a] bg-[#0d1f45] px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
          <div>
            <p className="font-display italic font-bold text-lg text-[#e4c77a]">Thank you!</p>
            <p className="text-[10px] text-white/90">
              We look forward to serving you with Premium Quality Basmati Rice.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[8px] font-semibold text-center">
            {["NATURALLY AGED", "EXTRA LONG GRAIN", "RICH AROMA", "HYGIENIC PROCESSING", "PREMIUM QUALITY"].map(
              (t) => (
                <div key={t} className="flex flex-col items-center gap-1 w-14">
                  <span className="w-6 h-6 rounded-full border border-[#c8a24a] flex items-center justify-center text-[#e4c77a]">
                    ●
                  </span>
                  <span>{t}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* SUBMIT BAR */}
      <div className="no-print max-w-[850px] mx-auto mt-5 flex flex-col items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={status === "generating" || status === "saving"}
          className="flex items-center gap-2 bg-[#0d1f45] hover:bg-[#14295c] disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition"
        >
          {(status === "generating" || status === "saving") && <Loader2 size={16} className="animate-spin" />}
          {status === "generating"
            ? "Generating PDF..."
            : status === "saving"
            ? "Saving..."
            : "Generate Quotation PDF & Submit"}
        </button>
        {status !== "idle" && statusMsg && (
          <div
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
              status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {status === "error" ? <X size={13} /> : <CheckCircle2 size={13} />}
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Sub components ------------------------------- */

function CertBadge({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span>{label}</span>
      <span className="text-[7px] font-normal text-[#5b6685]">{sub}</span>
    </div>
  );
}

function ContactLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-[1px] text-[#e4c77a] shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function SectionBox({
  icon,
  title,
  children,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-[#e4e8f2] rounded-md p-3 ${className}`}>
      <div className="inline-flex items-center gap-1.5 bg-[#0d1f45] text-white text-[10px] font-bold px-3 py-1 rounded-full -mt-5 mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({
  label,
  children,
  stacked = false,
}: {
  label: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="mb-1.5">
        <label className="block text-[9px] font-semibold text-[#0d1f45] mb-0.5">{label}</label>
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="w-28 shrink-0 text-[10.5px] font-semibold text-[#0d1f45]">{label}</label>
      <span className="text-[10px] text-[#93a0c2]">:</span>
      {children}
    </div>
  );
}

function IconField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[#c8a24a]">{icon}</span>
      <div className="flex-1">
        <label className="block text-[9px] font-semibold text-[#0d1f45]">{label}</label>
        {children}
      </div>
    </div>
  );
}

function TermItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 text-[9.5px] text-[#28325a] leading-snug">
      <span className="text-[#c8a24a] mt-[1px] shrink-0">✔</span>
      <span>{text}</span>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-1.5 py-1.5 text-center font-bold border border-[#0d1f45]/40 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-1.5 py-1 align-middle ${className}`}>{children}</td>;
}

function TotalRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-[#f4f6fb] px-3 py-1.5 text-[11px] font-semibold text-[#0d1f45] border-b border-white">
      <span>{label}</span>
      <span>{typeof value === "string" ? `₹ ${value}` : value}</span>
    </div>
  );
}
