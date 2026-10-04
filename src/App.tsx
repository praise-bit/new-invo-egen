// @ts-nocheck

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import "./App.css";

type DocumentType = "invoice" | "waybill";

type InvoiceLine = {
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
};

type WaybillLine = {
  item: string;
  qty: string;
  description: string;
  remarks: string;
};

type InvoiceItem = {
  number: string;
  date: string;
  day: string;
  month: string;
  year: string;
  clientName: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
  vatRate: string;
  vatAmount: string;
  grandTotal: string;
  amountInWords: string;
  lines?: InvoiceLine[];
};

type WaybillItem = {
  number: string;
  date: string;
  clientName: string;
  item: string;
  qty: string;
  description: string;
  remarks: string;
  grn: string;
  receiverName: string;
  signatureLeft: string;
  signatureRight: string;
  vehicleLeft: string;
  vehicleRight: string;
  dateLeft: string;
  dateRight: string;
  purchaseOrder: string;
  sumTotal: string;
  deliveredBy: string;
  receivedBy: string;
  lines?: WaybillLine[];
};

export default function App() {
  const today = new Date();

  const pad = (n: number) =>
    String(n).padStart(2, "0");

  const [documentType, setDocumentType] =
    useState<DocumentType>("invoice");

  /* =====================================================
     INVOICE
  ===================================================== */

  const [invoiceNum, setInvoiceNum] =
    useState("0627");

  const [day, setDay] =
    useState(pad(today.getDate()));

  const [month, setMonth] =
    useState(pad(today.getMonth() + 1));

  const [year, setYear] =
    useState(String(today.getFullYear()));

  const [clientName, setClientName] =
    useState("");

  const [invoiceLines, setInvoiceLines] =
    useState<InvoiceLine[]>([
      {
        description: "",
        qty: "",
        unitPrice: "",
        amount: "",
      },
    ]);

  const [vatRate, setVatRate] =
    useState("");

  const [vatAmount, setVatAmount] =
    useState("");

  const [grandTotal, setGrandTotal] =
    useState("");

  const [amountInWords, setAmountInWords] =
    useState("");

  const [history, setHistory] =
    useState<InvoiceItem[]>([]);

  const [waybillHistory, setWaybillHistory] =
    useState<WaybillItem[]>([]);

  /* =====================================================
     WAYBILL
  ===================================================== */

  const [waybillNum, setWaybillNum] =
    useState("0550");

  const [waybillClientName, setWaybillClientName] =
    useState("");

  const [waybillLines, setWaybillLines] =
    useState<WaybillLine[]>([
      {
        item: "",
        qty: "",
        description: "",
        remarks: "",
      },
    ]);

  const [waybillGrn, setWaybillGrn] =
    useState("");

  const [waybillSumTotal, setWaybillSumTotal] =
    useState("");

  const [waybillReceiverName, setWaybillReceiverName] =
    useState("");

  const [waybillDeliveredBy, setWaybillDeliveredBy] =
    useState("");

  const [waybillSignatureLeft, setWaybillSignatureLeft] =
    useState("");

  const [waybillSignatureRight, setWaybillSignatureRight] =
    useState("");

  const [waybillVehicleLeft, setWaybillVehicleLeft] =
    useState("");

  const [waybillVehicleRight, setWaybillVehicleRight] =
    useState("");

  const [waybillDateLeft, setWaybillDateLeft] =
    useState("");

  const [waybillDateRight, setWaybillDateRight] =
    useState("");

  const [waybillPurchaseOrder, setWaybillPurchaseOrder] =
    useState("");

  const [waybillReceivedBy, setWaybillReceivedBy] =
    useState("");

  /* =====================================================
     DOCUMENT / SCALING
  ===================================================== */

  const documentRef = useRef(null);
  const stageRef = useRef(null);

  const [documentScale, setDocumentScale] =
    useState(1);

  /*
    Fixed coordinate system.
    DO NOT change this unless the template itself
    is intentionally redesigned.
  */

  const DOCUMENT_WIDTH = 739;

  /*
    Dynamic row spacing.
    The starting position remains manually fixed.
    Only the next row moves down when Description
    or Remarks becomes taller.
  */

  const BODY_ROW_HEIGHT = 34;
  const INVOICE_BODY_TOP = 410;
  const WAYBILL_BODY_TOP = 450;

  const [invoiceLineTops, setInvoiceLineTops] =
    useState<number[]>([]);

  const [waybillLineTops, setWaybillLineTops] =
    useState<number[]>([]);

  /* =====================================================
     LOAD HISTORY
  ===================================================== */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("invoiceHistory");

      if (saved) {
        setHistory(JSON.parse(saved));
      }

      const savedWaybills =
        localStorage.getItem("waybillHistory");

      if (savedWaybills) {
        setWaybillHistory(
          JSON.parse(savedWaybills)
        );
      }
    } catch {
      setHistory([]);
      setWaybillHistory([]);
    }
  }, []);

  /* =====================================================
     RESPONSIVE DOCUMENT SCALING
  ===================================================== */

  useEffect(() => {
    let frame = 0;

    const updateScale = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        if (!stageRef.current) return;

        const parent =
          stageRef.current.parentElement;

        const availableWidth =
          parent?.clientWidth ||
          DOCUMENT_WIDTH;

        const nextScale = Math.min(
          1,
          Math.max(
            0.35,
            availableWidth / DOCUMENT_WIDTH
          )
        );

        setDocumentScale(nextScale);
      });
    };

    updateScale();

    let observer = null;

    if (
      typeof ResizeObserver !== "undefined" &&
      stageRef.current?.parentElement
    ) {
      observer =
        new ResizeObserver(updateScale);

      observer.observe(
        stageRef.current.parentElement
      );
    }

    window.addEventListener(
      "resize",
      updateScale
    );

    return () => {
      cancelAnimationFrame(frame);

      if (observer) {
        observer.disconnect();
      }

      window.removeEventListener(
        "resize",
        updateScale
      );
    };
  }, [documentType]);

  /* =====================================================
     DYNAMIC ROW MEASUREMENT
  ===================================================== */

  useLayoutEffect(() => {
    if (!documentRef.current) return;

    const measureRows = (
      rowType: "invoice" | "waybill",
      count: number,
      baseTop: number
    ) => {
      let nextTop = baseTop;
      const tops: number[] = [];

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        tops.push(nextTop);

        const cells = Array.from(
          documentRef.current.querySelectorAll(
            `[data-body-row="${rowType}"][data-line-index="${index}"]`
          )
        ) as HTMLElement[];

        const tallestCell =
          cells.reduce(
            (height, cell) => {
              const measuredHeight =
                Math.max(
                  cell.scrollHeight || 0,
                  cell.getBoundingClientRect()
                    .height || 0,
                  BODY_ROW_HEIGHT
                );

              return Math.max(
                height,
                measuredHeight
              );
            },
            BODY_ROW_HEIGHT
          );

        const rowsUsed = Math.max(
          1,
          Math.ceil(
            (tallestCell + 1) /
              BODY_ROW_HEIGHT
          )
        );

        nextTop +=
          rowsUsed * BODY_ROW_HEIGHT;
      }

      return tops;
    };

    if (documentType === "invoice") {
      const nextTops = measureRows(
        "invoice",
        invoiceLines.length,
        INVOICE_BODY_TOP
      );

      setInvoiceLineTops((current) =>
        current.length ===
          nextTops.length &&
        current.every(
          (value, i) =>
            value === nextTops[i]
        )
          ? current
          : nextTops
      );
    } else {
      const nextTops = measureRows(
        "waybill",
        waybillLines.length,
        WAYBILL_BODY_TOP
      );

      setWaybillLineTops((current) =>
        current.length ===
          nextTops.length &&
        current.every(
          (value, i) =>
            value === nextTops[i]
        )
          ? current
          : nextTops
      );
    }
  }, [
    documentType,
    invoiceLines,
    waybillLines,
  ]);

  /* =====================================================
     INVOICE FUNCTIONS
  ===================================================== */

  const updateInvoiceLine = (
    index: number,
    field: keyof InvoiceLine,
    value: string
  ) => {
    setInvoiceLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  };

  const addInvoiceLine = () => {
    setInvoiceLines((current) => [
      ...current,
      {
        description: "",
        qty: "",
        unitPrice: "",
        amount: "",
      },
    ]);
  };

  const removeInvoiceLine = (
    index: number
  ) => {
    setInvoiceLines((current) =>
      current.length === 1
        ? [
            {
              description: "",
              qty: "",
              unitPrice: "",
              amount: "",
            },
          ]
        : current.filter(
            (_, i) => i !== index
          )
    );
  };

  const saveInvoice = () => {
    const firstLine =
      invoiceLines[0] || {
        description: "",
        qty: "",
        unitPrice: "",
        amount: "",
      };

    const updated: InvoiceItem[] = [
      {
        number: invoiceNum,
        date: `${day}/${month}/${year}`,
        day,
        month,
        year,
        clientName,
        description:
          firstLine.description,
        qty: firstLine.qty,
        unitPrice: firstLine.unitPrice,
        amount: firstLine.amount,
        vatRate,
        vatAmount,
        grandTotal,
        amountInWords,
        lines: invoiceLines,
      },
      ...history,
    ];

    setHistory(updated);

    try {
      localStorage.setItem(
        "invoiceHistory",
        JSON.stringify(updated)
      );
    } catch {}

    alert("Invoice Saved!");
  };

  const loadInvoice = (
    item: InvoiceItem
  ) => {
    setInvoiceNum(item.number);
    setDay(item.day);
    setMonth(item.month);
    setYear(item.year);
    setClientName(item.clientName);

    setInvoiceLines(
      item.lines &&
        item.lines.length
        ? item.lines
        : [
            {
              description:
                item.description || "",
              qty: item.qty || "",
              unitPrice:
                item.unitPrice || "",
              amount:
                item.amount || "",
            },
          ]
    );

    setVatRate(item.vatRate);
    setVatAmount(item.vatAmount);
    setGrandTotal(item.grandTotal);
    setAmountInWords(
      item.amountInWords
    );

    setDocumentType("invoice");
  };

  const handleNextInvoice = () => {
    setInvoiceNum(
      String(
        Number(invoiceNum || "0") + 1
      ).padStart(4, "0")
    );
  };

  const clearInvoiceFields = () => {
    setClientName("");

    setInvoiceLines([
      {
        description: "",
        qty: "",
        unitPrice: "",
        amount: "",
      },
    ]);

    setVatRate("");
    setVatAmount("");
    setGrandTotal("");
    setAmountInWords("");
  };

  /* =====================================================
     WAYBILL FUNCTIONS
  ===================================================== */

  const updateWaybillLine = (
    index: number,
    field: keyof WaybillLine,
    value: string
  ) => {
    setWaybillLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  };

  const addWaybillLine = () => {
    setWaybillLines((current) => [
      ...current,
      {
        item: "",
        qty: "",
        description: "",
        remarks: "",
      },
    ]);
  };

  const removeWaybillLine = (
    index: number
  ) => {
    setWaybillLines((current) =>
      current.length === 1
        ? [
            {
              item: "",
              qty: "",
              description: "",
              remarks: "",
            },
          ]
        : current.filter(
            (_, i) => i !== index
          )
    );
  };

  const saveWaybill = () => {
    const firstLine =
      waybillLines[0] || {
        item: "",
        qty: "",
        description: "",
        remarks: "",
      };

    const updated: WaybillItem[] = [
      {
        number: waybillNum,
        date: "",
        clientName:
          waybillClientName,
        item: firstLine.item,
        qty: firstLine.qty,
        description:
          firstLine.description,
        remarks: firstLine.remarks,
        grn: waybillGrn,
        receiverName:
          waybillReceiverName,
        signatureLeft:
          waybillSignatureLeft,
        signatureRight:
          waybillSignatureRight,
        vehicleLeft:
          waybillVehicleLeft,
        vehicleRight:
          waybillVehicleRight,
        dateLeft:
          waybillDateLeft,
        dateRight:
          waybillDateRight,
        purchaseOrder:
          waybillPurchaseOrder,
        sumTotal:
          waybillSumTotal,
        deliveredBy:
          waybillDeliveredBy,
        receivedBy:
          waybillReceivedBy,
        lines: waybillLines,
      },
      ...waybillHistory,
    ];

    setWaybillHistory(updated);

    try {
      localStorage.setItem(
        "waybillHistory",
        JSON.stringify(updated)
      );
    } catch {}

    alert("Waybill Saved!");
  };

  const loadWaybill = (
    item: WaybillItem
  ) => {
    setWaybillNum(item.number);
    setWaybillClientName(
      item.clientName
    );

    setWaybillLines(
      item.lines &&
        item.lines.length
        ? item.lines
        : [
            {
              item: item.item || "",
              qty: item.qty || "",
              description:
                item.description || "",
              remarks:
                item.remarks || "",
            },
          ]
    );

    setWaybillSumTotal(
      item.sumTotal
    );
    setWaybillReceiverName(
      item.receiverName
    );
    setWaybillDeliveredBy(
      item.deliveredBy
    );
    setWaybillSignatureLeft(
      item.signatureLeft
    );
    setWaybillSignatureRight(
      item.signatureRight
    );
    setWaybillVehicleLeft(
      item.vehicleLeft
    );
    setWaybillVehicleRight(
      item.vehicleRight
    );
    setWaybillDateLeft(
      item.dateLeft
    );
    setWaybillDateRight(
      item.dateRight
    );
    setWaybillPurchaseOrder(
      item.purchaseOrder
    );
    setWaybillReceivedBy(
      item.receivedBy
    );

    setDocumentType("waybill");
  };

  const handleNextWaybill = () => {
    setWaybillNum(
      String(
        Number(waybillNum || "0") + 1
      ).padStart(4, "0")
    );
  };

  const clearWaybillFields = () => {
    setWaybillClientName("");

    setWaybillLines([
      {
        item: "",
        qty: "",
        description: "",
        remarks: "",
      },
    ]);

    setWaybillGrn("");
    setWaybillSumTotal("");
    setWaybillReceiverName("");
    setWaybillDeliveredBy("");
    setWaybillSignatureLeft("");
    setWaybillSignatureRight("");
    setWaybillVehicleLeft("");
    setWaybillVehicleRight("");
    setWaybillDateLeft("");
    setWaybillDateRight("");
    setWaybillPurchaseOrder("");
    setWaybillReceivedBy("");
  };

  /* =====================================================
     PDF
  ===================================================== */

  const downloadPDF = async () => {
    if (!documentRef.current) return;

    try {
      const {
        default: html2canvas,
      } = await import(
        "html2canvas"
      );

      const { jsPDF } =
        await import("jspdf");

      const canvas =
        await html2canvas(
          documentRef.current,
          {
            scale: 3,
            useCORS: true,
            allowTaint: false,
            backgroundColor:
              "#ffffff",
            logging: false,

            onclone:
              (
                clonedDocument
              ) => {
                const clonedTransform =
                  clonedDocument.querySelector(
                    ".document-transform"
                  );

                if (
                  clonedTransform
                ) {
                  clonedTransform.style.transform =
                    "none";
                }

                const clonedStage =
                  clonedDocument.querySelector(
                    ".document-stage"
                  );

                if (clonedStage) {
                  clonedStage.style.width =
                    "739px";
                }
              },
          }
        );

      const imgData =
        canvas.toDataURL(
          "image/png"
        );

      const pdf = new jsPDF(
        "p",
        "mm",
        "a4"
      );

      const pdfWidth = 210;

      const pdfHeight =
        (canvas.height *
          pdfWidth) /
        canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight
      );

      pdf.save(
        documentType === "invoice"
          ? `invoice-${invoiceNum}.pdf`
          : `waybill-${waybillNum}.pdf`
      );
    } catch (error) {
      console.error(
        "PDF generation failed:",
        error
      );

      alert(
        "Unable to generate PDF. Please try again."
      );
    }
  };

  /* =====================================================
     TEMPLATE
  ===================================================== */

  const invoiceTemplateSrc =
    process.env.PUBLIC_URL +
    "/invoice_canvas.jpeg";

  const waybillTemplateSrc =
    process.env.PUBLIC_URL +
    "/waybill_canvas.jpeg";

  const isInvoice =
    documentType === "invoice";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="app-root">

      <h1 className="title">
        {isInvoice
          ? "E-Invoice"
          : "E-Waybill"}
      </h1>

      <div className="document-switcher">

        <button
          type="button"
          className={
            "document-tab " +
            (isInvoice
              ? "active"
              : "")
          }
          onClick={() =>
            setDocumentType(
              "invoice"
            )
          }
        >
          Invoice
        </button>

        <button
          type="button"
          className={
            "document-tab " +
            (!isInvoice
              ? "active"
              : "")
          }
          onClick={() =>
            setDocumentType(
              "waybill"
            )
          }
        >
          Waybill
        </button>

      </div>

      <div className="main-layout">

        <div className="invoice-column">

          <div
            ref={stageRef}
            className="document-stage"
            style={{
              width:
                DOCUMENT_WIDTH *
                documentScale,
            }}
          >

            <div
              className={
                "document-transform " +
                (isInvoice
                  ? "invoice-document"
                  : "waybill-document")
              }
              style={{
                transform:
                  `scale(${documentScale})`,
              }}
            >

              <div
                className="invoice-wrapper"
                ref={documentRef}
              >

                <img
                  src={
                    isInvoice
                      ? invoiceTemplateSrc
                      : waybillTemplateSrc
                  }
                  className="invoice-img"
                  crossOrigin="anonymous"
                  draggable={false}
                  alt={
                    isInvoice
                      ? "Invoice Template"
                      : "Waybill Template"
                  }
                />

                {/* =========================
                    INVOICE
                ========================= */}

                {isInvoice ? (
                  <>

                    <div className="overlay invoice-number">
                      {invoiceNum}
                    </div>

                    <div className="overlay date-day">
                      {day}
                    </div>

                    <div className="overlay date-month">
                      {month}
                    </div>

                    <div className="overlay date-year">
                      {year}
                    </div>

                    <div className="overlay client-name">
                      {clientName}
                    </div>

                    {invoiceLines.map(
                      (line, index) => {
                        const top =
                          invoiceLineTops[
                            index
                          ] ??
                          INVOICE_BODY_TOP +
                            index *
                              BODY_ROW_HEIGHT;

                        return (
                          <React.Fragment
                            key={
                              `invoice-line-${index}`
                            }
                          >

                            <div
                              className="overlay description"
                              data-body-row="invoice"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.description}
                            </div>

                            <div
                              className="overlay qty"
                              data-body-row="invoice"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.qty}
                            </div>

                            <div
                              className="overlay unit-price"
                              data-body-row="invoice"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top - 2}px`,
                              }}
                            >
                              {line.unitPrice}
                            </div>

                            <div
                              className="overlay amount"
                              data-body-row="invoice"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.amount}
                            </div>

                          </React.Fragment>
                        );
                      }
                    )}

                    <div className="overlay vat-rate">
                      {vatRate}
                    </div>

                    <div className="overlay vat-amount">
                      {vatAmount}
                    </div>

                    <div className="overlay grand-total">
                      {grandTotal}
                    </div>

                    <div className="overlay amount-words">
                      {amountInWords}
                    </div>

                  </>

                ) : (

                  /* =========================
                     WAYBILL
                  ========================= */

                  <>

                    <div className="overlay waybill-number">
                      {waybillNum}
                    </div>

                    <div className="overlay waybill-client">
                      {waybillClientName}
                    </div>

                    {waybillLines.map(
                      (line, index) => {
                        const top =
                          waybillLineTops[
                            index
                          ] ??
                          WAYBILL_BODY_TOP +
                            index *
                              BODY_ROW_HEIGHT;

                        return (
                          <React.Fragment
                            key={
                              `waybill-line-${index}`
                            }
                          >

                            <div
                              className="overlay waybill-item"
                              data-body-row="waybill"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.item}
                            </div>

                            <div
                              className="overlay waybill-qty"
                              data-body-row="waybill"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.qty}
                            </div>

                            <div
                              className="overlay waybill-description"
                              data-body-row="waybill"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.description}
                            </div>

                            <div
                              className="overlay waybill-remarks"
                              data-body-row="waybill"
                              data-line-index={
                                index
                              }
                              style={{
                                top:
                                  `${top}px`,
                              }}
                            >
                              {line.remarks}
                            </div>

                          </React.Fragment>
                        );
                      }
                    )}

                    <div className="overlay waybill-grn">
                      {waybillGrn}
                    </div>

                    <div className="overlay waybill-sum-total">
                      {waybillSumTotal}
                    </div>

                    <div className="overlay waybill-receiver">
                      {waybillReceiverName}
                    </div>

                    <div className="overlay waybill-po">
                      {waybillPurchaseOrder}
                    </div>

                    <div className="overlay waybill-delivered-by">
                      {waybillDeliveredBy}
                    </div>

                    <div className="overlay waybill-signature-left">
                      {waybillSignatureLeft}
                    </div>

                    <div className="overlay waybill-signature-right">
                      {waybillSignatureRight}
                    </div>

                    <div className="overlay waybill-vehicle-left">
                      {waybillVehicleLeft}
                    </div>

                    <div className="overlay waybill-vehicle-right">
                      {waybillVehicleRight}
                    </div>

                    <div className="overlay waybill-date-left">
                      {waybillDateLeft}
                    </div>

                    <div className="overlay waybill-date-right">
                      {waybillDateRight}
                    </div>

                    <div className="overlay waybill-received-by">
                      {waybillReceivedBy}
                    </div>

                  </>

                )}

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="sidebar">

          {isInvoice ? (

            <>

              <div className="panel">

                <h3>
                  Invoice Manual Entry
                </h3>

                <label>
                  Invoice #
                </label>

                <input
                  className="input"
                  value={invoiceNum}
                  onChange={(e) =>
                    setInvoiceNum(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Client Name
                </label>

                <input
                  className="input"
                  value={clientName}
                  onChange={(e) =>
                    setClientName(
                      e.target.value
                    )
                  }
                />

                <div className="line-items-editor">

                  <div className="line-items-title">
                    Invoice Items
                  </div>

                  {invoiceLines.map(
                    (line, index) => (
                      <div
                        className="line-item-card"
                        key={
                          `invoice-editor-${index}`
                        }
                      >

                        <div className="line-item-card-header">
                          <strong>
                            Line {index + 1}
                          </strong>

                          <button
                            type="button"
                            className="remove-line-btn"
                            onClick={() =>
                              removeInvoiceLine(
                                index
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>

                        <label className="label">
                          Description
                        </label>

                        <textarea
                          className="input line-textarea"
                          rows={3}
                          value={
                            line.description
                          }
                          onChange={(e) =>
                            updateInvoiceLine(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                        />

                        <label className="label">
                          Qty
                        </label>

                        <input
                          className="input"
                          value={line.qty}
                          onChange={(e) =>
                            updateInvoiceLine(
                              index,
                              "qty",
                              e.target.value
                            )
                          }
                        />

                        <label className="label">
                          Unit Price
                        </label>

                        <input
                          className="input"
                          value={
                            line.unitPrice
                          }
                          onChange={(e) =>
                            updateInvoiceLine(
                              index,
                              "unitPrice",
                              e.target.value
                            )
                          }
                        />

                        <label className="label">
                          Amount
                        </label>

                        <input
                          className="input"
                          value={line.amount}
                          onChange={(e) =>
                            updateInvoiceLine(
                              index,
                              "amount",
                              e.target.value
                            )
                          }
                        />

                      </div>
                    )
                  )}

                  <button
                    type="button"
                    className="btn add-line"
                    onClick={
                      addInvoiceLine
                    }
                  >
                    + Add Invoice Line
                  </button>

                </div>

                <label className="label">
                  VAT Rate (%)
                </label>

                <input
                  className="input"
                  value={vatRate}
                  onChange={(e) =>
                    setVatRate(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  VAT Amount
                </label>

                <input
                  className="input"
                  value={vatAmount}
                  onChange={(e) =>
                    setVatAmount(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Grand Total (₦)
                </label>

                <input
                  className="input"
                  value={grandTotal}
                  onChange={(e) =>
                    setGrandTotal(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Amount in Words
                </label>

                <textarea
                  className="input"
                  value={
                    amountInWords
                  }
                  onChange={(e) =>
                    setAmountInWords(
                      e.target.value
                    )
                  }
                />

                <div className="buttons-row">

                  <button
                    type="button"
                    className="btn save"
                    onClick={
                      saveInvoice
                    }
                  >
                    Save Invoice
                  </button>

                  <button
                    type="button"
                    className="btn clear"
                    onClick={
                      clearInvoiceFields
                    }
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    className="btn next"
                    onClick={
                      handleNextInvoice
                    }
                  >
                    Next
                  </button>

                  <button
                    type="button"
                    className="btn pdf"
                    onClick={
                      downloadPDF
                    }
                  >
                    Download PDF
                  </button>

                </div>

              </div>

              <div className="panel history-panel">

                <h3>
                  Saved Invoices
                </h3>

                {history.length === 0 ? (

                  <div className="empty-history">
                    No saved invoices yet.
                  </div>

                ) : (

                  history.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="history-item"
                      >

                        #{item.number} —{" "}
                        {item.day}/
                        {item.month}/
                        {item.year}

                        <button
                          type="button"
                          className="btn load-btn"
                          onClick={() =>
                            loadInvoice(
                              item
                            )
                          }
                        >
                          Load
                        </button>

                      </div>

                    )
                  )

                )}

              </div>

            </>

          ) : (

            <>

              <div className="panel">

                <h3>
                  Waybill Manual Entry
                </h3>

                <label>
                  Waybill #
                </label>

                <input
                  className="input"
                  value={waybillNum}
                  onChange={(e) =>
                    setWaybillNum(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Client Name / TO
                </label>

                <input
                  className="input"
                  value={
                    waybillClientName
                  }
                  onChange={(e) =>
                    setWaybillClientName(
                      e.target.value
                    )
                  }
                />

                <div className="line-items-editor">

                  <div className="line-items-title">
                    Waybill Items
                  </div>

                  {waybillLines.map(
                    (line, index) => (

                      <div
                        className="line-item-card"
                        key={
                          `waybill-editor-${index}`
                        }
                      >

                        <div className="line-item-card-header">

                          <strong>
                            Line {index + 1}
                          </strong>

                          <button
                            type="button"
                            className="remove-line-btn"
                            onClick={() =>
                              removeWaybillLine(
                                index
                              )
                            }
                          >
                            Remove
                          </button>

                        </div>

                        <label className="label">
                          Item
                        </label>

                        <input
                          className="input"
                          value={line.item}
                          onChange={(e) =>
                            updateWaybillLine(
                              index,
                              "item",
                              e.target.value
                            )
                          }
                        />

                        <label className="label">
                          Qty
                        </label>

                        <input
                          className="input"
                          value={line.qty}
                          onChange={(e) =>
                            updateWaybillLine(
                              index,
                              "qty",
                              e.target.value
                            )
                          }
                        />

                        <label className="label">
                          Description
                        </label>

                        <textarea
                          className="input line-textarea"
                          rows={3}
                          value={
                            line.description
                          }
                          onChange={(e) =>
                            updateWaybillLine(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                        />

                        <label className="label">
                          Remarks
                        </label>

                        <textarea
                          className="input line-textarea"
                          rows={3}
                          value={
                            line.remarks
                          }
                          onChange={(e) =>
                            updateWaybillLine(
                              index,
                              "remarks",
                              e.target.value
                            )
                          }
                        />

                      </div>

                    )
                  )}

                  <button
                    type="button"
                    className="btn add-line"
                    onClick={
                      addWaybillLine
                    }
                  >
                    + Add Waybill Line
                  </button>

                </div>

                <label className="label">
                  Sum Total
                </label>

                <input
                  className="input"
                  value={
                    waybillSumTotal
                  }
                  onChange={(e) =>
                    setWaybillSumTotal(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Purchase Order (PO)
                </label>

                <input
                  className="input"
                  value={
                    waybillPurchaseOrder
                  }
                  onChange={(e) =>
                    setWaybillPurchaseOrder(
                      e.target.value
                    )
                  }
                />

                {/* Right/ DISPATCH */}

                <div className="waybill-section-title">
                  Right / Dispatch Side
                </div>

                <label className="label">
                  Delivered By
                </label>

                <input
                  className="input"
                  value={
                    waybillDeliveredBy
                  }
                  onChange={(e) =>
                    setWaybillDeliveredBy(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Vehicle No.
                </label>

                <input
                  className="input"
                  value={
                    waybillVehicleRight
                  }
                  onChange={(e) =>
                    setWaybillVehicleRight(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Date
                </label>

                <input
                  className="input"
                  value={
                    waybillDateRight
                  }
                  onChange={(e) =>
                    setWaybillDateRight(
                      e.target.value
                    )
                  }
                />

                {/* LEFT / RECEIVING */}

                <div className="waybill-section-title">
                  LEFT / Receiving Side
                </div>

                <label className="label">
                  Vehicle No.
                </label>

                <input
                  className="input"
                  value={
                    waybillVehicleLeft
                  }
                  onChange={(e) =>
                    setWaybillVehicleLeft(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Date
                </label>

                <input
                  className="input"
                  value={
                    waybillDateLeft
                  }
                  onChange={(e) =>
                    setWaybillDateLeft(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Received By
                </label>

                <input
                  className="input"
                  value={
                    waybillReceivedBy
                  }
                  onChange={(e) =>
                    setWaybillReceivedBy(
                      e.target.value
                    )
                  }
                />

                <div className="buttons-row">

                  <button
                    type="button"
                    className="btn save"
                    onClick={
                      saveWaybill
                    }
                  >
                    Save Waybill
                  </button>

                  <button
                    type="button"
                    className="btn clear"
                    onClick={
                      clearWaybillFields
                    }
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    className="btn next"
                    onClick={
                      handleNextWaybill
                    }
                  >
                    Next
                  </button>

                  <button
                    type="button"
                    className="btn pdf"
                    onClick={
                      downloadPDF
                    }
                  >
                    Download PDF
                  </button>

                </div>

              </div>

              <div className="panel history-panel">

                <h3>
                  Saved Waybills
                </h3>

                {waybillHistory.length ===
                0 ? (

                  <div className="empty-history">
                    No saved waybills yet.
                  </div>

                ) : (

                  waybillHistory.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="history-item"
                      >

                        #{item.number} —{" "}
                        {item.clientName ||
                          "No client"}

                        <button
                          type="button"
                          className="btn load-btn"
                          onClick={() =>
                            loadWaybill(
                              item
                            )
                          }
                        >
                          Load
                        </button>

                      </div>

                    )
                  )

                )}

              </div>

            </>

          )}

        </aside>

      </div>

    </div>
  );
}