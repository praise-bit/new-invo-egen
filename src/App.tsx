// @ts-nocheck

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import "./App.css";

type DocumentType = "invoice" | "waybill" | "letter";

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

type LetterRow = {
  qty: string;
  unit: string;
  partNo: string;
  description: string;
  unitPrice: string;
  extPrice: string;
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

type LetterItem = {
  date: string;
  recipient: string;
  salutation: string;
  subject: string;
  intro: string;
  mode: "table" | "plain";
  rows: LetterRow[];
  total: string;
  body: string;
};

/* =====================================================
   LETTER – SHARED CONSTANTS
   (used by BOTH the on-screen preview and the Word file)
===================================================== */

const LETTER_DEFAULT_SALUTATION = "Dear Sir/Madam,";

const LETTER_DEFAULT_INTRO =
  "Please find below quotation in respect of your request.";

/* Table column widths in Word units (twips). Sum = 9346. */
const LETTER_COLS = [800, 1250, 1180, 1000, 2300, 1300, 1516];
const LETTER_CONTENT_W = 9346;

/*
  Preview: body area available above the locked closing block (px).
  The Word file uses a matching bottom margin (4340 twips) so body
  text can never run into the closing block.
*/
const LETTER_BODY_MAX_HEIGHT = 563;

const LETTER_TABLE_HEADERS = [
  "S/NO.",
  "Quantity Required Packaging",
  "Unit of Measure",
  "Part No.",
  "Description",
  "Unit Price (NGN)",
  "Extended Price (NGN)",
];

const emptyLetterRow = (): LetterRow => ({
  qty: "",
  unit: "",
  partNo: "",
  description: "",
  unitPrice: "",
  extPrice: "",
});

const formatLetterDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const parseMoney = (value: string) => {
  const n = parseFloat(
    String(value || "").replace(/[^0-9.\-]/g, "")
  );
  return isNaN(n) ? 0 : n;
};

/* =====================================================
   LETTER – WORD DOCUMENT BUILDER
   Letterhead is placed behind the text on every page.
   The closing block is locked and sits near the bottom
   of the LAST page. The table grows / continues onto
   new pages automatically.
===================================================== */

const buildLetterDocument = (
  D: any,
  d: any,
  bgBytes: any,
  sigBytes: any
) => {
  const FONT = "Arial";
  const BODY = 22; // 11pt
  const TABLE_SIZE = 20; // 10pt

  const runsFromText = (text: any, opts: any = {}) => {
    const lines = String(text ?? "")
      .replace(/\r/g, "")
      .split("\n");

    return lines.map(
      (line, i) =>
        new D.TextRun({
          text: line,
          break: i === 0 ? 0 : 1,
          font: FONT,
          size: opts.size || BODY,
          bold: !!opts.bold,
          underline: opts.underline ? {} : undefined,
        })
    );
  };

  const para = (text: any, opts: any = {}) =>
    new D.Paragraph({
      children: runsFromText(text, opts),
      spacing: {
        before: 0,
        after: opts.after ?? 0,
        line: 276,
      },
      alignment: D.AlignmentType.LEFT,
    });

  const children: any[] = [];

  children.push(para(d.date, { bold: true, after: 240 }));

  if ((d.recipient || "").trim()) {
    children.push(
      para(d.recipient, { bold: true, after: 240 })
    );
  }

  if ((d.salutation || "").trim()) {
    children.push(para(d.salutation, { after: 240 }));
  }

  if ((d.subject || "").trim()) {
    children.push(
      para(d.subject, {
        bold: true,
        underline: true,
        after: 240,
      })
    );
  }

  if ((d.intro || "").trim()) {
    children.push(para(d.intro, { after: 160 }));
  }

  if (d.mode === "table") {
    const cols = LETTER_COLS;

    const line = {
      style: D.BorderStyle.SINGLE,
      size: 4,
      color: "808080",
    };

    const borders = {
      top: line,
      bottom: line,
      left: line,
      right: line,
    };

    const cell = (
      text: any,
      i: number,
      bold = false,
      keepNext = false
    ) =>
      new D.TableCell({
        width: { size: cols[i], type: D.WidthType.DXA },
        borders,
        verticalAlign: D.VerticalAlign.TOP,
        margins: { top: 50, bottom: 50, left: 80, right: 80 },
        children: [
          new D.Paragraph({
            children: runsFromText(text, {
              size: TABLE_SIZE,
              bold,
            }),
            spacing: { before: 0, after: 0, line: 252 },
            keepNext,
          }),
        ],
      });

    const rows: any[] = [
      new D.TableRow({
        tableHeader: true,
        cantSplit: true,
        children: LETTER_TABLE_HEADERS.map((h, i) =>
          cell(h, i, true)
        ),
      }),
    ];

    d.rows.forEach((r: any, idx: number) => {
      /* last item row stays together with the TOTAL row */
      const keep = idx === d.rows.length - 1;

      rows.push(
        new D.TableRow({
          cantSplit: true,
          children: [
            cell(String(idx + 1), 0, false, keep),
            cell(r.qty, 1, false, keep),
            cell(r.unit, 2, false, keep),
            cell(r.partNo, 3, false, keep),
            cell(r.description, 4, false, keep),
            cell(r.unitPrice, 5, false, keep),
            cell(r.extPrice, 6, false, keep),
          ],
        })
      );
    });

    rows.push(
      new D.TableRow({
        cantSplit: true,
        children: [
          cell("", 0),
          cell("", 1),
          cell("TOTAL", 2, true),
          cell("", 3),
          cell("", 4),
          cell("", 5),
          cell(d.total, 6, true),
        ],
      })
    );

    children.push(
      new D.Table({
        width: {
          size: LETTER_CONTENT_W,
          type: D.WidthType.DXA,
        },
        columnWidths: cols,
        rows,
      })
    );
  } else {
    String(d.body || "")
      .replace(/\r/g, "")
      .split("\n")
      .forEach((l) => children.push(para(l)));
  }

  /* ---------- LOCKED CLOSING BLOCK ---------- */

  const frame = {
    type: "absolute",
    position: { x: 0, y: 12700 },
    width: LETTER_CONTENT_W,
    height: 2300,
    anchor: {
      horizontal: D.FrameAnchorType.MARGIN,
      vertical: D.FrameAnchorType.PAGE,
    },
    rule: D.HeightRule.AT_LEAST,
    wrap: D.FrameWrap.AROUND,
  };

  const framed = (text: string, after = 0) =>
    new D.Paragraph({
      frame,
      children: runsFromText(text, { bold: true }),
      spacing: { before: 0, after, line: 276 },
    });

  children.push(
    framed("Thank you for your usual cooperation.", 280)
  );
  children.push(framed("Yours Sincerely"));
  children.push(framed("For: Young and Fresh Controls Ltd"));

  if (sigBytes) {
    children.push(
      new D.Paragraph({
        frame,
        spacing: { before: 100, after: 0, line: 240 },
        children: [
          new D.ImageRun({
            type: "png",
            data: sigBytes,
            transformation: { width: 190, height: 39 },
          }),
        ],
      })
    );
  } else {
    children.push(framed("", 480));
  }

  children.push(framed("Emmanuel M. Mark-Egart"));
  children.push(framed("Managing Director/CEO"));

  /* plain paragraph so the frame is never the last item */
  children.push(
    new D.Paragraph({
      spacing: {
        before: 0,
        after: 0,
        line: 20,
        lineRule: D.LineRuleType.EXACT,
      },
      run: { size: 2 },
      children: [],
    })
  );

  /* ---------- LETTERHEAD (behind text, every page) ---------- */

  const header = new D.Header({
    children: [
      new D.Paragraph({
        spacing: { before: 0, after: 0 },
        children: bgBytes
          ? [
              new D.ImageRun({
                type: "jpg",
                data: bgBytes,
                transformation: { width: 794, height: 1123 },
                floating: {
                  horizontalPosition: {
                    relative:
                      D.HorizontalPositionRelativeFrom.PAGE,
                    offset: 0,
                  },
                  verticalPosition: {
                    relative:
                      D.VerticalPositionRelativeFrom.PAGE,
                    offset: 0,
                  },
                  behindDocument: true,
                  allowOverlap: true,
                  lockAnchor: true,
                  wrap: { type: D.TextWrappingType.NONE },
                },
              }),
            ]
          : [],
      }),
    ],
  });

  return new D.Document({
    creator: "Young and Fresh Controls Limited",
    title: "Letter",
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 2600,
              bottom: 4340,
              left: 1280,
              right: 1280,
              header: 0,
              footer: 0,
            },
          },
        },
        headers: { default: header },
        children,
      },
    ],
  });
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
     LETTER
  ===================================================== */

  const [letterDate, setLetterDate] =
    useState(formatLetterDate(today));

  const [letterRecipient, setLetterRecipient] =
    useState("");

  const [letterSalutation, setLetterSalutation] =
    useState(LETTER_DEFAULT_SALUTATION);

  const [letterSubject, setLetterSubject] =
    useState("");

  const [letterIntro, setLetterIntro] =
    useState(LETTER_DEFAULT_INTRO);

  const [letterMode, setLetterMode] =
    useState<"table" | "plain">("table");

  const [letterRows, setLetterRows] =
    useState<LetterRow[]>([emptyLetterRow()]);

  const [letterTotal, setLetterTotal] =
    useState("");

  const [letterBody, setLetterBody] =
    useState("");

  const [letterHistory, setLetterHistory] =
    useState<LetterItem[]>([]);

  const [letterOverflow, setLetterOverflow] =
    useState(false);

  const letterBodyRef = useRef(null);

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

      const savedLetters =
        localStorage.getItem("letterHistory");

      if (savedLetters) {
        setLetterHistory(
          JSON.parse(savedLetters)
        );
      }
    } catch {
      setHistory([]);
      setWaybillHistory([]);
      setLetterHistory([]);
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
    } else if (documentType === "waybill") {
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
     LETTER – OVERFLOW CHECK
     Warns when the body is taller than the space above
     the locked closing block (Word file will simply
     continue onto a second page).
  ===================================================== */

  useLayoutEffect(() => {
    if (documentType !== "letter") return;

    const el = letterBodyRef.current;

    if (!el) return;

    setLetterOverflow(
      el.offsetHeight > LETTER_BODY_MAX_HEIGHT
    );
  }, [
    documentType,
    letterDate,
    letterRecipient,
    letterSalutation,
    letterSubject,
    letterIntro,
    letterMode,
    letterRows,
    letterTotal,
    letterBody,
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
     LETTER FUNCTIONS
  ===================================================== */

  const updateLetterRow = (
    index: number,
    field: keyof LetterRow,
    value: string
  ) => {
    setLetterRows((current) =>
      current.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addLetterRow = () => {
    setLetterRows((current) => [
      ...current,
      emptyLetterRow(),
    ]);
  };

  const removeLetterRow = (
    index: number
  ) => {
    setLetterRows((current) =>
      current.length === 1
        ? [emptyLetterRow()]
        : current.filter(
            (_, i) => i !== index
          )
    );
  };

  const autoSumLetterTotal = () => {
    const sum = letterRows.reduce(
      (total, row) =>
        total + parseMoney(row.extPrice),
      0
    );

    setLetterTotal(
      sum.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const saveLetter = () => {
    const updated: LetterItem[] = [
      {
        date: letterDate,
        recipient: letterRecipient,
        salutation: letterSalutation,
        subject: letterSubject,
        intro: letterIntro,
        mode: letterMode,
        rows: letterRows,
        total: letterTotal,
        body: letterBody,
      },
      ...letterHistory,
    ];

    setLetterHistory(updated);

    try {
      localStorage.setItem(
        "letterHistory",
        JSON.stringify(updated)
      );
    } catch {}

    alert("Letter Saved!");
  };

  const loadLetter = (
    item: LetterItem
  ) => {
    setLetterDate(item.date || "");
    setLetterRecipient(
      item.recipient || ""
    );
    setLetterSalutation(
      item.salutation || ""
    );
    setLetterSubject(item.subject || "");
    setLetterIntro(item.intro || "");
    setLetterMode(
      item.mode === "plain"
        ? "plain"
        : "table"
    );
    setLetterRows(
      item.rows && item.rows.length
        ? item.rows
        : [emptyLetterRow()]
    );
    setLetterTotal(item.total || "");
    setLetterBody(item.body || "");

    setDocumentType("letter");
  };

  const clearLetterFields = () => {
    setLetterRecipient("");
    setLetterSalutation(
      LETTER_DEFAULT_SALUTATION
    );
    setLetterSubject("");
    setLetterIntro(LETTER_DEFAULT_INTRO);
    setLetterRows([emptyLetterRow()]);
    setLetterTotal("");
    setLetterBody("");
  };

  /* =====================================================
     LETTER – DOWNLOAD AS WORD (.docx)
  ===================================================== */

  const downloadLetterWord = async () => {
    try {
      const D = await import("docx");

      /*
        Only accept real images. (A dev server returns
        index.html with status 200 for a missing file,
        so the content type must be checked.)
      */
      const fetchImage = async (
        url: string
      ) => {
        try {
          const response = await fetch(url);

          if (!response.ok) return null;

          const type =
            response.headers.get(
              "content-type"
            ) || "";

          if (!type.startsWith("image/"))
            return null;

          return new Uint8Array(
            await response.arrayBuffer()
          );
        } catch {
          return null;
        }
      };

      const bgBytes = await fetchImage(
        letterTemplateSrc
      );

      const sigBytes = await fetchImage(
        letterSignatureSrc
      );

      if (!bgBytes) {
        alert(
          "Letterhead image not found (public/letter_canvas.jpeg). The Word file will be created without the letterhead."
        );
      }

      const doc = buildLetterDocument(
        D,
        {
          date: letterDate,
          recipient: letterRecipient,
          salutation: letterSalutation,
          subject: letterSubject,
          intro: letterIntro,
          mode: letterMode,
          rows: letterRows,
          total: letterTotal,
          body: letterBody,
        },
        bgBytes,
        sigBytes
      );

      const blob = await D.Packer.toBlob(doc);

      const slug = (
        letterSubject || "letter"
      )
        .slice(0, 40)
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");

      const link =
        document.createElement("a");

      link.href = URL.createObjectURL(blob);

      link.download = `${
        slug || "letter"
      }.docx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(
        () => URL.revokeObjectURL(link.href),
        1000
      );
    } catch (error) {
      console.error(
        "Word generation failed:",
        error
      );

      alert(
        "Unable to generate the Word file. Please make sure the 'docx' package is installed (npm install docx)."
      );
    }
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

  const letterTemplateSrc =
    process.env.PUBLIC_URL +
    "/letter_canvas.jpeg";

  const letterSignatureSrc =
    process.env.PUBLIC_URL +
    "/signature.png";

  const invoiceSignatureSrc =
    process.env.PUBLIC_URL +
    "/signature.png";

  const waybillSignatureSrc =
    process.env.PUBLIC_URL +
    "/signature.png";

  const isInvoice =
    documentType === "invoice";

  const isLetter =
    documentType === "letter";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="app-root">

      <h1 className="title">
        {isInvoice
          ? "E-Invoice"
          : isLetter
            ? "E-Letter"
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
            (documentType === "waybill"
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

        <button
          type="button"
          className={
            "document-tab " +
            (isLetter
              ? "active"
              : "")
          }
          onClick={() =>
            setDocumentType(
              "letter"
            )
          }
        >
          Letter
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
                  : isLetter
                    ? "letter-document"
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
                      : isLetter
                        ? letterTemplateSrc
                        : waybillTemplateSrc
                  }
                  className="invoice-img"
                  crossOrigin="anonymous"
                  draggable={false}
                  alt={
                    isInvoice
                      ? "Invoice Template"
                      : isLetter
                        ? "Letter Template"
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

                    <img
                      src={invoiceSignatureSrc}
                      className="invoice-signature"
                      crossOrigin="anonymous"
                      draggable={false}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />

                  </>

                ) : isLetter ? (

                  /* =========================
                     LETTER
                  ========================= */

                  <>

                    <div
                      ref={letterBodyRef}
                      className={
                        "letter-body" +
                        (letterOverflow
                          ? " overflowing"
                          : "")
                      }
                    >

                      <div className="letter-p letter-bold letter-gap">
                        {letterDate || "\u00A0"}
                      </div>

                      {letterRecipient.trim() ? (
                        <div className="letter-p letter-bold letter-gap">
                          {letterRecipient}
                        </div>
                      ) : null}

                      {letterSalutation.trim() ? (
                        <div className="letter-p letter-gap">
                          {letterSalutation}
                        </div>
                      ) : null}

                      {letterSubject.trim() ? (
                        <div className="letter-p letter-bold letter-underline letter-gap">
                          {letterSubject}
                        </div>
                      ) : null}

                      {letterIntro.trim() ? (
                        <div className="letter-p letter-gap-sm">
                          {letterIntro}
                        </div>
                      ) : null}

                      {letterMode === "table" ? (

                        <table className="letter-table">

                          <colgroup>
                            {LETTER_COLS.map(
                              (width, i) => (
                                <col
                                  key={i}
                                  style={{
                                    width:
                                      `${(width / LETTER_CONTENT_W) * 100}%`,
                                  }}
                                />
                              )
                            )}
                          </colgroup>

                          <thead>
                            <tr>
                              {LETTER_TABLE_HEADERS.map(
                                (heading) => (
                                  <th key={heading}>
                                    {heading}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>

                          <tbody>

                            {letterRows.map(
                              (row, index) => (
                                <tr
                                  key={
                                    `letter-row-${index}`
                                  }
                                >
                                  <td>{index + 1}</td>
                                  <td>{row.qty}</td>
                                  <td>{row.unit}</td>
                                  <td>{row.partNo}</td>
                                  <td>{row.description}</td>
                                  <td>{row.unitPrice}</td>
                                  <td>{row.extPrice}</td>
                                </tr>
                              )
                            )}

                            <tr className="letter-total-row-preview">
                              <td></td>
                              <td></td>
                              <td>TOTAL</td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td>{letterTotal}</td>
                            </tr>

                          </tbody>

                        </table>

                      ) : (

                        <div className="letter-p">
                          {letterBody}
                        </div>

                      )}

                    </div>

                    {/* LOCKED CLOSING BLOCK – not editable */}

                    <div className="letter-closing">

                      <div className="letter-closing-thanks">
                        Thank you for your usual cooperation.
                      </div>

                      <div>Yours Sincerely</div>

                      <div>
                        For: Young and Fresh Controls Ltd
                      </div>

                      <div className="letter-signature-slot">
                        <img
                          src={letterSignatureSrc}
                          className="letter-signature"
                          crossOrigin="anonymous"
                          draggable={false}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.style.display =
                              "none";
                          }}
                        />
                      </div>

                      <div>Emmanuel M. Mark-Egart</div>

                      <div>Managing Director/CEO</div>

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

                    <img
                      src={waybillSignatureSrc}
                      className="waybill-signature waybill-signature-left-img"
                      crossOrigin="anonymous"
                      draggable={false}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />

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

          ) : isLetter ? (

            <>

              <div className="panel">

                <h3>
                  Letter Manual Entry
                </h3>

                <label className="label">
                  Date
                </label>

                <input
                  className="input"
                  value={letterDate}
                  onChange={(e) =>
                    setLetterDate(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Recipient (one line per row)
                </label>

                <textarea
                  className="input"
                  rows={6}
                  value={letterRecipient}
                  onChange={(e) =>
                    setLetterRecipient(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Salutation
                </label>

                <input
                  className="input"
                  value={letterSalutation}
                  onChange={(e) =>
                    setLetterSalutation(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Subject (bold &amp; underlined)
                </label>

                <textarea
                  className="input"
                  rows={2}
                  value={letterSubject}
                  onChange={(e) =>
                    setLetterSubject(
                      e.target.value
                    )
                  }
                />

                <label className="label">
                  Opening line
                </label>

                <textarea
                  className="input"
                  rows={2}
                  value={letterIntro}
                  onChange={(e) =>
                    setLetterIntro(
                      e.target.value
                    )
                  }
                />

                <div className="letter-section-title">
                  Letter Body
                </div>

                <div className="letter-mode-switch">

                  <button
                    type="button"
                    className={
                      "letter-mode-btn " +
                      (letterMode === "table"
                        ? "active"
                        : "")
                    }
                    onClick={() =>
                      setLetterMode("table")
                    }
                  >
                    Table
                  </button>

                  <button
                    type="button"
                    className={
                      "letter-mode-btn " +
                      (letterMode === "plain"
                        ? "active"
                        : "")
                    }
                    onClick={() =>
                      setLetterMode("plain")
                    }
                  >
                    Plain text
                  </button>

                </div>

                {letterMode === "table" ? (

                  <>

                    {letterRows.map(
                      (row, index) => (

                        <div
                          className="letter-row-card"
                          key={
                            `letter-editor-${index}`
                          }
                        >

                          <div className="letter-row-header">

                            <strong>
                              Row {index + 1}
                            </strong>

                            <button
                              type="button"
                              className="letter-remove-btn"
                              onClick={() =>
                                removeLetterRow(
                                  index
                                )
                              }
                            >
                              Remove
                            </button>

                          </div>

                          <div className="row">

                            <div className="field-half">

                              <label className="label">
                                Qty / Packaging
                              </label>

                              <input
                                className="input"
                                value={row.qty}
                                onChange={(e) =>
                                  updateLetterRow(
                                    index,
                                    "qty",
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="field-half">

                              <label className="label">
                                Unit of Measure
                              </label>

                              <input
                                className="input"
                                value={row.unit}
                                onChange={(e) =>
                                  updateLetterRow(
                                    index,
                                    "unit",
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                          </div>

                          <label className="label">
                            Part No.
                          </label>

                          <input
                            className="input"
                            value={row.partNo}
                            onChange={(e) =>
                              updateLetterRow(
                                index,
                                "partNo",
                                e.target.value
                              )
                            }
                          />

                          <label className="label">
                            Description
                          </label>

                          <textarea
                            className="input"
                            rows={3}
                            value={
                              row.description
                            }
                            onChange={(e) =>
                              updateLetterRow(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                          />

                          <div className="row">

                            <div className="field-half">

                              <label className="label">
                                Unit Price (NGN)
                              </label>

                              <input
                                className="input"
                                value={
                                  row.unitPrice
                                }
                                onChange={(e) =>
                                  updateLetterRow(
                                    index,
                                    "unitPrice",
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="field-half">

                              <label className="label">
                                Extended Price (NGN)
                              </label>

                              <input
                                className="input"
                                value={
                                  row.extPrice
                                }
                                onChange={(e) =>
                                  updateLetterRow(
                                    index,
                                    "extPrice",
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                          </div>

                        </div>

                      )
                    )}

                    <button
                      type="button"
                      className="btn add-line"
                      onClick={
                        addLetterRow
                      }
                    >
                      + Add Table Row
                    </button>

                    <label className="label">
                      TOTAL (NGN)
                    </label>

                    <div className="letter-total-line">

                      <input
                        className="input"
                        value={letterTotal}
                        onChange={(e) =>
                          setLetterTotal(
                            e.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="letter-small-btn"
                        onClick={
                          autoSumLetterTotal
                        }
                      >
                        Auto-sum
                      </button>

                    </div>

                  </>

                ) : (

                  <>

                    <label className="label">
                      Body text
                    </label>

                    <textarea
                      className="input letter-body-input"
                      rows={10}
                      value={letterBody}
                      onChange={(e) =>
                        setLetterBody(
                          e.target.value
                        )
                      }
                    />

                  </>

                )}

                {letterOverflow ? (

                  <div className="letter-warning">
                    The body is longer than one page. In the
                    Word file it will continue onto a second
                    page and the closing block will move to
                    the last page.
                  </div>

                ) : null}

                <div className="letter-note">
                  Locked (not editable): everything from
                  “Thank you for your usual cooperation.”
                  down to “Managing Director/CEO”.
                </div>

                <div className="buttons-row">

                  <button
                    type="button"
                    className="btn save"
                    onClick={
                      saveLetter
                    }
                  >
                    Save Letter
                  </button>

                  <button
                    type="button"
                    className="btn clear"
                    onClick={
                      clearLetterFields
                    }
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    className="btn pdf"
                    onClick={
                      downloadLetterWord
                    }
                  >
                    Download Word
                  </button>

                </div>

              </div>

              <div className="panel history-panel">

                <h3>
                  Saved Letters
                </h3>

                {letterHistory.length === 0 ? (

                  <div className="empty-history">
                    No saved letters yet.
                  </div>

                ) : (

                  letterHistory.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="history-item"
                      >

                        {item.date} —{" "}
                        {item.subject ||
                          (item.recipient || "")
                            .split("\n")[0] ||
                          "Untitled"}

                        <button
                          type="button"
                          className="btn load-btn"
                          onClick={() =>
                            loadLetter(
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
