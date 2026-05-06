import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const addLogoAndHeader = async (doc, title) => {
  try {
    const response = await fetch("/guts-logo.png")
    const blob = await response.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })

    doc.addImage(dataUrl, "PNG", 14, 8, 30, 30)
  } catch {
    // Continue rendering report even if logo is missing.
  }

  doc.setFontSize(16)
  doc.setTextColor(128, 0, 0)
  doc.text("GUTS TESDA Inventory System", 48, 18)
  doc.setFontSize(12)
  doc.setTextColor(51, 65, 85)
  doc.text(title, 48, 26)

  const generatedAt = new Date().toLocaleString("en-PH")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${generatedAt}`, 14, 42)
}

export const exportInventoryReportPdf = async (items) => {
  const doc = new jsPDF()
  await addLogoAndHeader(doc, "Monthly Consumables Report")

  autoTable(doc, {
    startY: 48,
    head: [["Item Name", "Category", "Quantity", "Unit", "Status"]],
    body: items.map((item) => [
      item.itemName,
      item.category,
      item.quantity,
      item.unit,
      item.status
    ]),
    headStyles: {
      fillColor: [128, 0, 0],
      textColor: [255, 255, 255]
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  })

  doc.save("guts-consumables-report.pdf")
}

export const exportHistoryReportPdf = async (logs) => {
  const doc = new jsPDF({ orientation: "landscape" })
  await addLogoAndHeader(doc, "Inventory Transaction History Report")

  autoTable(doc, {
    startY: 48,
    head: [["Item Name", "Action", "Quantity", "Performed By", "Description", "Date"]],
    body: logs.map((log) => [
      log.itemName,
      log.actionType,
      log.quantityChanged,
      log.performedBy || "System",
      log.description || "-",
      new Date(log.createdAt).toLocaleString("en-PH")
    ]),
    headStyles: {
      fillColor: [128, 0, 0],
      textColor: [255, 255, 255]
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    }
  })

  doc.save("guts-history-report.pdf")
}

export const exportConsumptionReportPdf = async ({ records, course, batchLabel }) => {
  const doc = new jsPDF({ orientation: "landscape" })
  await addLogoAndHeader(doc, "Consumption Report by Batch")

  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)
  doc.text(`Course: ${course || 'All Courses'}`, 14, 48)
  doc.text(`Batch: ${batchLabel || 'All Batches'}`, 14, 54)

  autoTable(doc, {
    startY: 60,
    head: [["Item Name", "Course", "Batch", "Qty Used", "Performed By", "Date"]],
    body: records.map((record) => [
      record.itemName,
      record.course || '-',
      record.batchLabel || '-',
      Math.abs(record.quantityChanged || 0),
      record.performedBy || 'System',
      new Date(record.createdAt).toLocaleString("en-PH")
    ]),
    headStyles: {
      fillColor: [128, 0, 0],
      textColor: [255, 255, 255]
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    }
  })

  doc.save("guts-consumption-report.pdf")
}
