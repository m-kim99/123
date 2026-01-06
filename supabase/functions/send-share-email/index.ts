import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShareEmailRequest {
  recipientEmails: string[];
  documentTitle: string;
  documentUrl: string;
  senderName: string;
  senderEmail: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientEmails, documentTitle, documentUrl, senderName, senderEmail }: ShareEmailRequest = await req.json();

    if (!recipientEmails || recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: '수신자 이메일이 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documentTitle || !documentUrl) {
      return new Response(
        JSON.stringify({ error: '문서 정보가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resend API를 사용하여 이메일 전송
    const emailPromises = recipientEmails.map(async (email) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Document Share <noreply@yourdomain.com>',
          to: email,
          subject: `[문서 공유] ${senderName}님이 문서를 공유했습니다`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
                .document-card { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 20px;">📄 문서가 공유되었습니다</h1>
                </div>
                <div class="content">
                  <p><strong>${senderName}</strong>님이 문서를 공유했습니다.</p>
                  
                  <div class="document-card">
                    <h3 style="margin: 0 0 8px 0; color: #1e293b;">${documentTitle}</h3>
                    <p style="margin: 0; font-size: 14px; color: #64748b;">공유자: ${senderName} (${senderEmail})</p>
                  </div>
                  
                  <p>아래 버튼을 클릭하여 문서를 확인하세요:</p>
                  
                  <a href="${documentUrl}" class="button" style="color: white;">문서 보기</a>
                  
                  <div class="footer">
                    <p>이 이메일은 문서 관리 시스템에서 자동으로 발송되었습니다.</p>
                  </div>
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
