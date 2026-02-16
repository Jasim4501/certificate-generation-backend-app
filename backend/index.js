const express = require('express');
const cors = require('cors');
const db = require('./db');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ===============================
   Puppeteer Singleton
================================ */
let browser;
const getBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
};

/* ===============================
   Save Certificate
================================ */
app.post('/api/certificates', async (req, res) => {
  const {
    studentName,
    courseName,
    organizationName,
    issueDate,
    certificateId,
    instructorName
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO certificates
      (id, student_name, course_name, organization_name, issue_date, certificate_id_display, instructor_name)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [studentName, courseName, organizationName, issueDate, certificateId, instructorName]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ===============================
   Generate Certificate PDF
================================ */
app.get('/api/certificates/:id/pdf', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM certificates WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).send('Certificate not found');
    }

    const cert = result.rows[0];
    console.log("Cert data : ", cert)

    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    const safeCert = {
      student_name: cert.student_name || 'Student Name',
      course_name: cert.course_name || 'Course Name',
      instructor_name: cert.instructor_name || 'Instructor',
      issue_date: cert.issue_date
        ? new Date(cert.issue_date).toLocaleDateString()
        : 'Date',
      certificate_id_display: cert.certificate_id_display || 'CERT-ID'
    };

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">

      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet">

      <style>
      @page {
        size: A4 landscape;
        margin: 0;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        margin: 0;
        background: #ffffff;
      }

      /* CERTIFICATE CANVAS */
      .certificate {
        width: 297mm;
        height: 210mm;
        padding: 18mm;
        font-family: 'Montserrat', sans-serif;
        background: #ffffff;
        position: relative;

        display: grid;
        grid-template-rows: auto 1fr auto;
      }

      /* BORDER */
      .certificate::before {
        content: "";
        position: absolute;
        inset: 12mm;
        border: 2px solid #d4af37;
      }

      /* HEADER */
      .cert-header {
        text-align: center;
        margin-top: 8mm;
      }

      .cert-title {
        font-family: 'Playfair Display', serif;
        font-size: 58px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #222;
      }

      .cert-subtitle {
        margin-top: 6px;
        font-size: 20px;
        letter-spacing: 0.35em;
        text-transform: uppercase;
        color: #b8860b;
      }

      /* BODY */
      .cert-body {
        text-align: center;
        max-width: 900px;
        margin: auto;
      }

      .award-label {
        font-size: 14px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: #666;
        margin-bottom: 18px;
      }

      .recipient-name {
        font-family: 'Great Vibes', cursive;
        font-size: 64px;
        font-weight: 700;
        line-height: 1.15;
        margin: 14px 0;
        color: #111;
      }

      .divider {
        width: 160px;
        height: 2px;
        background: #d4af37;
        margin: 18px auto;
      }

      .cert-text {
        font-size: 18px;
        line-height: 1.75;
        color: #444;
        max-width: 760px;
        margin: 0 auto;
      }

      /* FOOTER */
      .cert-footer {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: end;
        gap: 32px;
        margin-bottom: 12mm;
      }

      /* SIGNATURE BLOCK */
      .signature {
        text-align: center;
      }

      /* NAME ABOVE LINE */
      .sig-name {
        font-family: 'Great Vibes', cursive;
        font-size: 32px;
        font-weight: 400;
        color: #2b2b2b;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }

      /* LINE */
      .sig-line {
        width: 100%;
        height: 1.3px;
        background: #bfa24a;   /* gold tone */
        margin-bottom: 6px;
      }

      /* ROLE LABEL */
      .sig-label {
        font-size: 13px;
        font-weight: 500;
        color: #666;
      }

      /* SEAL */
      .seal {
        width: 95px;
        height: 95px;
        border-radius: 50%;
        background: radial-gradient(circle at top left, #f6e27a, #b8860b);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 34px;
        box-shadow: 0 10px 20px rgba(0,0,0,0.25);
      }

      /* CERT ID */
      .cert-id {
        position: absolute;
        bottom: 6mm;
        width: 100%;
        text-align: center;
        font-size: 10px;
        letter-spacing: 0.2em;
        color: #888;
        text-transform: uppercase;
      }
      </style>
      </head>

      <body>
      <div class="certificate">

        <div class="cert-header">
          <div class="cert-title">Certificate</div>
          <div class="cert-subtitle">Of Appreciation</div>
        </div>

        <div class="cert-body">
          <div class="award-label">This certificate is proudly presented to</div>
          <div class="recipient-name">${safeCert.student_name}</div>
          <div class="divider"></div>
          <div class="cert-text">
            In recognition of outstanding performance and successful completion of
            <strong>${safeCert.course_name}</strong>.
            <br>
            This certificate acknowledges dedication, skill, and professional excellence.
          </div>
        </div>

        <div class="cert-footer">
          <div class="signature">
            <div class="sig-name">${cert.organization_name || 'Organization'}</div>
            <div class="sig-line"></div>
            <div class="sig-label">Organization</div>
          </div>

          <div class="seal">★</div>

          <div class="signature">
            <div class="sig-name">${safeCert.instructor_name}</div>
            <div class="sig-line"></div>
            <div class="sig-label">Instructor</div>
          </div>
        </div>

        <div class="cert-id">
          Certificate ID: ${safeCert.certificate_id_display} | Issued: ${safeCert.issue_date}
        </div>

      </div>
      </body>
      </html>
      `;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await page.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);

  } catch (err) {
    console.error(err);
    res.status(500).send('PDF generation failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});