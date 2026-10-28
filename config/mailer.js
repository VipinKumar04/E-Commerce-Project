const Mailjet = require("node-mailjet");

const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

const sendEmail = (emailDetails)=>{
    return mailjet
        .post("send",{ version: "v3.1" })
        .request({
            Messages: [{
                    From: {
                        Email: process.env.MAILJET_FROM_EMAIL,
                        Name: "E-commerce"
                    },
                    To: [{
                            Email: emailDetails.to
                        }
                    ],
                    Subject: emailDetails.subject,
                    TextPart: emailDetails.text
                }
            ]
        });
};

module.exports = sendEmail;