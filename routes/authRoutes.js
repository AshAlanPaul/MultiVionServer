const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Enhanced helper function for HTML responses
const sendHtmlResponse = (res, title, message, isSuccess, redirectUrl = '/', redirectText = 'Go to Home') => {
  const color = isSuccess ? '#2ecc71' : '#e74c3c';
  const icon = isSuccess ? '✓' : '✗';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          text-align: center; 
          padding: 20px; 
          background: #f5f7fa;
          margin: 0;
        }
        .container { 
          max-width: 500px; 
          margin: -550px auto; 
          padding: 40px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          position: relative;
        }
        .status-icon {
          font-size: 60px;
          margin-bottom: 20px;
          color: ${color};
        }
        h1 {
          color: #2c3e50;
          margin: 0 0 15px;
          font-size: 24px;
        }
        p {
          color: #7f8c8d;
          line-height: 1.6;
          margin: 0 0 30px;
        }
        .btn { 
          display: inline-block; 
          margin-top: 10px; 
          padding: 12px 30px; 
          background: ${color}; 
          color: white; 
          text-decoration: none; 
          border-radius: 30px;
          transition: all 0.3s ease;
          font-weight: 500;
          border: none;
          cursor: pointer;
          font-size: 16px;
        }
        .btn:hover {
          background: ${isSuccess ? '#27ae60' : '#c0392b'};
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .btn:active {
          transform: translateY(0);
        }
        .token-display {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          word-break: break-all;
          font-family: monospace;
          margin: 20px 0;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          .container {
            padding: 30px 20px;
            margin: 20px auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="status-icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="${redirectUrl}" class="btn">${redirectText}</a>
      </div>
    </body>
    </html>
  `);
};

// Register route with HTML response
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return sendHtmlResponse(
        res,
        'Registration Failed',
        'This email is already registered. Please use a different email address or try to log in.',
        false,
        '/client/public/register.html',
        'Try Again'
      );
    }
      const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return sendHtmlResponse(
        res,
        'Registration Failed',
        'This username is already taken. Please choose a different username.',
        false,
        '/client/public/register.html',
        'Try Again'
      );
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = new User({
      username,
      email,
      password,
      verified: false,
      verificationToken,
    });
    await user.save();

    const verificationLink = `http://${req.headers.host}/api/auth/verify-email/${verificationToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Verify your email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3498db; text-align: center;">Email Verification</h2>
          <p style="font-size: 16px;">Hello ${username},</p>
          <p style="font-size: 16px;">Thank you for registering! Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="display: inline-block; padding: 12px 30px; background: #3498db; 
                      color: white; text-decoration: none; border-radius: 30px; font-size: 16px;">
              Verify Email
            </a>
          </div>
          <p style="font-size: 14px; color: #7f8c8d;">If you didn't request this, you can safely ignore this email.</p>
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
            <p style="font-size: 12px; color: #7f8c8d; margin: 0;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-family: monospace; font-size: 12px; margin: 5px 0 0;">${verificationLink}</p>
          </div>
        </div>
      `
    });

    sendHtmlResponse(
      res,
      'Registration Successful!',
      'We\'ve sent a verification link to your email address. Please check your inbox (and spam folder) to complete registration.',
      true,
      '/client/public/index.html',
      'Return to Home'
    );
  } catch (err) {
    console.error(err);
    sendHtmlResponse(
      res,
      'Registration Error',
      'We encountered an issue while processing your registration. Please try again later or contact support if the problem persists.',
      false,
      '/client/public/register.html',
      'Try Again'
    );
  }
});

// Email verification route with HTML response
router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    
    if (!user) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #e74c3c; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #c0392b;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">✗</div>
            <h1>Verification Failed</h1>
            <p>The verification link is invalid or has expired. Please request a new verification email.</p>
            <a href="/client/public/register.html" class="btn">Go to Registration</a>
          </div>
        </body>
        </html>
      `);
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified Successfully!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #2ecc71;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #2ecc71; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✓</div>
          <h1>Email Verified Successfully!</h1>
          <p>Your email address has been successfully verified. You can now log in to your account.</p>
          <a href="/client/public/login.html" class="btn">Go to Login</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #e74c3c;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #e74c3c; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #c0392b;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✗</div>
          <h1>Verification Error</h1>
          <p>An unexpected error occurred during verification. Please try again later or contact support.</p>
          <a href="/client/public/index.html" class="btn">Go to Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Login route with HTML response
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #e74c3c; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #c0392b;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">✗</div>
            <h1>Login Failed</h1>
            <p>No account found with this email address. Please check your email or register for a new account.</p>
            <a href="/client/public/login.html" class="btn">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #e74c3c; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #c0392b;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">✗</div>
            <h1>Login Failed</h1>
            <p>The password you entered is incorrect. Please try again.</p>
            <a href="/client/public/login.html" class="btn">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }

    if (!user.verified) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Account Not Verified</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #f39c12;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #f39c12; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #e67e22;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">!</div>
            <h1>Account Not Verified</h1>
            <p>Your email address has not been verified yet. Please check your email for the verification link.</p>
            <a href="/client/public/login.html" class="btn">Go to Login</a>
          </div>
        </body>
        </html>
      `);
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send success response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Successful!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #2ecc71;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #2ecc71; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✓</div>
          <h1>Login Successful!</h1>
          <p>You have successfully logged in. Redirecting you to your dashboard...</p>
          <a href="/dashboard" class="btn">Go to Dashboard</a>
        </div>
        <script>
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 3000);
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #e74c3c;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #e74c3c; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #c0392b;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✗</div>
          <h1>Login Error</h1>
          <p>An error occurred during login. Please try again later.</p>
          <a href="/client/public/login.html" class="btn">Try Again</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Password reset request route with HTML response
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendHtmlResponse(
        res,
        'Email Not Found',
        'If an account exists with this email, we\'ve sent a password reset link. Please check your inbox.',
        false,
        '/client/public/forgot-password.html',
        'Try Again'
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `http://${req.headers.host}/api/auth/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3498db; text-align: center;">Password Reset</h2>
          <p style="font-size: 16px;">Hello ${user.username},</p>
          <p style="font-size: 16px;">You requested to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; padding: 12px 30px; background: #3498db; 
                      color: white; text-decoration: none; border-radius: 30px; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #7f8c8d;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
            <p style="font-size: 12px; color: #7f8c8d; margin: 0;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-family: monospace; font-size: 12px; margin: 5px 0 0;">${resetLink}</p>
          </div>
        </div>
      `
    });

    sendHtmlResponse(
      res,
      'Reset Email Sent',
      'If an account exists with this email, we\'ve sent a password reset link. Please check your inbox (and spam folder).',
      true,
      '/client/public/login.html',
      'Go to Login'
    );
  } catch (err) {
    console.error(err);
    sendHtmlResponse(
      res,
      'Password Reset Error',
      'An error occurred while processing your request. Please try again later.',
      false,
      '/client/public/forgot-password.html',
      'Try Again'
    );
  }
});

// Password reset form route with HTML response
router.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Password Reset Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #e74c3c; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #c0392b;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">✗</div>
            <h1>Password Reset Failed</h1>
            <p>The password reset link is invalid or has expired. Please request a new password reset email.</p>
            <a href="/client/public/forgot-password.html" class="btn">Request New Link</a>
          </div>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            position: relative;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 30px;
            font-size: 24px;
          }
          .form-group {
            margin-bottom: 20px;
            text-align: left;
          }
          label {
            display: block;
            margin-bottom: 8px;
            color: #7f8c8d;
            font-weight: 500;
          }
          input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            box-sizing: border-box;
          }
          .btn { 
            display: inline-block; 
            margin-top: 20px; 
            padding: 12px 30px; 
            background: #3498db; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
          }
          .btn:hover {
            background: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 20px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <form action="/api/auth/reset-password/${req.params.token}" method="POST">
            <div class="form-group">
              <label for="password">New Password</label>
              <input type="password" id="password" name="password" required>
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>
            <button type="submit" class="btn">Reset Password</button>
          </form>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Password Reset Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #e74c3c;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #e74c3c; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #c0392b;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✗</div>
          <h1>Password Reset Error</h1>
          <p>An unexpected error occurred while processing your password reset request. Please try again later.</p>
          <a href="/client/public/forgot-password.html" class="btn">Try Again</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Password reset submission route with HTML response
router.post('/reset-password/:token', async (req, res) => {
  const { password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Password Mismatch</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #e74c3c; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #c0392b;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">✗</div>
            <h1>Password Mismatch</h1>
            <p>The passwords you entered do not match. Please try again.</p>
            <a href="/reset-password/${req.params.token}" class="btn">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Reset Link</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: #f5f7fa;
              margin: 0;
            }
            .container { 
              max-width: 500px; 
              margin: 50px auto; 
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .status-icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin: 0 0 15px;
              font-size: 24px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
              margin: 0 0 30px;
            }
            .btn { 
              display: inline-block; 
              margin-top: 10px; 
              padding: 12px 30px; 
              background: #e74c3c; 
              color: white; 
              text-decoration: none; 
              border-radius: 30px;
              transition: all 0.3s ease;
              font-weight: 500;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #c0392b;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            @media (max-width: 600px) {
              .container {
                padding: 30px 20px;
                margin: 50px auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">✗</div>
            <h1>Invalid Reset Link</h1>
            <p>The password reset link is invalid or has expired. Please request a new password reset.</p>
            <a href="/client/public/forgot-password.html" class="btn">Request New Link</a>
          </div>
        </body>
        </html>
      `);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Password Reset Successful!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #2ecc71;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #2ecc71; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✓</div>
          <h1>Password Reset Successful!</h1>
          <p>Your password has been successfully updated. You can now log in with your new password.</p>
          <a href="/client/public/login.html" class="btn">Go to Login</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f7fa;
            margin: 0;
          }
          .container { 
            max-width: 500px; 
            margin: 50px auto; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            color: #e74c3c;
          }
          h1 {
            color: #2c3e50;
            margin: 0 0 15px;
            font-size: 24px;
          }
          p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0 0 30px;
          }
          .btn { 
            display: inline-block; 
            margin-top: 10px; 
            padding: 12px 30px; 
            background: #e74c3c; 
            color: white; 
            text-decoration: none; 
            border-radius: 30px;
            transition: all 0.3s ease;
            font-weight: 500;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .btn:hover {
            background: #c0392b;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          @media (max-width: 600px) {
            .container {
              padding: 30px 20px;
              margin: 50px auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-icon">✗</div>
          <h1>Reset Error</h1>
          <p>An error occurred while resetting your password. Please try again later.</p>
          <a href="/client/public/forgot-password.html" class="btn">Try Again</a>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;