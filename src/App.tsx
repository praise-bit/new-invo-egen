// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import "./App.css";

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
};

export default function App() {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  const [invoiceNum, setInvoiceNum] = useState("0627");
  const [day, setDay] = useState(pad(today.getDate()));
  const [month, setMonth] = useState(pad(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [grandTotal, setGrandTotal] = useState("");
  const [amountInWords, setAmountInWords] = useState("");

  const [history, setHistory] = useState<InvoiceItem[]>([]);
  const invoiceRef = useRef(null);

  const [imageReady, setImageReady] = useState(false);

  const templateSrc = process.env.PUBLIC_URL + "/invoice_canvas.jpeg";

  useEffect(() => {
    const saved = localStorage.getItem("invoiceHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveInvoice = () => {
    const updated = [
      {
        number: invoiceNum,
        date: `${day}/${month}/${year}`,
        day,
        month,
        year,
        clientName,
        description,
        qty,
        unitPrice,
        amount,
        vatRate,
        vatAmount,
        grandTotal,
        amountInWords,
      },
      ...history,
    ];

    setHistory(updated);
    localStorage.setItem("invoiceHistory", JSON.stringify(updated));
    alert("Invoice Saved!");
  };

  const loadInvoice = (i: InvoiceItem) => {
    setInvoiceNum(i.number);
    setDay(i.day);
    setMonth(i.month);
    setYear(i.year);
    setClientName(i.clientName);
    setDescription(i.description);
    setQty(i.qty);
    setUnitPrice(i.unitPrice);
    setAmount(i.amount);
    setVatRate(i.vatRate);
    setVatAmount(i.vatAmount);
    setGrandTotal(i.grandTotal);
    setAmountInWords(i.amountInWords);
  };

  const handleNextInvoice = () => {
    setInvoiceNum(String(Number(invoiceNum) + 1).padStart(4, "0"));
  };

  const clearFields = () => {
    setClientName("");
    setDescription("");
    setQty("");
    setUnitPrice("");
    setAmount("");
    setVatRate("");
    setVatAmount("");
    setGrandTotal("");
    setAmountInWords("");
  };
  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 4,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice.pdf`);
  };

  return (
    <div className="app-root">
      <h1 className="title">E-Invoice</h1>

      <div className="main-layout">
        <div className="invoice-column">
          <div className="invoice-wrapper" ref={invoiceRef}>
            <img
              src={templateSrc}
              classname="invoice-img"
              crossOrigin="anonymous"
              onload={() => setImageReady(true)}
              draggable={false}
            />

            <div className="overlay invoice-number">{invoiceNum}</div>

            <div className="overlay date-day">{day}</div>
            <div className="overlay date-month">{month}</div>
            <div className="overlay date-year">{year}</div>

            <div className="overlay client-name">{clientName}</div>
            <div className="overlay description">{description}</div>
            <div className="overlay qty">{qty}</div>
            <div className="overlay unit-price">{unitPrice}</div>
            <div className="overlay amount">{amount}</div>
            <div className="overlay vat-rate">{vatRate}</div>
            <div className="overlay vat-amount">{vatAmount}</div>
            <div className="overlay grand-total">{grandTotal}</div>
            <div className="overlay amount-words">{amountInWords}</div>
          </div>
        </div>

        <aside className="sidebar">
          <div className="panel">
            <h3>Invoice Manual Entry</h3>

            <label>Invoice #</label>
            <input
              value={invoiceNum}
              onChange={(e) => setInvoiceNum(e.target.value)}
            />

            <label className="label">Date (DD/MM/YY)</label>
            <div className="row">
              <input
                className="input"
                placeholder="DD"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <input
                className="input"
                placeholder="MM"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <input
                className="input"
                placeholder="YY"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <label className="label">Client Name </label>
            <input
              className="input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />

            <label className="label">Description</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label className="label">Qty</label>
            <input
              className="input"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />

            <label className="label">Unit Price</label>
            <input
              className="input"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />

            <label className="label">Amount</label>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label className="label">VAT Rate (%)</label>
            <input
              className="input"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />

            <label className="label">VAT Amount</label>
            <input
              className="input"
              value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
            />

            <label className="label">Grand Total (₦)</label>
            <input
              className="input"
              value={grandTotal}
              onChange={(e) => setGrandTotal(e.target.value)}
            />

            <label className="label">Amount in Words</label>
            <textarea
              className="input"
              value={amountInWords}
              onChange={(e) => setAmountInWords(e.target.value)}
            />

            <div className="buttons-row">
              <button className="btn save" onClick={saveInvoice}>
                Save Invoice
              </button>

              <button className="btn clear" onClick={clearFields}>
                Clear
              </button>
              <button className="btn next" onClick={handleNextInvoice}>
                Next
              </button>
              <button className="btn pdf" onClick={downloadPDF}>
                Download PDF
              </button>
            </div>
          </div>

          <div className="panel history-panel">
            <h3>Saved Invoices</h3>
            {history.map((item, i) => (
              <div key={i} className="history-item">
                #{item.number} — {item.day}/{item.month}/{item.year}
                <button
                  className="btn load-btn"
                  onClick={() => loadInvoice(item)}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
