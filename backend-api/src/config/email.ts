import nodemailer from 'nodemailer';

export const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const EMAIL_FROM = process.env.EMAIL_FROM || `Pravasa Transworld <${process.env.EMAIL_USER}>`;
