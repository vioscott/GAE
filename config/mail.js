import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vionyedikachi@gmail.com',
        pass: 'Elevation10+'
    }
});

function sendMail(to, subject, text) {
    const mailOptions = {
        from: 'vionyedikachi@gmail.com',
        to,
        subject,
        html: text
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
        console.log(error);
        } else {
        console.log('Email sent: ' + info.response);
        }
    });
}

export default sendMail;
