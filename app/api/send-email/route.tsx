import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

type SendEmailPayload = {
  to: string
  companyId: string
  subject: string
  body: string
  attachment?: { name: string; content: string } | null
}

type ResendEmailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: string
  }>
}

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Missing RESEND_API_KEY environment variable' }, { status: 500 })
    }

    const resend = new Resend(resendApiKey)

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase environment variables are missing' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization') || ''
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
    }

    const { to, companyId, subject, body, attachment } = (await request.json()) as SendEmailPayload

    // 1. Send the email via Resend
    const emailPayload: ResendEmailPayload = {
      from: 'ColdBrew OJT <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">OJT Application</h2>
          <p>${body.replace(/\n/g, '<br/>')}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;"/>
          <p style="color: #6b7280; font-size: 12px;">Sent via ColdBrew ☕</p>
        </div>
      `,
    }

    if (attachment) {
      emailPayload.attachments = [{
        filename: attachment.name,
        content: attachment.content.split(',')[1] || attachment.content,
      }]
    }

    const { data, error } = await resend.emails.send(emailPayload)

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // 2. Log the email in Supabase
    await supabase.from('emails').insert({
      company_id: companyId,
      owner_id: user.id,
      subject: subject,
      body: body,
      resend_email_id: data?.id || null,
      has_attachment: !!attachment,
    })

    // 3. Update company status to 'sent'
    await supabase
      .from('companies')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .eq('owner_id', user.id)

    return NextResponse.json({ success: true, emailId: data?.id }, { status: 200 })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}