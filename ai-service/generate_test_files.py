import os
from PIL import Image, ImageDraw, ImageFont

public_docs = os.path.join(os.path.dirname(__file__), "..", "public", "documents")
os.makedirs(public_docs, exist_ok=True)

# 1. Create wrong_receipt.jpg
img = Image.new("RGB", (800, 1000), color=(255, 255, 255))
draw = ImageDraw.Draw(img)

draw.rectangle([(20, 20), (780, 980)], outline=(200, 200, 200), width=3)
draw.text((100, 60), "COFFEE SHOP & BAKERY", fill=(0, 0, 0))
draw.text((100, 100), "TAX INVOICE / CASH RECEIPT", fill=(0, 0, 0))
draw.text((100, 140), "Order ID: #ORD-98214", fill=(50, 50, 50))
draw.text((100, 180), "Date: 07-Sep-2026  Time: 14:30", fill=(50, 50, 50))
draw.text((100, 240), "-----------------------------------------", fill=(100, 100, 100))
draw.text((100, 280), "1. Espresso Macchiato         $ 4.50", fill=(0, 0, 0))
draw.text((100, 320), "2. Blueberry Muffin           $ 3.75", fill=(0, 0, 0))
draw.text((100, 360), "3. Cinnamon Croissant         $ 4.25", fill=(0, 0, 0))
draw.text((100, 400), "-----------------------------------------", fill=(100, 100, 100))
draw.text((100, 440), "Subtotal:                     $12.50", fill=(0, 0, 0))
draw.text((100, 480), "Tax GST (8%):                 $ 1.00", fill=(0, 0, 0))
draw.text((100, 520), "Total Amount Due:             $13.50", fill=(0, 0, 0))
draw.text((100, 580), "Payment Method: Credit Card ending 4412", fill=(50, 50, 50))
draw.text((100, 620), "Thank you for visiting! Have a nice day.", fill=(50, 50, 50))

receipt_path = os.path.join(public_docs, "wrong_receipt.jpg")
img.save(receipt_path, "JPEG")
print(f"Created: {receipt_path}")

# 2. Create wrong_invoice.pdf using raw minimal PDF structure
# Valid PDF with stream containing clear text
pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 398 >>
stream
BT
/F1 20 Tf
50 720 Td
(TAX INVOICE / COMMERCIAL BILL) Tj
/F1 12 Tf
0 -40 Td
(Invoice No: INV-2026-90412) Tj
0 -25 Td
(Bill To: Tech Services International Pvt Ltd) Tj
0 -25 Td
(GSTIN: 33AAAAA0000A1Z5) Tj
0 -25 Td
(Order ID: ORD-991244) Tj
0 -30 Td
(Description: Annual Software License & Maintenance) Tj
0 -25 Td
(Subtotal: Rs. 1,20,000.00) Tj
0 -25 Td
(CGST 9%: Rs. 10,800.00 | SGST 9%: Rs. 10,800.00) Tj
0 -25 Td
(Total Amount Due: Rs. 1,41,600.00) Tj
0 -30 Td
(Due Date: 30-September-2026 | Payment Terms: Net 30) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000685 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
752
%%EOF
"""

invoice_pdf_path = os.path.join(public_docs, "wrong_invoice.pdf")
with open(invoice_pdf_path, "wb") as f:
    f.write(pdf_content)
print(f"Created: {invoice_pdf_path}")
