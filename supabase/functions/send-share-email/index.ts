import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShareEmailRequest {
  recipientEmails: string[];
  documentTitle: string;
  senderName: string;
  senderEmail: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientEmails, documentTitle, senderName, senderEmail }: ShareEmailRequest = await req.json();

    if (!recipientEmails || recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: '수신자 이메일이 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documentTitle) {
      return new Response(
        JSON.stringify({ error: '문서 정보가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 앱의 공유받은 문서함으로 연결
    const documentUrl = 'https://traystorageconnect.com/team/shared';

    // Resend API를 사용하여 이메일 전송
    const emailPromises = recipientEmails.map(async (email) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TrayStorage <noreply@traystorageconnect.com>',
          reply_to: senderEmail,
          to: email,
          subject: `[TrayStorage] ${senderName}님이 문서를 공유했습니다`,
          html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f5f5f5;
        line-height: 1.6;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 24px;
        font-weight: 500;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 16px;
        color: #1f2937;
        margin-bottom: 20px;
      }
      .document-info {
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      .document-icon {
        display: inline-block;
        width: 48px;
        height: 48px;
        background-color: #dbeafe;
        border-radius: 8px;
        text-align: center;
        line-height: 48px;
        font-size: 24px;
        margin-bottom: 12px;
      }
      .document-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 8px 0;
      }
      .document-meta {
        font-size: 14px;
        color: #6b7280;
        margin: 4px 0;
      }
      .action-button {
        display: inline-block;
        margin: 30px 0;
        padding: 14px 32px;
        background-color: #2563eb;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 16px;
        transition: background-color 0.2s;
      }
      .action-button:hover {
        background-color: #1d4ed8;
      }
      .footer {
        padding: 20px 30px;
        background-color: #f9fafb;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
      .footer-text {
        font-size: 13px;
        color: #6b7280;
        margin: 0;
      }
      .divider {
        height: 1px;
        background-color: #e5e7eb;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <!-- Header -->
      <div class="header">
        <h1>📄 문서가 공유되었습니다</h1>
      </div>
      
      <!-- Content -->
      <div class="content">
        <p class="greeting">
          안녕하세요,
        </p>
        <p class="greeting">
          <strong>${senderName}</strong>님이 TrayStorage에서 문서를 공유했습니다.
        </p>
        
        <!-- Document Info Card -->
        <div class="document-info">
          <div class="document-icon">📄</div>
          <div class="document-title">${documentTitle}</div>
          <div class="document-meta">공유자: ${senderName}</div>
          <div class="document-meta">이메일: ${senderEmail}</div>
        </div>
        
        <!-- Call to Action Button -->
        <div style="text-align: center;">
          <a href="${documentUrl}" class="action-button">
            TrayStorage에서 열기
          </a>
        </div>
        
        <div class="divider"></div>
        
        <p style="font-size: 14px; color: #6b7280; margin: 10px 0;">
          이 문서는 TrayStorage의 "공유받은 문서함"에서도 확인할 수 있습니다.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">
          이 이메일은 TrayStorage 문서 관리 시스템에서 자동으로 발송되었습니다.
        </p>
        <p class="footer-text" style="margin-top: 8px;">
          © 2025 TrayStorage. All rights reserved.
        </p>
      </div>
    </div>
  </body>
  </html>
`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`이메일 전송 실패 (${email}):`, errorData);
        throw new Error(`이메일 전송 실패: ${email}`);
      }

      return response.json();
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ success: true, message: `${recipientEmails.length}명에게 이메일이 전송되었습니다.` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('이메일 전송 오류:', error);
    return new Response(
      JSON.stringify({ error: '이메일 전송 중 오류가 발생했습니다.', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
