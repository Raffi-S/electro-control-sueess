import * as functions from 'firebase-functions';

import * as Mail from 'nodemailer/lib/mailer';
import * as nodemailer from 'nodemailer';

interface PricelistItem {
  name: string;
  amount: number;
  price: number;
}

interface FileDto {
  name: string;
  data: string;
}

interface Message {
  service: string;
  area: string | undefined;
  pricelist: PricelistItem[];
  company: string | undefined;
  form: string;
  firstname: string;
  lastname: string;
  address: string;
  domicile: string;
  phone: string;
  mail: string;
  file: FileDto | undefined;
}

export const sendMail = functions.https.onRequest(async (request, response) => {
  const message = request.body as Message;
  const res = await sendEmail(message);
  response.send(res);
});

const calculateTotal = (total: number, current: PricelistItem) =>
  total + current.amount * current.price;

const sendEmail = async (message: Message): Promise<any> => {
  try {
    const mailFrom: string = functions.config().mail.from;
    const mailPwd: string = functions.config().mail.pwd;
    const mailTo: string = functions.config().mail.to;
    const mailHost: string = functions.config().mail.host;

    const html = htmlTemplate
      .replace(
        '[--SERVICE--]',
        message.area
          ? `${message.service}</p><h3>bereich</h3><p>${message.area}`
          : message.service
      )
      .replace(
        '[--PRICELIST--]',
        message.pricelist.length === 0
          ? ''
          : `
          <h3>preisliste</h3>
          <table>
            <tr>
              <th>Dienstleistung</th>
              <th>Menge</th>
              <th>Preis</th>
            </tr>
            ${message.pricelist.map(
              (price) => `
                <tr>
                  <td>${price.name}</td>
                  <td>${price.amount}</td>
                  <td>CHF ${(price.amount * price.price).toFixed(2)}</td>
                </tr>`
            )}
            <tr>
              <th colspan="2">Total</th>
              <th>CHF ${message.pricelist
                .reduce(calculateTotal, 0)
                .toFixed(2)}</th>
            </tr>
          </table>`
      )
      .replace(
        '[--FROM--]',
        message.company
          ? `${message.company}</p><p>${message.form} ${message.firstname} ${message.lastname}`
          : `${message.form} ${message.firstname} ${message.lastname}`
      )
      .replace('[--ADDRESS--]', message.address)
      .replace('[--DOMICILE--]', message.domicile)
      .replace(/\[--PHONE--\]/g, message.phone)
      .replace(/\[--MAIL--\]/g, message.mail);

    const attachments: Mail.Attachment[] = message.file
      ? [
          {
            filename: message.file.name,
            path: message.file.data,
          },
        ]
      : [];

    let mailOptions: Mail.Options = {
      from: mailFrom,
      to: mailTo,
      subject: `Kontaktanfrage von ${message.firstname} ${message.lastname}`,
      html,
    };

    if (attachments.length) {
      mailOptions = { ...mailOptions, attachments };
    }

    const transporter: Mail = nodemailer.createTransport({
      host: mailHost,
      port: 587,
      secure: false,
      auth: {
        type: 'LOGIN',
        user: mailFrom,
        pass: mailPwd,
      },
    });

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

const htmlTemplate = `
<head>
<link
href="https://fonts.googleapis.com/css2?family=Roboto&family=Rubik&display=swap"
rel="stylesheet"
/>

<style>
body {
  padding: 16px 8px;
  min-height: 100vh;
  font-family: 'Roboto', sans-serif;
}

h1,
h2,
h3 {
  font-family: 'Rubik', sans-serif;
}

p {
  margin: 0;
}

table, th, td {
  border: 1px solid black;
  border-collapse: collapse;
}

th, td {
  padding: 5px;
  text-align: left;    
}

@media screen and (min-width: 600px) {
  body {
    padding: 16px calc(50vw - 292px);
  }
}
</style>
</head>

<body>
<header>
  <h1>electro control süess gmbh</h1>
  <h2>kontakt&shy;anfrage via online&shy;kalkulator</h2>
</header>
<main>
  <h3>dienstleistung</h3>
  <p>[--SERVICE--]</p>
  [--PRICELIST--]
  <h3>von</h3>
  <p>[--FROM--]</p>
  <p>[--ADDRESS--]</p>
  <p>[--DOMICILE--]</p>
  <br />
  <a href="tel:[--PHONE--]">
    <p>[--PHONE--]</p>
  </a>
  <a href="mailto:[--MAIL--]">
    <p>[--MAIL--]</p>
  </a>
</main>
</body>
`;
