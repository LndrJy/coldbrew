import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Server-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type SendEmailPayload = {
  to: string
  companyId: number
  companyName: string
  subject: string
  body: string
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase environment variables are missing' }, { status: 500 })
    }

    const { to, companyId, companyName, subject, body } = (await request.json()) as SendEmailPayload

    // 1. Send the email via Resend
    const { data, error } = await resend.emails.send({
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
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // 2. Log the email in Supabase
    await supabase.from('emails').insert({
      company_id: companyId,
      subject: subject,
      body: body,
      resend_email_id: data?.id || null,
    })

    // 3. Update company status to 'sent'
    await supabase
      .from('companies')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', companyId)

    return NextResponse.json({ success: true, emailId: data?.id }, { status: 200 })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}