import { Webhook } from 'svix'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

type ResendWebhookEvent = {
  type: string
  id: string
  created_at: string
  data: {
    email_id?: string
    from?: string
    to?: string
    subject?: string
    message?: string
    [key: string]: unknown
  }
}

export async function POST(request: Request) {
  const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET

  if (!resendWebhookSecret) {
    console.error('Missing RESEND_WEBHOOK_SECRET environment variable')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const headers = {
      'webhook-id': request.headers.get('webhook-id') || '',
      'webhook-timestamp': request.headers.get('webhook-timestamp') || '',
      'webhook-signature': request.headers.get('webhook-signature') || '',
    }

    // Verify webhook signature
    const wh = new Webhook(resendWebhookSecret)
    const event = wh.verify(body, headers) as ResendWebhookEvent

    console.log('Webhook event received:', event.type)

    // Handle email_received event (incoming reply)
    if (event.type === 'email.received') {
      const { from, subject } = event.data

      if (!from) {
        return NextResponse.json({ success: true }, { status: 200 })
      }

      // Create Supabase client (unauthenticated for server-side operations)
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // 1. Find the company by email address
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, company_name, email, status')
        .eq('email', from.toLowerCase())
        .single()

      if (companyError || !companies) {
        console.log(`No company found for email: ${from}`)
        return NextResponse.json({ success: true }, { status: 200 })
      }

      // 2. Log the incoming email
      await supabase.from('emails').insert({
        company_id: companies.id,
        owner_id: null, // Incoming emails don't have an owner
        subject: subject || '(no subject)',
        body: event.data.message || '(no message)',
        resend_email_id: event.data.email_id || null,
        is_incoming: true,
        received_at: new Date().toISOString(),
      })

      // 3. Update company status to 'replied' (only if currently 'sent')
      if (companies.status === 'sent') {
        await supabase
          .from('companies')
          .update({ status: 'replied' })
          .eq('id', companies.id)

        console.log(
          `✅ Company ${companies.company_name} marked as replied (from: ${from})`
        )
      } else {
        console.log(
          `Company ${companies.company_name} already in status: ${companies.status}`
        )
      }

      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Log other events but don't process them
    console.log(`Event type ${event.type} received but not processed`)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 401 }
    )
  }
}
